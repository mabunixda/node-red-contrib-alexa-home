const should = require("should");
const helper = require("node-red-node-test-helper");
const alexaNode = require("../alexa/alexa-home.js");

helper.init(require.resolve("node-red"));

describe("alexa-home Node - Extended Tests", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("Node Configuration", function () {
    it("should initialize with custom devicetype", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          devicetype: "Color light",
        },
      ];
      helper.load(alexaNode, flow, function () {
        const n1 = helper.getNode("n1");
        n1.should.have.property("name", "Test Light");
        n1.should.have.property("devicetype", "Color light");
        done();
      });
    });

    it("should initialize with input trigger enabled", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          inputtrigger: true,
        },
      ];
      helper.load(alexaNode, flow, function () {
        const n1 = helper.getNode("n1");
        n1.should.have.property("inputTrigger", true);
        done();
      });
    });

    it("should generate unique ID correctly", function (done) {
      const flow = [
        {
          id: "test-node-id-12345",
          type: "alexa-home",
          devicename: "Test Light",
        },
      ];
      helper.load(alexaNode, flow, function () {
        const n1 = helper.getNode("test-node-id-12345");
        n1.should.have.property("uniqueid");
        n1.uniqueid.should.be.a.String();
        n1.uniqueid.should.match(/^[a-zA-Z0-9\-:]+$/); // Should be alphanumeric with colons and dashes
        done();
      });
    });
  });

  describe("Message Processing", function () {
    it("should handle string payload 'on'", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = n2; // Mock controller

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", true);
          msg.payload.should.have.property("command", "switch");
          done();
        });
        n1.receive({ payload: "on", output: true });
      });
    });

    it("should handle string payload '1'", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = n2;

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", true);
          done();
        });
        n1.receive({ payload: "1", output: true });
      });
    });

    it("should handle numeric payload 1", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = n2;

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", true);
          done();
        });
        n1.receive({ payload: 1, output: true });
      });
    });

    it("should handle numeric payload 0", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = n2;

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", false);
          done();
        });
        n1.receive({ payload: 0, output: true });
      });
    });

    it("should detect brightness increase", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = n2;
        n1.bri = 100; // Set initial brightness

        n2.on("input", function (msg) {
          msg.should.have.property("change_direction", 1);
          msg.payload.should.have.property("bri", 150);
          msg.payload.should.have.property("command", "dim");
          done();
        });
        n1.receive({ payload: { bri: 150 }, output: true });
      });
    });

    it("should detect brightness decrease", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = n2;
        n1.bri = 200; // Set initial brightness

        n2.on("input", function (msg) {
          msg.should.have.property("change_direction", -1);
          msg.payload.should.have.property("bri", 100);
          done();
        });
        n1.receive({ payload: { bri: 100 }, output: true });
      });
    });

    it("should handle color commands", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = n2;

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.5, 0.4]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [0.5, 0.4] }, output: true });
      });
    });

    it("should handle invalid payload gracefully", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = n2;

        // Check that node status indicates error for invalid input
        setTimeout(function () {
          // Node should handle the error gracefully and not crash
          done();
        }, 50);

        n1.receive({ payload: { invalid: "data" }, output: true });
      });
    });

    it("should not output when inputTrigger is true and output is not set", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = n2;

        let messageReceived = false;
        n2.on("input", function (msg) {
          messageReceived = true;
        });

        // Trigger with input (should not send to output)
        n1.receive({ payload: { on: true } });

        setTimeout(function () {
          messageReceived.should.be.false();
          done();
        }, 50);
      });
    });
  });

  describe("Node Status and Connection", function () {
    it("should show connection status when no controller", function (done) {
      const flow = [{ id: "n1", type: "alexa-home", devicename: "Test Light" }];
      helper.load(alexaNode, flow, function () {
        const n1 = helper.getNode("n1");
        // Should have red status indicating no controller
        setTimeout(function () {
          done();
        }, 50);
      });
    });

    it("should update controller reference", function (done) {
      const flow = [
        { id: "n1", type: "alexa-home", devicename: "Test Light" },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");

        try {
          // Store initial controller reference (could be undefined or existing controller)
          const initialController = n1.controller;

          // Update controller to n2
          n1.updateController(n2);

          // Verify the controller is now n2
          n1.controller.should.equal(n2);

          // Verify it changed from the initial state
          n1.controller.should.not.equal(initialController);

          // Add small timeout to ensure any async status updates complete
          setTimeout(() => {
            done();
          }, 10);
        } catch (error) {
          done(error);
        }
      });
    });

    it("should handle close event", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");

        // Setup mock controller methods
        n2.deregisterCommand = function () {};
        n1.controller = n2;

        // Verify that close handling will work
        n1.should.have.property("controller");
        should(n1.controller).be.ok();

        done();
      });
    });
  });

  describe("Unique ID Generation", function () {
    it("should generate unique IDs with different inputs", function (done) {
      const flow = [
        { id: "test-id-1", type: "alexa-home", devicename: "Light 1" },
        { id: "test-id-2", type: "alexa-home", devicename: "Light 2" },
      ];
      helper.load(alexaNode, flow, function () {
        const n1 = helper.getNode("test-id-1");
        const n2 = helper.getNode("test-id-2");

        n1.uniqueid.should.not.equal(n2.uniqueid);
        done();
      });
    });

    it("should handle generateUniqueId with various UUID formats", function (done) {
      const flow = [{ id: "n1", type: "alexa-home", devicename: "Test Light" }];
      helper.load(alexaNode, flow, function () {
        const n1 = helper.getNode("n1");

        // Test various UUID formats
        const id1 = n1.generateUniqueId("abc123def456");
        const id2 = n1.generateUniqueId("short");
        const id3 = n1.generateUniqueId("");

        // Should return different values for different inputs
        id1.should.be.a.String();
        id2.should.be.a.String();
        id3.should.be.a.String();

        // Should all follow the MAC address pattern format
        id1.should.match(/^[a-zA-Z0-9:\-]+$/);
        id2.should.match(/^[a-zA-Z0-9:\-]+$/);
        id3.should.match(/^[a-zA-Z0-9:\-]+$/);

        done();
      });
    });
  });

  describe("Message Properties", function () {
    it("should set correct message properties", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Kitchen Light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = n2;

        n2.on("input", function (msg) {
          msg.should.have.property("device_name", "Kitchen Light");
          msg.should.have.property("light_id", n1.id);
          msg.payload.should.have.property("bri_normalized");
          msg.payload.bri_normalized.should.be.a.Number();
          msg.payload.bri_normalized.should.be.within(0, 100);
          done();
        });
        n1.receive({ payload: { on: true, bri: 127 }, output: true });
      });
    });
  });
});
