/**
 * Test suite for alexa-switch node
 */

const helper = require("node-red-node-test-helper");
const alexaSwitchNode = require("../alexa/nodes/alexa-switch.js");

helper.init(require.resolve("node-red"));

describe("alexa-switch node", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("Switch Control", function () {
    it.skip("should handle boolean true payload", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", true);
          msg.payload.should.have.property("bri", 254);
          msg.payload.should.have.property("command", "switch");
          msg.device_type.should.equal("On/Off plug-in unit");
          done();
        });

        n1.receive({ payload: true, output: true });
      });
    });

    it.skip("should handle boolean false payload", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", false);
          msg.payload.should.have.property("bri", 0);
          msg.payload.should.have.property("command", "switch");
          done();
        });

        n1.receive({ payload: false, output: true });
      });
    });

    it.skip("should handle string 'on' payload", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", true);
          msg.payload.should.have.property("command", "switch");
          done();
        });

        n1.receive({ payload: "on", output: true });
      });
    });

    it.skip("should handle string 'off' payload", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", false);
          msg.payload.should.have.property("command", "switch");
          done();
        });

        n1.receive({ payload: "off", output: true });
      });
    });

    it.skip("should handle numeric 1 payload", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", true);
          msg.payload.should.have.property("command", "switch");
          done();
        });

        n1.receive({ payload: 1, output: true });
      });
    });

    it.skip("should handle numeric 0 payload", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", false);
          msg.payload.should.have.property("command", "switch");
          done();
        });

        n1.receive({ payload: 0, output: true });
      });
    });

    it.skip("should handle object payload with on property", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", true);
          msg.payload.should.have.property("command", "switch");
          done();
        });

        n1.receive({ payload: { on: true }, output: true });
      });
    });
  });

  describe("Node Configuration", function () {
    it.skip("should initialize with default values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
        },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n1 = helper.getNode("n1");
        n1.should.have.property("name", "Test Switch");
        n1.should.have.property("devicetype", "On/Off plug-in unit");
        n1.should.have.property("state", false);
        n1.should.have.property("bri", 254);
        done();
      });
    });

    it.skip("should handle input trigger setting", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
          inputtrigger: true,
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        let messageReceived = false;
        n2.on("input", function (msg) {
          messageReceived = true;
        });

        // Send message without output flag - should not send output
        n1.receive({ payload: true });

        setTimeout(() => {
          messageReceived.should.be.false();
          done();
        }, 50);
      });
    });
  });

  describe("Error Handling", function () {
    it.skip("should handle invalid input gracefully", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", false); // Default to false
          msg.payload.should.have.property("command", "switch");
          done();
        });

        n1.receive({ payload: "invalid", output: true });
      });
    });

    it.skip("should handle null payload gracefully", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-switch",
          devicename: "Test Switch",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaSwitchNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", false); // Default to false
          msg.payload.should.have.property("command", "switch");
          done();
        });

        n1.receive({ payload: null, output: true });
      });
    });
  });
});
