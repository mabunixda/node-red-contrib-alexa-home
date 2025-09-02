/**
 * Multi-Device Registration Test
 * Verifies that all device types can register with controller and appear in API
 */

"use strict";

const helper = require("node-red-node-test-helper");
const controllerNode = require("../alexa/nodes/alexa-home-controller.js");
const alexaLightsNode = require("../alexa/nodes/alexa-lights.js");
const alexaBlindsNode = require("../alexa/nodes/alexa-blinds.js");
const alexaSwitchNode = require("../alexa/nodes/alexa-switch.js");
const alexaTemperatureSensorNode = require("../alexa/nodes/alexa-temperature-sensor.js");
const alexaHelper = require("../alexa/alexa-helper.js");
const { getRandomTestPort } = require("./test-utils");

describe("Multi-Device Registration", function () {
  beforeEach(function (done) {
    // Set a test port for alexa helper
    alexaHelper.hubPort = getRandomTestPort();
    helper.startServer(done);
  });

  afterEach(function (done) {
    // Clean up controller reference
    alexaHelper.controllerNode = undefined;
    helper.unload();
    helper.stopServer(done);
  });

  it("should register all device types with controller and expose via API", function (done) {
    const flow = [
      {
        id: "controller1",
        type: "alexa-home-controller",
        controllername: "Multi-Device Controller",
        useNode: true, // Use Node-RED server to avoid HTTP complications
      },
      {
        id: "light1",
        type: "alexa-home",
        devicename: "Test Light",
        devicetype: "Extended color light",
      },
      {
        id: "blinds1",
        type: "alexa-blinds",
        devicename: "Test Blinds",
      },
      {
        id: "switch1",
        type: "alexa-switch",
        devicename: "Test Switch",
      },
      {
        id: "temp1",
        type: "alexa-temperature-sensor",
        devicename: "Test Temperature Sensor",
      },
    ];

    const nodes = [
      controllerNode,
      alexaLightsNode,
      alexaBlindsNode,
      alexaSwitchNode,
      alexaTemperatureSensorNode,
    ];

    helper.load(nodes, flow, function () {
      const controller = helper.getNode("controller1");

      // Wait for all devices to register
      setTimeout(() => {
        try {
          // Verify all devices are registered with controller
          controller._commands.size.should.equal(4);

          // Test API device list contains all device types
          const deviceList = controller.generateAPIDeviceList("test-user");
          deviceList.should.be.an.Array();
          deviceList.length.should.equal(4);

          // Check that each device type is represented
          const deviceNames = deviceList.map(device => device.name);

          deviceNames.should.containEql("Test Light");
          deviceNames.should.containEql("Test Blinds");
          deviceNames.should.containEql("Test Switch");
          deviceNames.should.containEql("Test Temperature Sensor");

          // Verify device types are correctly set
          const lightDevice = deviceList.find(d => d.name === "Test Light");
          const blindsDevice = deviceList.find(d => d.name === "Test Blinds");
          const switchDevice = deviceList.find(d => d.name === "Test Switch");
          const tempDevice = deviceList.find(d => d.name === "Test Temperature Sensor");

          lightDevice.should.have.property("type", "Extended color light");
          blindsDevice.should.have.property("type", "Window covering");
          switchDevice.should.have.property("type", "On/Off plug-in unit");
          tempDevice.should.have.property("type", "CLIPTemperature");

          // Verify all devices have unique IDs and required properties
          deviceList.forEach(device => {
            device.should.have.property("name");
            device.should.have.property("type");
            device.should.have.property("uniqueid");
            device.should.have.property("on"); // State properties are at top level
            device.should.have.property("bri");
          });

          done();
        } catch (error) {
          done(error);
        }
      }, 1500); // Increased timeout even more to ensure registration completes
    });
  });
});
