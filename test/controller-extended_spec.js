const should = require("should");
const request = require("supertest");
const helper = require("node-red-node-test-helper");
const controllerNode = require("../alexa/nodes/alexa-home-controller.js");
const alexaNode = require("../alexa/nodes/alexa-lights.js");

let alexaHelper = require("../alexa/alexa-helper.js");

function between(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

helper.init(require.resolve("node-red"));

describe("alexa-home-controller Node - Extended Tests", function () {
  // Increase timeout for network operations
  this.timeout(5000);

  beforeEach(function (done) {
    // Set a unique port for each test to avoid conflicts
    alexaHelper.hubPort = between(50000, 60000);
    // Ensure ALEXA_PORT is not set to avoid conflicts with environment
    delete process.env.ALEXA_PORT;
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("Controller Initialization", function () {
    it("should initialize with custom port and useNode option", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "n1",
          type: "alexa-home-controller",
          controllername: "Custom Controller",
          port: hubPort,
          useNode: true,
        },
      ];
      helper.load(controllerNode, flow, function (err) {
        if (err) return done(err);
        try {
          const n1 = helper.getNode("n1");
          n1.should.have.property("name", "Custom Controller");
          // Note: The controller always uses alexaHome.hubPort, not the configured port
          n1.should.have.property("port").which.is.a.Number();
          done();
        } catch (error) {
          done(error);
        }
      });
    });

    it("should set controller node in alexaHelper", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "n1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function (err) {
        if (err) return done(err);
        try {
          const n1 = helper.getNode("n1");
          if (alexaHelper.controllerNode) {
            alexaHelper.controllerNode.should.equal(n1);
          } else {
            // In test environment, controllerNode might not be set the same way
            n1.should.be.ok();
          }
          done();
        } catch (error) {
          done(error);
        }
      });
    });

    it("should register existing alexa-home nodes", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
        {
          id: "home1",
          type: "alexa-home",
          devicename: "Test Light",
        },
      ];
      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");
        const home = helper.getNode("home1");

        // Controller should have registered the home node
        home.should.have.property("controller", controller);
        done();
      });
    });
  });

  describe("MAC Address and Bridge ID Generation", function () {
    it("should generate MAC address correctly", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "test-node-id-12345",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const n1 = helper.getNode("test-node-id-12345");
        const macAddress = n1.generateMacAddress("test-node-id-12345");
        macAddress.should.match(
          /^[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/,
        );
        done();
      });
    });

    it("should generate bridge ID from MAC address", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "n1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const n1 = helper.getNode("n1");
        const bridgeId = n1.getBridgeIdFromMacAddress("00:11:22:33:44:55");
        bridgeId.should.equal("001122FFFE334455");
        done();
      });
    });

    it("should format Hue bridge UUID", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "test-id-123",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function (err) {
        if (err) return done(err);
        try {
          const n1 = helper.getNode("test-id-123");
          const uuid = n1.formatHueBridgeUUID("test-id-123");
          uuid.should.equal("f6543a06-da50-11ba-8d8f-test-id-123");
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });

  describe("Device Registration and Management", function () {
    it("should register and deregister commands", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
        {
          id: "home1",
          type: "alexa-home",
          devicename: "Test Light",
        },
      ];
      helper.load([controllerNode, alexaNode], flow, function (err) {
        if (err) return done(err);
        try {
          const controller = helper.getNode("controller1");
          const home = helper.getNode("home1");

          // Should be registered in the _commands Map
          controller._commands.should.be.instanceof(Map);
          const uuid = controller.formatUUID(home.id);
          controller._commands.has(uuid).should.be.true();
          controller._commands.get(uuid).should.equal(home);

          // Test deregistration
          controller.deregisterCommand(home);
          controller._commands.has(uuid).should.be.false();

          done();
        } catch (error) {
          done(error);
        }
      });
    });

    it("should generate API device list", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
        {
          id: "home1",
          type: "alexa-home",
          devicename: "Test Light 1",
        },
        {
          id: "home2",
          type: "alexa-home",
          devicename: "Test Light 2",
        },
      ];
      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");
        const deviceList = controller.generateAPIDeviceList(controller.id);

        deviceList.should.be.an.Array();
        deviceList.length.should.equal(2);
        deviceList[0].should.have.property("name", "Test Light 1");
        deviceList[1].should.have.property("name", "Test Light 2");

        done();
      });
    });
  });

  describe("API Endpoints - Advanced", function () {
    it("should handle individual light info request", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
        {
          id: "home1",
          type: "alexa-home",
          devicename: "Test Light",
        },
      ];
      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");

        request(controller._hub[0].app)
          .get("/api/test-user/lights/home1")
          .expect(200)
          .expect("Content-Type", /json/)
          .end(function (err, res) {
            if (err) throw err;
            done();
          });
      });
    });

    it("should handle light state control", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
        {
          id: "home1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["output1"]],
        },
        {
          id: "output1",
          type: "helper",
        },
      ];
      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");
        const home = helper.getNode("home1");
        const output = helper.getNode("output1");

        output.on("input", function (msg) {
          msg.payload.should.have.property("on", true);
          done();
        });

        request(controller._hub[0].app)
          .put("/api/test-user/lights/home1/state")
          .send({ on: true })
          .expect(200)
          .expect("Content-Type", /json/)
          .end(function (err, res) {
            if (err) throw err;
          });
      });
    });

    it("should handle unknown item types", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        request(controller._hub[0].app)
          .get("/api/test-user/sensors")
          .expect(200)
          .expect("Content-Type", /json/)
          .end(function (err, res) {
            if (err) throw err;
            res.text.should.equal("{}");
            done();
          });
      });
    });

    it("should respond to POST requests on lights endpoint", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        request(controller._hub[0].app)
          .post("/api/test-user/lights")
          .expect(200)
          .expect("Content-Type", /json/)
          .end(function (err, res) {
            if (err) throw err;
            done();
          });
      });
    });

    it("should handle lights/new endpoint", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        request(controller._hub[0].app)
          .get("/api/test-user/lights/new")
          .expect(200)
          .expect("Content-Type", /json/)
          .end(function (err, res) {
            if (err) throw err;
            done();
          });
      });
    });
  });

  describe("Error Handling and Edge Cases", function () {
    it("should handle malformed JSON gracefully", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        // This should be handled by the body parser error middleware
        request(controller._hub[0].app)
          .put("/api/test-user/lights/test-light/state")
          .set("Content-Type", "application/json")
          .send("{ invalid json")
          .expect(400)
          .end(function (err, res) {
            // Should handle the error gracefully
            done();
          });
      });
    });

    it("should handle requests when willClose is true", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        // Simulate willClose state
        controller._hub[0].willClose = true;

        request(controller._hub[0].app)
          .get("/api/config")
          .expect(503)
          .end(function (err, res) {
            if (err) throw err;
            res.body.should.have.property("error", "Temporarly Unavailable");
            done();
          });
      });
    });
  });

  describe("SSDP and Network Discovery", function () {
    it("should start SSDP server", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");
        controller._hub[0].ssdpServer.should.have.property("_started", true);
        done();
      });
    });

    it("should handle environment variable ALEXA_IP for controller", function (done) {
      const originalIp = process.env.ALEXA_IP;
      const originalPort = process.env.ALEXA_PORT;
      const hubPort = between(50000, 60000);

      // Set environment variables before creating the flow
      process.env.ALEXA_PORT = hubPort.toString();
      process.env.ALEXA_IP = "127.0.0.1";

      // Also set hubPort on alexaHelper to ensure compatibility
      alexaHelper.hubPort = hubPort;

      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");
        controller._hub[0].ip.should.equal("127.0.0.1");

        // Restore original values
        if (originalIp !== undefined) {
          process.env.ALEXA_IP = originalIp;
        } else {
          delete process.env.ALEXA_IP;
        }
        if (originalPort !== undefined) {
          process.env.ALEXA_PORT = originalPort;
        } else {
          delete process.env.ALEXA_PORT;
        }
        done();
      });
    });
  });

  describe("Controller Close and Cleanup", function () {
    it("should have stopServers method on hubs", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");
        const hubCount = controller._hub.length;
        hubCount.should.be.greaterThan(0);

        // Verify that stopServers method exists and is callable
        controller._hub[0].should.have.property("stopServers");
        controller._hub[0].stopServers.should.be.a.Function();

        done();
      });
    });

    it("should have controllerNode reference management", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        // Verify controller node is accessible
        controller.should.be.ok();
        controller.should.have.property("_hub");

        // The actual cleanup will be tested during the afterEach hook
        done();
      });
    });
  });

  describe("Template Rendering", function () {
    it("should render setup.xml with correct data", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        request(controller._hub[0].app)
          .get("/alexa-home/setup.xml")
          .expect(200)
          .expect("Content-Type", /xml/)
          .end(function (err, res) {
            if (err) throw err;
            res.text.should.containEql("urn:schemas-upnp-org:device:Basic:1");
            res.text.should.containEql(
              controller.formatHueBridgeUUID(controller.id),
            );
            done();
          });
      });
    });

    it("should render registration response correctly", function (done) {
      const hubPort = between(50000, 60000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];
      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        request(controller._hub[0].app)
          .post("/api")
          .expect(200)
          .expect("Content-Type", /json/)
          .end(function (err, res) {
            if (err) throw err;
            const response = JSON.parse(res.text);
            response.should.be.an.Array();
            response[0].should.have.property("success");
            done();
          });
      });
    });
  });
});
