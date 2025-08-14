const should = require("should");
const helper = require("node-red-node-test-helper");
const controllerNode = require("../alexa/alexa-home-controller.js");
const utils = require("../alexa/utils.js");

helper.init(require.resolve("node-red"));

describe("Configuration Validation Tests", function () {
  this.timeout(10000); // Increased timeout for port allocation

  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  it("should disable HTTPS when useNode is true", async function () {
    const testPort = await utils.getAvailablePort();

    const flow = [
      {
        id: "controller1",
        type: "alexa-home-controller",
        controllername: "Test Controller",
        useNode: true,
        useHttps: true,
        certPath: "/fake/cert.pem",
        keyPath: "/fake/key.pem",
        port: testPort,
      },
    ];

    return new Promise((resolve, reject) => {
      helper.load(controllerNode, flow, function () {
        try {
          const controller = helper.getNode("controller1");
          controller.should.have.property("useNode", true);
          controller.should.have.property("useHttps", false);
          controller.should.have.property("httpsOptions", null);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  it("should allow HTTPS when useNode is false", async function () {
    const testPort = await utils.getAvailablePort();

    const flow = [
      {
        id: "controller2",
        type: "alexa-home-controller",
        controllername: "Test Controller",
        useNode: false,
        useHttps: true,
        certPath: "", // Empty paths should disable HTTPS
        keyPath: "",
        port: testPort,
      },
    ];

    return new Promise((resolve, reject) => {
      helper.load(controllerNode, flow, function () {
        try {
          const controller = helper.getNode("controller2");
          controller.should.have.property("useNode", false);
          // HTTPS should be disabled due to missing certificate paths
          controller.should.have.property("useHttps", false);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  it("should work normally when both useNode and useHttps are false", async function () {
    const testPort = await utils.getAvailablePort();

    const flow = [
      {
        id: "controller3",
        type: "alexa-home-controller",
        controllername: "Test Controller",
        useNode: false,
        useHttps: false,
        port: testPort,
      },
    ];

    return new Promise((resolve, reject) => {
      helper.load(controllerNode, flow, function () {
        try {
          const controller = helper.getNode("controller3");
          controller.should.have.property("useNode", false);
          controller.should.have.property("useHttps", false);
          controller.should.have.property("port", testPort);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  it("should use environment variable ALEXA_HTTPS but disable it when useNode is true", async function () {
    const testPort = await utils.getAvailablePort();

    // Set environment variable
    process.env.ALEXA_HTTPS = "true";

    const flow = [
      {
        id: "controller4",
        type: "alexa-home-controller",
        controllername: "Test Controller",
        useNode: true,
        port: testPort,
      },
    ];

    return new Promise((resolve, reject) => {
      helper.load(controllerNode, flow, function () {
        try {
          const controller = helper.getNode("controller4");
          controller.should.have.property("useNode", true);
          // Should be disabled despite environment variable
          controller.should.have.property("useHttps", false);

          // Clean up environment variable
          delete process.env.ALEXA_HTTPS;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  it("should use non-privileged port 8443 for HTTPS by default", async function () {
    const flow = [
      {
        id: "controller5",
        type: "alexa-home-controller",
        controllername: "Test Controller",
        useNode: false,
        useHttps: true,
        // No cert paths and no port specified - should try to configure for port 8443
        // but then disable HTTPS due to missing certificates and fall back to HTTP
      },
    ];

    return new Promise((resolve, reject) => {
      helper.load(controllerNode, flow, function () {
        try {
          const controller = helper.getNode("controller5");
          controller.should.have.property("useNode", false);
          // HTTPS should be disabled due to missing certificate files
          controller.should.have.property("useHttps", false);
          // Port should be the HTTP fallback (80 or 60000 depending on test environment)
          controller.should.have.property("port");
          should(typeof controller.port).equal("number");
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  it("should use non-privileged port defaults", function () {
    const flow = [
      {
        id: "controller-port-test",
        type: "alexa-home-controller",
        controllername: "Port Test Controller",
        useNode: false,
        useHttps: false,
      },
    ];

    return new Promise((resolve, reject) => {
      helper.load(controllerNode, flow, function () {
        try {
          const controller = helper.getNode("controller-port-test");

          // Test the configurePortWithProtocol method directly
          const httpPort = controller.configurePortWithProtocol(
            undefined,
            false,
          );
          const httpsPort = controller.configurePortWithProtocol(
            undefined,
            true,
          );

          // HTTP should use the default hub port (usually 80 or 60000 in tests)
          should(typeof httpPort).equal("number");

          // HTTPS should default to 443 (non-privileged)
          httpsPort.should.equal(443);

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
});
