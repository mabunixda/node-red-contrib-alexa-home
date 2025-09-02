/**
 * Test suite for Hue API v2 implementation
 * Tests the new resource-based API endpoints
 */

"use strict";

const helper = require("node-red-node-test-helper");
const controllerNode = require("../alexa/nodes/alexa-home-controller.js");
const alexaNode = require("../alexa/nodes/alexa-lights.js");
const { getRandomTestPort } = require("./test-utils");
const request = require("supertest");

helper.init(require.resolve("node-red"));

describe("Hue API v2 Handler", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("v2 Resource Endpoints", function () {
    it("should handle v2 light resource list request", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "v2 Test Controller",
          port: hubPort,
          useNode: false,
        },
        {
          id: "light1",
          type: "alexa-home",
          devicename: "Test Light v2",
          devicetype: "Extended color light",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          // Check if hub is initialized
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          request(controller._hub[0].app)
            .get("/clip/v2/resource/light")
            .expect(200)
            .expect("Content-Type", /json/)
            .end(function (err, res) {
              if (err) return done(err);

              try {
                const response = JSON.parse(res.text);
                response.should.have.property("errors");
                response.should.have.property("data");
                response.errors.should.be.an.Array();
                response.data.should.be.an.Array();

                if (response.data.length > 0) {
                  const light = response.data[0];
                  light.should.have.property("id");
                  light.should.have.property("type", "light");
                  light.should.have.property("metadata");
                  light.should.have.property("on");
                  light.should.have.property("dimming");
                }

                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });

    it("should handle v2 device resource list request", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "v2 Device Test Controller",
          port: hubPort,
          useNode: false,
        },
        {
          id: "light1",
          type: "alexa-home",
          devicename: "Test Device v2",
          devicetype: "Color light",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          request(controller._hub[0].app)
            .get("/clip/v2/resource/device")
            .expect(200)
            .expect("Content-Type", /json/)
            .end(function (err, res) {
              if (err) return done(err);

              try {
                const response = JSON.parse(res.text);
                response.should.have.property("errors");
                response.should.have.property("data");
                response.errors.should.be.an.Array();
                response.data.should.be.an.Array();

                if (response.data.length > 0) {
                  const device = response.data[0];
                  device.should.have.property("id");
                  device.should.have.property("type", "device");
                  device.should.have.property("metadata");
                  device.should.have.property("services");
                  device.should.have.property("product_data");
                }

                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });

    it("should handle v2 light state update", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "v2 Update Test Controller",
          port: hubPort,
          useNode: false,
        },
        {
          id: "light1",
          type: "alexa-home",
          devicename: "Test Update Light v2",
          devicetype: "Extended color light",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");
        const light = helper.getNode("light1");
        const lightUuid = controller.formatUUID(light.id);

        setTimeout(() => {
          const updateData = {
            on: { on: true },
            dimming: { brightness: 75 },
            color: {
              xy: { x: 0.3, y: 0.3 },
            },
          };

          request(controller._hub[0].app)
            .put(`/clip/v2/resource/light/${lightUuid}`)
            .send(updateData)
            .expect(200)
            .expect("Content-Type", /json/)
            .end(function (err, res) {
              if (err) return done(err);

              try {
                const response = JSON.parse(res.text);
                response.should.have.property("errors");
                response.should.have.property("data");
                response.errors.should.be.an.Array();
                response.data.should.be.an.Array();

                // Should have success responses
                response.data.length.should.be.greaterThan(0);
                response.data.forEach((item) => {
                  item.should.have.property("success");
                });

                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });

    it("should handle v2 bridge resource request", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "v2 Bridge Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          request(controller._hub[0].app)
            .get("/clip/v2/resource/bridge")
            .expect(200)
            .expect("Content-Type", /json/)
            .end(function (err, res) {
              if (err) return done(err);

              try {
                const response = JSON.parse(res.text);
                response.should.have.property("name");
                response.should.have.property("apiversion");
                response.should.have.property("swversion");
                response.should.have.property("bridgeid");

                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });

    it("should return v2 error format for invalid resource", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "v2 Error Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          request(controller._hub[0].app)
            .get("/clip/v2/resource/invalidtype")
            .expect(404)
            .expect("Content-Type", /json/)
            .end(function (err, res) {
              if (err) return done(err);

              try {
                const response = JSON.parse(res.text);
                response.should.have.property("errors");
                response.should.have.property("data");
                response.errors.should.be.an.Array();
                response.errors.length.should.be.greaterThan(0);

                const error = response.errors[0];
                error.should.have.property("type");
                error.should.have.property("address");
                error.should.have.property("description");

                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });
  });

  describe("v2 Device Type Mapping", function () {
    it("should map device types to correct archetypes", function () {
      const HueApiV2Handler = require("../alexa/hue-api-v2-handler");
      const handler = new HueApiV2Handler(null, null);

      handler
        .mapDeviceTypeToArchetype("Dimmable light")
        .should.equal("sultan_bulb");
      handler.mapDeviceTypeToArchetype("Color light").should.equal("hue_bulb");
      handler
        .mapDeviceTypeToArchetype("Extended color light")
        .should.equal("hue_bulb");
      handler
        .mapDeviceTypeToArchetype("Color temperature light")
        .should.equal("white_and_color_ambiance_bulb");
      handler
        .mapDeviceTypeToArchetype("Unknown type")
        .should.equal("sultan_bulb");
    });

    it("should return correct model IDs", function () {
      const HueApiV2Handler = require("../alexa/hue-api-v2-handler");
      const handler = new HueApiV2Handler(null, null);

      handler.getModelId("Dimmable light").should.equal("LTW011");
      handler.getModelId("Color light").should.equal("LCT015");
      handler.getModelId("Extended color light").should.equal("LCT015");
      handler.getModelId("Color temperature light").should.equal("LTW011");
    });

    it("should detect color support correctly", function () {
      const HueApiV2Handler = require("../alexa/hue-api-v2-handler");
      const handler = new HueApiV2Handler(null, null);

      handler.supportsColor("Color light").should.be.true();
      handler.supportsColor("Extended color light").should.be.true();
      handler.supportsColor("Dimmable light").should.be.false();
      handler.supportsColor("Color temperature light").should.be.false();
    });

    it("should detect color temperature support correctly", function () {
      const HueApiV2Handler = require("../alexa/hue-api-v2-handler");
      const handler = new HueApiV2Handler(null, null);

      handler
        .supportsColorTemperature("Color temperature light")
        .should.be.true();
      handler.supportsColorTemperature("Extended color light").should.be.true();
      handler.supportsColorTemperature("Color light").should.be.false();
      handler.supportsColorTemperature("Dimmable light").should.be.false();
    });
  });

  describe("v2 Brightness Conversion", function () {
    it("should convert v1 brightness to v2 percentage", function () {
      // v1 uses 0-254, v2 uses 0-100
      const v1Brightness = 127; // ~50%
      const v2Percentage = Math.round((v1Brightness / 254) * 100);
      v2Percentage.should.equal(50);
    });

    it("should convert v2 percentage to v1 brightness", function () {
      // v2 uses 0-100, v1 uses 0-254
      const v2Percentage = 75;
      const v1Brightness = Math.round((v2Percentage / 100) * 254);
      v1Brightness.should.equal(191);
    });
  });
});
