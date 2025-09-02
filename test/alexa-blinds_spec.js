const helper = require("node-red-node-test-helper");
const alexaBlindsNode = require("../alexa/nodes/alexa-blinds");

helper.init(require.resolve("node-red"));

describe("alexa-blinds node", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("Blinds Position Control", function () {
    it("should handle position commands via brightness", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-blinds",
          devicename: "Living Room Blinds",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaBlindsNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("position", 50);
          msg.payload.should.have.property("command", "position");
          msg.payload.should.have.property("bri", 127); // 50% of 254
          msg.device_type.should.equal("Window covering");
          done();
        });

        n1.receive({ payload: { bri: 127 }, output: true });
      });
    });

    it("should handle direct position commands", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-blinds",
          devicename: "Bedroom Blinds",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaBlindsNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("position", 75);
          msg.payload.should.have.property("command", "position");
          msg.payload.should.have.property("bri", 191); // 75% of 254
          done();
        });

        n1.receive({ payload: { position: 75 }, output: true });
      });
    });

    it("should handle open/close commands", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-blinds",
          devicename: "Kitchen Blinds",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaBlindsNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        let messageCount = 0;
        const expectedMessages = [
          { position: 100, command: "switch", bri: 254 }, // Open
          { position: 0, command: "switch", bri: 0 }, // Close
        ];

        n2.on("input", function (msg) {
          const expected = expectedMessages[messageCount];
          msg.payload.should.have.property("position", expected.position);
          msg.payload.should.have.property("command", expected.command);
          msg.payload.should.have.property("bri", expected.bri);

          messageCount++;
          if (messageCount === expectedMessages.length) {
            done();
          }
        });

        // Send open command
        n1.receive({ payload: { on: true }, output: true });

        // Send close command after a brief delay
        setTimeout(() => {
          n1.receive({ payload: { on: false }, output: true });
        }, 10);
      });
    });

    it("should validate position range (0-100)", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-blinds",
          devicename: "Test Blinds",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaBlindsNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        let messageCount = 0;
        const expectedPositions = [0, 100]; // Out of range values should be clamped

        n2.on("input", function (msg) {
          msg.payload.should.have.property("position", expectedPositions[messageCount]);
          messageCount++;
          if (messageCount === expectedPositions.length) {
            done();
          }
        });

        // Test position below range
        n1.receive({ payload: { position: -10 }, output: true });

        // Test position above range
        setTimeout(() => {
          n1.receive({ payload: { position: 150 }, output: true });
        }, 10);
      });
    });
  });

  describe("Node Configuration", function () {
    it("should initialize with default values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-blinds",
          devicename: "Default Blinds",
        },
      ];

      helper.load(alexaBlindsNode, flow, function () {
        const n1 = helper.getNode("n1");
        n1.should.have.property("name", "Default Blinds");
        n1.should.have.property("devicetype", "Window covering");
        n1.should.have.property("control", "blinds");
        n1.state.should.have.property("position", 100); // Default fully open
        done();
      });
    });

    it("should handle input trigger setting", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-blinds",
          devicename: "Triggered Blinds",
          inputtrigger: true,
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaBlindsNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        let messageReceived = false;

        n2.on("input", function (msg) {
          messageReceived = true;
        });

        // Send message without output flag - should not trigger output
        n1.receive({ payload: { position: 50 } });

        setTimeout(() => {
          messageReceived.should.be.false();
          done();
        }, 50);
      });
    });
  });

  describe("Error Handling", function () {
    it("should handle invalid input gracefully", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-blinds",
          devicename: "Error Test Blinds",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaBlindsNode, flow, function () {
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        // Test with invalid message - should not crash
        n1.receive(null);
        n1.receive(undefined);
        n1.receive({ payload: null });

        done();
      });
    });
  });
});
