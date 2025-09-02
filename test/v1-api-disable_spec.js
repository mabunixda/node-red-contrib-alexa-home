const helper = require("node-red-node-test-helper");
const controllerNode = require("../alexa/nodes/alexa-home-controller");
const lightsNode = require("../alexa/nodes/alexa-lights");
const request = require("supertest");
const { getRandomTestPort } = require("./test-utils");

helper.init(require.resolve("node-red"));

describe("v1 API Disable Feature", function () {
  let testPorts;

  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  before(async function () {
    testPorts = [getRandomTestPort(), getRandomTestPort(), getRandomTestPort()];
  });

  it("should disable v1 API when disableV1Api flag is set", function (done) {
    this.timeout(5000);

    const flow = [
      {
        id: "controller1",
        type: "alexa-home-controller",
        controllername: "Test Controller",
        port: testPorts[0],
        useNode: false, // Use standalone server for testing
        disableV1Api: true, // Disable v1 API
      },
    ];

    helper.load(controllerNode, flow, function () {
      const controller = helper.getNode("controller1");
      controller.should.have.property("disableV1Api", true);
      console.log(`Controller loaded with disableV1Api: ${controller.disableV1Api}`);
      done();
    });
  });

  it("should allow v1 API when disableV1Api flag is not set", function (done) {
    this.timeout(5000);

    const flow = [
      {
        id: "controller1",
        type: "alexa-home-controller",
        controllername: "Test Controller",
        port: testPorts[1],
        useNode: false, // Use standalone server for testing
        disableV1Api: false, // Keep v1 API enabled
      },
    ];

    helper.load(controllerNode, flow, function () {
      const controller = helper.getNode("controller1");
      controller.should.have.property("disableV1Api", false);
      console.log(`Controller loaded with disableV1Api: ${controller.disableV1Api}`);
      done();
    });
  });

  it("should default to v1 API enabled when flag is not specified", function (done) {
    const flow = [
      {
        id: "controller1",
        type: "alexa-home-controller",
        controllername: "Test Controller",
        port: testPorts[2],
        useNode: false, // Use standalone server for testing
        // disableV1Api not specified - should default to false
      },
    ];

    helper.load(controllerNode, flow, function () {
      const controller = helper.getNode("controller1");
      controller.should.have.property("disableV1Api", false);
      done();
    });
  });
});
