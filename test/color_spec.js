const helper = require("node-red-node-test-helper");
const alexaNode = require("../alexa/nodes/alexa-lights.js");

helper.init(require.resolve("node-red"));

describe("alexa-home Node - Color Tests", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("Basic Color Functionality", function () {
    it("should handle valid XY color coordinates", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        // Mock controller to allow message flow
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.6, 0.3]);
          msg.payload.should.have.property("command", "color");
          msg.payload.should.have.property("on", true);
          done();
        });
        n1.receive({ payload: { xy: [0.6, 0.3] }, output: true });
      });
    });

    it("should handle red color coordinates", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.675, 0.322]);
          msg.payload.should.have.property("command", "color");
          msg.payload.should.have.property("on", true);
          done();
        });
        n1.receive({ payload: { xy: [0.675, 0.322] }, output: true });
      });
    });

    it("should handle green color coordinates", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.409, 0.518]);
          msg.payload.should.have.property("command", "color");
          msg.payload.should.have.property("on", true);
          done();
        });
        n1.receive({ payload: { xy: [0.409, 0.518] }, output: true });
      });
    });

    it("should handle blue color coordinates", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.167, 0.04]);
          msg.payload.should.have.property("command", "color");
          msg.payload.should.have.property("on", true);
          done();
        });
        n1.receive({ payload: { xy: [0.167, 0.04] }, output: true });
      });
    });
  });

  describe("Color Edge Cases and Validation", function () {
    it("should clamp coordinates that exceed maximum values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          // Values should be clamped to 1.0 maximum
          msg.payload.should.have.property("xy", [1.0, 1.0]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [1.5, 2.0] }, output: true });
      });
    });

    it("should clamp coordinates that are below minimum values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          // Values should be clamped to 0.0 minimum
          msg.payload.should.have.property("xy", [0.0, 0.0]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [-0.5, -1.0] }, output: true });
      });
    });

    it("should use default coordinates for invalid array", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          // Should use default warm white coordinates
          msg.payload.should.have.property("xy", [0.3127, 0.329]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [0.5] }, output: true }); // Invalid array length
      });
    });

    it("should use default coordinates for non-array input", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          // Should use default warm white coordinates
          msg.payload.should.have.property("xy", [0.3127, 0.329]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: "invalid" }, output: true });
      });
    });

    it("should handle string numeric values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.7, 0.2]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: ["0.7", "0.2"] }, output: true });
      });
    });
  });

  describe("Color with Brightness and State", function () {
    it("should preserve existing brightness when setting color", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };
        n1.bri = 180; // Set existing brightness

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.4, 0.5]);
          msg.payload.should.have.property("command", "color");
          msg.payload.should.have.property("bri", 180);
          msg.payload.should.have.property("on", true);
          done();
        });
        n1.receive({ payload: { xy: [0.4, 0.5] }, output: true });
      });
    });

    it("should use specified brightness when setting color", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.4, 0.5]);
          msg.payload.should.have.property("command", "color");
          msg.payload.should.have.property("bri", 100);
          msg.payload.should.have.property("on", true);
          done();
        });
        n1.receive({ payload: { xy: [0.4, 0.5], bri: 100 }, output: true });
      });
    });

    it("should respect explicit on/off state when setting color", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.4, 0.5]);
          msg.payload.should.have.property("command", "color");
          msg.payload.should.have.property("on", false);
          done();
        });
        n1.receive({ payload: { xy: [0.4, 0.5], on: false }, output: true });
      });
    });
  });

  describe("Popular Color Presets", function () {
    it("should handle warm white color", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.4578, 0.4101]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [0.4578, 0.4101] }, output: true }); // Warm white
      });
    });

    it("should handle cool white color", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.3127, 0.329]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [0.3127, 0.329] }, output: true }); // Cool white
      });
    });

    it("should handle purple color", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.3363, 0.1411]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [0.3363, 0.1411] }, output: true }); // Purple
      });
    });

    it("should handle yellow color", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.4317, 0.4996]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [0.4317, 0.4996] }, output: true }); // Yellow
      });
    });

    it("should handle cyan color", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "RGB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.1559, 0.2832]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [0.1559, 0.2832] }, output: true }); // Cyan
      });
    });
  });

  describe("Color Device Type Compatibility", function () {
    it("should work with Color light device type", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Color Light",
          devicetype: "Color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.5, 0.4]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [0.5, 0.4] }, output: true });
      });
    });

    it("should work with Extended color light device type", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Extended Color Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("xy", [0.3, 0.6]);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { xy: [0.3, 0.6] }, output: true });
      });
    });
  });

  describe("Hue/Saturation Color Support", function () {
    it("should handle red color using hue/sat values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "HSB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("hue", 0);
          msg.payload.should.have.property("sat", 254);
          msg.payload.should.have.property("command", "color");
          msg.payload.should.have.property("on", true);
          done();
        });
        n1.receive({ payload: { hue: 0, sat: 254, bri: 254 }, output: true });
      });
    });

    it("should handle blue color using hue/sat values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "HSB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("hue", 43690);
          msg.payload.should.have.property("sat", 254);
          msg.payload.should.have.property("command", "color");
          msg.payload.should.have.property("on", true);
          done();
        });
        n1.receive({
          payload: { hue: 43690, sat: 254, bri: 254 },
          output: true,
        });
      });
    });

    it("should validate and clamp hue values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "HSB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("hue", 65535); // Should be clamped to max
          msg.payload.should.have.property("sat", 254);
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { hue: 70000, sat: 254 }, output: true }); // Over max
      });
    });

    it("should validate and clamp saturation values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "HSB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("hue", 10000);
          msg.payload.should.have.property("sat", 254); // Should be clamped to max
          msg.payload.should.have.property("command", "color");
          done();
        });
        n1.receive({ payload: { hue: 10000, sat: 300 }, output: true }); // Over max
      });
    });

    it("should handle partial hue/sat values gracefully", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "HSB Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          // Should NOT be processed as color command since sat is missing
          msg.payload.should.have.property("bri", 200);
          msg.payload.should.have.property("command", "dim");
          done();
        });
        n1.receive({ payload: { hue: 10000, bri: 200 }, output: true }); // Missing sat
      });
    });

    it("should handle GitHub issue #143 - blue color with hue 43690", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Simulateur",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];
      helper.load(alexaNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          // Should be processed as color command and not fail
          msg.payload.should.have.property("hue", 43690);
          msg.payload.should.have.property("sat", 254);
          msg.payload.should.have.property("bri", 254);
          msg.payload.should.have.property("command", "color");
          msg.payload.should.have.property("on", true);
          done();
        });
        // Exact payload from GitHub issue #143 that was failing
        n1.receive({
          payload: { on: true, hue: 43690, sat: 254, bri: 254 },
          output: true,
        });
      });
    });
  });
});
