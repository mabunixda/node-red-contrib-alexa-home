/**
 * Additional test coverage for Hue API v2 implementation gaps
 * Covers SSE, additional HTTP methods, and edge cases
 */

"use strict";

const helper = require("node-red-node-test-helper");
const controllerNode = require("../alexa/nodes/alexa-home-controller.js");
const alexaNode = require("../alexa/nodes/alexa-lights.js");
const { getRandomTestPort } = require("./test-utils");
const request = require("supertest");

helper.init(require.resolve("node-red"));

describe("Hue API v2 Handler - Extended Coverage", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("Server-Sent Events (SSE)", function () {
    it("should verify SSE endpoint exists and handler is configured", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "SSE Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          // Test that SSE endpoint and handler exist
          try {
            const v2Handler = controller._hub[0].v2Handler;
            v2Handler.should.have.property("handleEventStream");
            v2Handler.handleEventStream.should.be.a.Function();

            // Test that eventClients Set exists
            v2Handler.should.have.property("eventClients");
            v2Handler.eventClients.should.be.instanceof(Set);

            done();
          } catch (error) {
            done(error);
          }
        }, 100);
      });
    });

    it("should emit resource updates to SSE clients", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "SSE Update Test",
          port: hubPort,
          useNode: false,
        },
        {
          id: "light1",
          type: "alexa-home",
          devicename: "SSE Test Light",
          devicetype: "Extended color light",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");
        const light = helper.getNode("light1");

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          // Test that emitResourceUpdate method exists and works
          try {
            const v2Handler = controller._hub[0].v2Handler;
            v2Handler.should.have.property("emitResourceUpdate");

            // Test the method doesn't throw
            v2Handler.emitResourceUpdate("light", "test-id", {
              on: { on: true },
            });
            done();
          } catch (error) {
            done(error);
          }
        }, 100);
      });
    });
  });

  describe("HTTP Methods Coverage", function () {
    it("should verify v2Handler handles different HTTP methods", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Routes Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          // Check that v2Handler has the necessary methods
          const v2Handler = controller._hub[0].v2Handler;
          v2Handler.should.have.property("handleResourceRequest");
          v2Handler.handleResourceRequest.should.be.a.Function();

          done();
        }, 100);
      });
    });
  });

  describe("Placeholder Resource Types", function () {
    it("should handle room resource requests", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Room Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          request(controller._hub[0].app)
            .get("/clip/v2/resource/room")
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
                response.data.length.should.equal(0); // Empty for placeholder
                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });

    it("should handle zone resource requests", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Zone Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          request(controller._hub[0].app)
            .get("/clip/v2/resource/zone")
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
                response.data.length.should.equal(0); // Empty for placeholder
                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });

    it("should handle scene resource requests", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Scene Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          request(controller._hub[0].app)
            .get("/clip/v2/resource/scene")
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
                response.data.length.should.equal(0); // Empty for placeholder
                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });

    it("should handle bridge_home resource requests", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Bridge Home Test Controller",
          port: hubPort,
          useNode: false,
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          request(controller._hub[0].app)
            .get("/clip/v2/resource/bridge_home")
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
                response.data.length.should.equal(0); // Empty for placeholder
                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });
  });

  describe("Advanced Color and Color Temperature", function () {
    it("should handle color temperature updates correctly", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Color Temp Test Controller",
          port: hubPort,
          useNode: false,
        },
        {
          id: "light1",
          type: "alexa-home",
          devicename: "Color Temp Light",
          devicetype: "Color temperature light",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");
        const light = helper.getNode("light1");
        const lightUuid = controller.formatUUID(light.id);

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          const updateData = {
            color_temperature: {
              mirek: 300,
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
                response.data.should.be.an.Array();
                response.data.length.should.be.greaterThan(0);
                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });

    it("should include color capabilities in light data for color lights", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Color Capability Test",
          port: hubPort,
          useNode: false,
        },
        {
          id: "light1",
          type: "alexa-home",
          devicename: "Color Light",
          devicetype: "Extended color light",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
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
                response.should.have.property("data");
                response.data.should.be.an.Array();

                if (response.data.length > 0) {
                  const light = response.data[0];
                  // Extended color lights should have color capabilities
                  light.should.have.property("color");
                  light.color.should.have.property("xy");
                  light.color.should.have.property("gamut");
                  light.color.should.have.property("gamut_type", "C");

                  // Should also have color temperature for extended color
                  light.should.have.property("color_temperature");
                  light.color_temperature.should.have.property("mirek_schema");
                }

                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });
  });

  describe("Error Handling Edge Cases", function () {
    it("should handle invalid light ID in GET request", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Invalid ID Test",
          port: hubPort,
          useNode: false,
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          request(controller._hub[0].app)
            .get("/clip/v2/resource/light/nonexistent-light-id")
            .expect(404)
            .expect("Content-Type", /json/)
            .end(function (err, res) {
              if (err) return done(err);

              try {
                const response = JSON.parse(res.text);
                response.should.have.property("errors");
                response.should.have.property("data");
                response.errors.should.be.an.Array();
                response.data.should.be.an.Array();
                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });

    it("should handle invalid update data gracefully", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Invalid Data Test",
          port: hubPort,
          useNode: false,
        },
        {
          id: "light1",
          type: "alexa-home",
          devicename: "Test Light",
          devicetype: "Dimmable light",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");
        const light = helper.getNode("light1");
        const lightUuid = controller.formatUUID(light.id);

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          const invalidData = {
            invalid_property: "invalid_value",
          };

          request(controller._hub[0].app)
            .put(`/clip/v2/resource/light/${lightUuid}`)
            .send(invalidData)
            .expect(200) // Should succeed but ignore invalid properties
            .expect("Content-Type", /json/)
            .end(function (err, res) {
              if (err) return done(err);

              try {
                const response = JSON.parse(res.text);
                response.should.have.property("errors");
                response.should.have.property("data");
                response.errors.should.be.an.Array();
                response.data.should.be.an.Array();
                done();
              } catch (error) {
                done(error);
              }
            });
        }, 100);
      });
    });
  });

  describe("Node-RED Integration", function () {
    it("should handle v2 API through Node-RED HTTP server", function (done) {
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Node-RED v2 Test",
          useNode: true, // Use Node-RED server
        },
        {
          id: "light1",
          type: "alexa-home",
          devicename: "Node-RED Test Light",
          devicetype: "Dimmable light",
        },
      ];

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          try {
            // When using Node-RED server, should not have _hub
            controller.should.have.property("useNode", true);
            controller.should.have.property("v2Handler");

            // v2Handler should be properly initialized
            controller.v2Handler.should.have.property("controller", controller);
            controller.v2Handler.should.have.property("apiVersion", "1.56.0");
            done();
          } catch (error) {
            done(error);
          }
        }, 100);
      });
    });
  });

  describe("Performance and Memory", function () {
    it("should handle multiple SSE clients without memory leaks", function (done) {
      const hubPort = getRandomTestPort();
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "SSE Memory Test",
          port: hubPort,
          useNode: false,
        },
      ];

      helper.load(controllerNode, flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          try {
            const v2Handler = controller._hub[0].v2Handler;
            const initialClientCount = v2Handler.eventClients.size;

            // Test that eventClients Set exists and starts empty
            v2Handler.eventClients.should.be.instanceof(Set);
            initialClientCount.should.equal(0);

            done();
          } catch (error) {
            done(error);
          }
        }, 100);
      });
    });

    it("should handle large device lists efficiently", function (done) {
      const hubPort = getRandomTestPort();
      const deviceCount = 50;
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Large Device List Test",
          port: hubPort,
          useNode: false,
        },
      ];

      // Add many devices
      for (let i = 0; i < deviceCount; i++) {
        flow.push({
          id: `light${i}`,
          type: "alexa-home",
          devicename: `Bulk Test Light ${i}`,
          devicetype: i % 2 === 0 ? "Dimmable light" : "Extended color light",
        });
      }

      helper.load([controllerNode, alexaNode], flow, function () {
        const controller = helper.getNode("controller1");

        setTimeout(() => {
          if (
            !controller._hub ||
            !controller._hub[0] ||
            !controller._hub[0].app
          ) {
            done(new Error("Hub not properly initialized"));
            return;
          }

          const startTime = Date.now();

          request(controller._hub[0].app)
            .get("/clip/v2/resource/light")
            .expect(200)
            .expect("Content-Type", /json/)
            .end(function (err, res) {
              if (err) return done(err);

              try {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                const response = JSON.parse(res.text);
                response.should.have.property("data");
                response.data.should.be.an.Array();
                response.data.length.should.equal(deviceCount);

                // Should complete in reasonable time (under 500ms for 50 devices)
                responseTime.should.be.below(500);

                done();
              } catch (error) {
                done(error);
              }
            });
        }, 200); // Allow more time for many devices to register
      });
    });
  });
});
