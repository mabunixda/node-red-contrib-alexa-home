const helper = require("node-red-node-test-helper");
const alexaTemperatureSensorNode = require("../alexa/nodes/alexa-temperature-sensor");

helper.init(require.resolve("node-red"));

describe("alexa-temperature-sensor node", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("Temperature Reading", function () {
    it("should handle temperature updates", function (done) {
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
          msg.payload.should.have.property("scale", "CELSIUS");
          msg.payload.should.have.property("on", true);
          msg.device_type.should.equal("Temperature sensor");
          done();
        });

        n1.receive({ payload: { temperature: 22.5 }, output: true });
      });
    });

    it("should handle temperature scale changes", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-temperature-sensor",
          devicename: "Outdoor Temperature",
          scale: "FAHRENHEIT",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaTemperatureSensorNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("temperature", 68);
          msg.payload.should.have.property("scale", "FAHRENHEIT");
          msg.payload.should.have.property("command", "temperature");
          msg.payload.should.have.property("on", true);
          msg.device_type.should.equal("Temperature sensor");
          done();
        });

        // Set temperature in Celsius - should be converted to Fahrenheit (20°C = 68°F)
        n1.receive({ payload: { temperature: 20, scale: "CELSIUS" }, output: true });
      });
    });

    it("should convert between Celsius and Fahrenheit", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-temperature-sensor",
          devicename: "Test Temperature",
          temperature: "20.0",
          scale: "CELSIUS",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaTemperatureSensorNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          // 20°C should convert to 68°F
          msg.payload.should.have.property("temperature", 68);
          msg.payload.should.have.property("scale", "FAHRENHEIT");
          done();
        });

        // Change scale from Celsius to Fahrenheit
        n1.receive({ payload: { scale: "FAHRENHEIT" }, output: true });
      });
    });

    it("should always report sensor as 'on'", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-temperature-sensor",
          devicename: "Always On Sensor",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaTemperatureSensorNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          msg.payload.should.have.property("on", true);
          msg.payload.should.have.property("command", "temperature");
          done();
        });

        n1.receive({ payload: { temperature: 15.0 }, output: true });
      });
    });
  });

  describe("Node Configuration", function () {
    it("should initialize with default values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-temperature-sensor",
          devicename: "Default Sensor",
        },
      ];

      helper.load(alexaTemperatureSensorNode, flow, function () {
        const n1 = helper.getNode("n1");
        n1.should.have.property("name", "Default Sensor");
        n1.should.have.property("devicetype", "Temperature sensor");
        n1.should.have.property("control", "temperature");
        n1.should.have.property("scale", "CELSIUS");
        n1.state.should.have.property("temperature", 20.0);
        n1.state.should.have.property("on", true);
        done();
      });
    });

    it("should handle custom initial temperature", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-temperature-sensor",
          devicename: "Custom Sensor",
          temperature: "25.5",
          scale: "FAHRENHEIT",
        },
      ];

      helper.load(alexaTemperatureSensorNode, flow, function () {
        const n1 = helper.getNode("n1");
        n1.state.should.have.property("temperature", 25.5);
        n1.should.have.property("scale", "FAHRENHEIT");
        done();
      });
    });

    it("should handle input trigger setting", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-temperature-sensor",
          devicename: "Triggered Sensor",
          inputtrigger: true,
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaTemperatureSensorNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        let messageReceived = false;

        n2.on("input", function (msg) {
          messageReceived = true;
        });

        // Send message without output flag - should not trigger output
        n1.receive({ payload: { temperature: 25.0 } });

        setTimeout(() => {
          messageReceived.should.be.false();
          done();
        }, 50);
      });
    });
  });

  describe("Data Validation", function () {
    it("should handle invalid temperature values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-temperature-sensor",
          devicename: "Validation Test Sensor",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaTemperatureSensorNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          // Invalid temperature should be converted to 0
          msg.payload.should.have.property("temperature", 0);
          done();
        });

        n1.receive({ payload: { temperature: "invalid" }, output: true });
      });
    });

    it("should handle invalid scale values", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-temperature-sensor",
          devicename: "Scale Test Sensor",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaTemperatureSensorNode, flow, function () {
        const n2 = helper.getNode("n2");
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        n2.on("input", function (msg) {
          // Invalid scale should default to CELSIUS
          msg.payload.should.have.property("scale", "CELSIUS");
          done();
        });

        n1.receive({ payload: { scale: "INVALID_SCALE" }, output: true });
      });
    });
  });

  describe("Error Handling", function () {
    it("should handle invalid input gracefully", function (done) {
      const flow = [
        {
          id: "n1",
          type: "alexa-temperature-sensor",
          devicename: "Error Test Sensor",
          wires: [["n2"]],
        },
        { id: "n2", type: "helper" },
      ];

      helper.load(alexaTemperatureSensorNode, flow, function () {
        const n1 = helper.getNode("n1");
        n1.controller = { deregisterCommand: function () {} };

        // Test with invalid messages - should not crash
        n1.receive(null);
        n1.receive(undefined);
        n1.receive({ payload: null });

        done();
      });
    });
  });
});
