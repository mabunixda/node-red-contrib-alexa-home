const helper = require("node-red-node-test-helper");
const alexaLightsNode = require("../alexa/nodes/alexa-lights");
const alexaBlindsNode = require("../alexa/nodes/alexa-blinds");
const alexaTemperatureSensorNode = require("../alexa/nodes/alexa-temperature-sensor");
const alexaSwitchNode = require("../alexa/nodes/alexa-switch");

helper.init(require.resolve("node-red"));

describe("Node Refactoring - Device Type Separation", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("Backward Compatibility - alexa-home node (now lights only)", function () {
    it("should only support lighting device types", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Test Light",
          devicetype: "Extended color light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaLightsNode, flow, function () {
        const n1 = helper.getNode("n1");
        n1.should.have.property("devicetype", "Extended color light");
        n1.should.have.property("control", "lights");
        done();
      });
    });

    it("should handle lighting commands correctly", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-home",
          devicename: "Living Room Light",
          devicetype: "Dimmable light",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaLightsNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("bri", 127);
          msg.payload.should.have.property("on", true);
          done();
        });

        n1.receive({ payload: { bri: 127, on: true }, output: true });
      });
    });
  });

  describe("alexa-blinds", function () {
    it("should handle blinds-specific functionality", function (done) {
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
          msg.payload.should.have.property("position", 75);
          msg.payload.should.have.property("command", "position");
          msg.device_type.should.equal("Window covering");
          done();
        });

        n1.receive({ payload: { position: 75 }, output: true });
      });
    });
  });

  describe("alexa-temperature-sensor", function () {
    it("should handle temperature sensor functionality", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-temperature-sensor",
          devicename: "Living Room Temperature",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaTemperatureSensorNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("temperature", 22.5);
          msg.payload.should.have.property("command", "temperature");
          msg.device_type.should.equal("Temperature sensor");
          done();
        });

        n1.receive({ payload: { temperature: 22.5 }, output: true });
      });
    });
  });

  describe("alexa-switch", function () {
    it.skip("should handle switch-specific functionality", function (done) {
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
          msg.should.have.property("device_type", "On/Off plug-in unit");
          msg.payload.should.have.property("command", "switch");
          msg.payload.should.have.property("on", true);
          msg.payload.should.have.property("bri", 254);
          done();
        });

        n1.receive({ payload: true, output: true });
      });
    });
  });

  describe("Integration Testing - All Node Types", function () {
    it.skip("should handle multiple device types in same flow", function (done) {
      const flow = [
        {
          id: "light1",
          type: "alexa-home",
          devicename: "Test Light",
          devicetype: "Color light",
          wires: [["output"]],
        },
        {
          id: "blinds1",
          type: "alexa-blinds",
          devicename: "Test Blinds",
          wires: [["output"]],
        },
        {
          id: "temp1",
          type: "alexa-temperature-sensor",
          devicename: "Test Temperature",
          wires: [["output"]],
        },
        {
          id: "switch1",
          type: "alexa-switch",
          devicename: "Test Switch",
          wires: [["output"]],
        },
        { id: "output", type: "helper" },
      ];

      const nodes = [
        alexaLightsNode,
        alexaBlindsNode,
        alexaTemperatureSensorNode,
        alexaSwitchNode,
      ];

      helper.load(nodes, flow, function () {
        const output = helper.getNode("output");
        const light = helper.getNode("light1");
        const blinds = helper.getNode("blinds1");
        const temp = helper.getNode("temp1");
        const switchNode = helper.getNode("switch1");

        // Mock controllers
        light.controller = { deregisterCommand: function () {} };
        blinds.controller = { deregisterCommand: function () {} };
        temp.controller = { deregisterCommand: function () {} };
        switchNode.controller = { deregisterCommand: function () {} };

        let messageCount = 0;
        const expectedMessages = 4;

        output.on("input", function (msg) {
          messageCount++;

          // Verify each device type produces the correct output
          if (msg.device_name === "Test Light") {
            msg.payload.should.have.property("xy");
          } else if (msg.device_name === "Test Blinds") {
            msg.payload.should.have.property("position");
          } else if (msg.device_name === "Test Temperature") {
            msg.payload.should.have.property("temperature");
          } else if (msg.device_name === "Test Switch") {
            msg.payload.should.have.property("command", "switch");
          }

          if (messageCount === expectedMessages) {
            done();
          }
        });

        // Trigger all devices
        light.receive({ payload: { xy: [0.3, 0.3], bri: 200 }, output: true });
        blinds.receive({ payload: { position: 80 }, output: true });
        temp.receive({ payload: { temperature: 23.5 }, output: true });
        switchNode.receive({ payload: true, output: true });
      });
    });
  });
});
