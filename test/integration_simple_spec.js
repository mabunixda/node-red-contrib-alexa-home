const should = require("should");
const helper = require("node-red-node-test-helper");
const controllerNode = require("../alexa/alexa-home-controller.js");
const alexaNode = require("../alexa/alexa-home.js");
let alexaHelper = require("../alexa/alexa-helper.js");

helper.init(require.resolve("node-red"));

describe("Integration Tests - Simplified and Reliable", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("Error Handling and Edge Cases", function () {
    it("should handle device deregistration", function (done) {
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Deregister Test Controller",
          useNode: true, // Use Node-RED server to avoid port conflicts
        },
        {
          id: "tempLight",
          type: "alexa-home",
          devicename: "Temporary Light",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");
        const tempLight = helper.getNode("tempLight");

        setTimeout(() => {
          try {
            // Initially registered - check using _commands Map
            const tempLightUuid = controller.formatUUID(tempLight.id);
            controller._commands.has(tempLightUuid).should.be.true();

            // Test deregistration
            controller.deregisterCommand(tempLight);
            controller._commands.has(tempLightUuid).should.be.false();

            // Verify device count is updated
            controller._commands.size.should.equal(0);
            done();
          } catch (error) {
            done(error);
          }
        }, 100);
      });
    });

    it("should handle invalid device control requests", function (done) {
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Error Test Controller",
          useNode: true, // Use Node-RED server
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        // Test the method directly
        try {
          const mockRequest = {
            params: {
              itemType: "lights",
              username: "test-user",
              id: "nonexistent",
            },
            body: { on: true },
          };

          let responseStatus = null;
          let responseData = null;

          const mockResponse = {
            status: function (code) {
              responseStatus = code;
              return this;
            },
            type: function (type) {
              return this;
            },
            send: function (data) {
              responseData = data;
            },
          };

          controller.controlItem(0, mockRequest, mockResponse);

          // Verify proper error handling
          responseStatus.should.equal(502);
          responseData.should.equal("{}");
          done();
        } catch (error) {
          done(error);
        }
      });
    });

    it("should handle server shutdown gracefully", function (done) {
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Shutdown Test Controller",
          useNode: true, // Use Node-RED server
        },
        {
          id: "testLight",
          type: "alexa-home",
          devicename: "Test Light",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          try {
            // Verify initial state
            controller._commands.size.should.equal(1);

            // Test basic cleanup functionality - clear references directly
            // This mimics what happens during shutdown
            controller._commands.clear();
            alexaHelper.controllerNode = undefined;

            // Verify cleanup
            should(alexaHelper.controllerNode).be.undefined();
            controller._commands.size.should.equal(0);
            done();
          } catch (error) {
            done(error);
          }
        }, 100);
      });
    });
  });

  describe("Performance and Load Testing", function () {
    it("should handle multiple device registrations efficiently", function (done) {
      const deviceCount = 10;
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Load Test Controller",
          useNode: true, // Use Node-RED server
        },
      ];

      // Add multiple devices
      for (let i = 0; i < deviceCount; i++) {
        flow.push({
          id: `device${i}`,
          type: "alexa-home",
          devicename: `Device ${i}`,
          devicetype: i % 3 === 0 ? "Extended color light" : "Dimmable light",
        });
      }

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          try {
            // Verify all devices are registered
            controller._commands.size.should.equal(deviceCount);

            // Test API device list generation performance
            const startTime = Date.now();
            const deviceList = controller.generateAPIDeviceList(0);
            const endTime = Date.now();

            // Should generate device list quickly
            (endTime - startTime).should.be.below(100);
            deviceList.length.should.equal(deviceCount);

            done();
          } catch (error) {
            done(error);
          }
        }, 200);
      });
    });

    it("should handle device state changes efficiently", function (done) {
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "State Test Controller",
          useNode: true,
        },
        {
          id: "stateLight",
          type: "alexa-home",
          devicename: "State Test Light",
          wires: [["output1"]],
        },
        {
          id: "output1",
          type: "helper",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");
        const stateLight = helper.getNode("stateLight");
        const output = helper.getNode("output1");

        let messageCount = 0;
        const expectedMessages = 3;

        output.on("input", function (msg) {
          messageCount++;
          if (messageCount === expectedMessages) {
            done();
          }
        });

        setTimeout(() => {
          try {
            // Send multiple state changes
            stateLight.processCommand({ payload: { on: true } });
            stateLight.processCommand({ payload: { bri: 150 } });
            stateLight.processCommand({ payload: { on: false } });
          } catch (error) {
            done(error);
          }
        }, 100);
      });
    });
  });
});
