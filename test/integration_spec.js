const should = require("should");
const helper = require("node-red-node-test-helper");
const controllerNode = require("../alexa/alexa-home-controller.js");
const alexaNode = require("../alexa/alexa-home.js");
const request = require("supertest");

let alexaHelper = require("../alexa/alexa-helper.js");

helper.init(require.resolve("node-red"));

describe("Integration Tests - Complete Alexa Flow", function() {
  beforeEach(function(done) {
    helper.startServer(done);
  });

  afterEach(function(done) {
    helper.unload();
    helper.stopServer(done);
  });

  describe("Full Device Control Flow", function() {
    it("should handle complete Alexa device discovery and control", function(done) {
      const hubPort = 60000 + Math.floor(Math.random() * 1000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Integration Test Controller",
          port: hubPort,
          useNode: false
        },
        {
          id: "light1",
          type: "alexa-home",
          devicename: "Living Room Light",
          devicetype: "Extended color light",
          wires: [["output1"]]
        },
        {
          id: "light2", 
          type: "alexa-home",
          devicename: "Kitchen Light",
          devicetype: "Dimmable light",
          wires: [["output2"]]
        },
        {
          id: "output1",
          type: "helper"
        },
        {
          id: "output2",
          type: "helper"
        }
      ];

      helper.load([controllerNode, alexaNode], flow, function() {
        const controller = helper.getNode("controller1");
        const light1 = helper.getNode("light1");
        const light2 = helper.getNode("light2");
        const output1 = helper.getNode("output1");
        const output2 = helper.getNode("output2");

        // Verify devices are registered
        controller.commands.length.should.equal(2);
        light1.should.have.property("controller", controller);
        light2.should.have.property("controller", controller);

        // Test discovery - setup.xml
        request(controller._hub[0].app)
          .get("/alexa-home/setup.xml")
          .expect(200)
          .expect("Content-Type", /xml/)
          .end(function(err, res) {
            if (err) throw err;
            
            // Test device listing
            request(controller._hub[0].app)
              .get("/api/test-user/lights")
              .expect(200)
              .expect("Content-Type", /json/)
              .end(function(err, res) {
                if (err) throw err;
                
                const lights = JSON.parse(res.text);
                Object.keys(lights).length.should.equal(2);
                
                // Test individual light control
                let messagesReceived = 0;
                
                output1.on("input", function(msg) {
                  msg.payload.should.have.property("on", true);
                  msg.payload.should.have.property("bri", 200);
                  msg.device_name.should.equal("Living Room Light");
                  messagesReceived++;
                  
                  if (messagesReceived === 2) done();
                });
                
                output2.on("input", function(msg) {
                  msg.payload.should.have.property("on", false);
                  msg.device_name.should.equal("Kitchen Light");  
                  messagesReceived++;
                  
                  if (messagesReceived === 2) done();
                });

                // Control first light - turn on with brightness
                request(controller._hub[0].app)
                  .put("/api/test-user/lights/light1/state")
                  .send({ on: true, bri: 200 })
                  .expect(200)
                  .end(function(err, res) {
                    if (err) throw err;
                  });

                // Control second light - turn off  
                request(controller._hub[0].app)
                  .put("/api/test-user/lights/light2/state") 
                  .send({ on: false })
                  .expect(200)
                  .end(function(err, res) {
                    if (err) throw err;
                  });
              });
          });
      });
    });

    it("should handle registration and authentication flow", function(done) {
      const hubPort = 60000 + Math.floor(Math.random() * 1000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller", 
          controllername: "Auth Test Controller",
          port: hubPort,
          useNode: false
        }
      ];

      helper.load(controllerNode, flow, function() {
        const controller = helper.getNode("controller1");

        // Test registration
        request(controller._hub[0].app)
          .post("/api")
          .send({ devicetype: "Alexa Echo" })
          .expect(200)
          .expect("Content-Type", /json/)
          .end(function(err, res) {
            if (err) throw err;
            
            const response = JSON.parse(res.text);
            response.should.be.an.Array();
            response[0].should.have.property("success");
            response[0].success.should.have.property("username");
            
            const username = response[0].success.username;
            
            // Test authenticated config access
            request(controller._hub[0].app)
              .get("/api/" + username + "/config")
              .expect(200)
              .expect("Content-Type", /json/)
              .end(function(err, res) {
                if (err) throw err;
                
                const config = JSON.parse(res.text);
                config.should.have.property("name");
                config.should.have.property("bridgeid");
                config.should.have.property("modelid");
                
                done();
              });
          });
      });
    });
  });

  describe("Multi-Device Complex Scenarios", function() {
    it("should handle color and brightness changes", function(done) {
      const hubPort = 60000 + Math.floor(Math.random() * 1000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Color Test Controller", 
          port: hubPort,
          useNode: false
        },
        {
          id: "colorLight",
          type: "alexa-home",
          devicename: "Color Strip",
          devicetype: "Extended color light",
          wires: [["colorOutput"]]
        },
        {
          id: "colorOutput",
          type: "helper"
        }
      ];

      helper.load([controllerNode, alexaNode], flow, function() {
        const controller = helper.getNode("controller1");
        const colorLight = helper.getNode("colorLight");
        const colorOutput = helper.getNode("colorOutput");

        let testStep = 0;
        const expectedSteps = 3;

        colorOutput.on("input", function(msg) {
          testStep++;
          
          switch(testStep) {
            case 1:
              // Brightness test
              msg.payload.should.have.property("command", "dim");
              msg.payload.should.have.property("bri", 150);
              msg.payload.should.have.property("bri_normalized", 59);
              msg.should.have.property("change_direction", 1);
              break;
              
            case 2:
              // Color test  
              msg.payload.should.have.property("command", "color");
              msg.payload.should.have.property("xy", [0.3, 0.4]);
              break;
              
            case 3:
              // Combined color and brightness
              msg.payload.should.have.property("command", "color");
              msg.payload.should.have.property("xy", [0.5, 0.2]);
              msg.payload.should.have.property("bri", 100);
              break;
          }
          
          if (testStep === expectedSteps) {
            done();
          }
        });

        // Set initial brightness to test direction detection
        colorLight.bri = 50;

        // Test 1: Brightness increase
        request(controller._hub[0].app)
          .put("/api/test-user/lights/colorLight/state")
          .send({ on: true, bri: 150 })
          .expect(200)
          .end(function(err, res) {
            if (err) throw err;
          });

        // Test 2: Color change
        setTimeout(function() {
          request(controller._hub[0].app)
            .put("/api/test-user/lights/colorLight/state")
            .send({ on: true, xy: [0.3, 0.4] })
            .expect(200)
            .end(function(err, res) {
              if (err) throw err;
            });
        }, 50);

        // Test 3: Combined color and brightness  
        setTimeout(function() {
          request(controller._hub[0].app)
            .put("/api/test-user/lights/colorLight/state")
            .send({ on: true, xy: [0.5, 0.2], bri: 100 })
            .expect(200)
            .end(function(err, res) {
              if (err) throw err;
            });
        }, 100);
      });
    });

    it("should handle input trigger vs external control", function(done) {
      const hubPort = 60000 + Math.floor(Math.random() * 1000);
      const flow = [
        {
          id: "controller1", 
          type: "alexa-home-controller",
          controllername: "Trigger Test Controller",
          port: hubPort,
          useNode: false
        },
        {
          id: "triggerLight",
          type: "alexa-home", 
          devicename: "Trigger Light",
          inputtrigger: true,
          wires: [["triggerOutput"]]
        },
        {
          id: "triggerOutput",
          type: "helper"
        }
      ];

      helper.load([controllerNode, alexaNode], flow, function() {
        const controller = helper.getNode("controller1");
        const triggerLight = helper.getNode("triggerLight");
        const triggerOutput = helper.getNode("triggerOutput");

        let outputReceived = false;
        
        triggerOutput.on("input", function(msg) {
          // Should only receive output from external API control, not input
          msg.payload.should.have.property("on", true);
          outputReceived = true;
        });

        // Test 1: Input trigger (should not send to output)
        triggerLight.receive({ payload: { on: true } });
        
        // Wait and verify no output
        setTimeout(function() {
          outputReceived.should.be.false();
          
          // Test 2: External API control (should send to output)
          request(controller._hub[0].app)
            .put("/api/test-user/lights/triggerLight/state")
            .send({ on: true })
            .expect(200)
            .end(function(err, res) {
              if (err) throw err;
              
              // Wait for output
              setTimeout(function() {
                outputReceived.should.be.true();
                done();
              }, 50);
            });
        }, 100);
      });
    });
  });

  describe("Error Handling and Edge Cases", function() {
    it("should handle device deregistration", function(done) {
      const hubPort = 60000 + Math.floor(Math.random() * 1000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Deregister Test Controller",
          port: hubPort, 
          useNode: false
        },
        {
          id: "tempLight",
          type: "alexa-home",
          devicename: "Temporary Light"
        }
      ];

      helper.load([controllerNode, alexaNode], flow, function() {
        const controller = helper.getNode("controller1");
        const tempLight = helper.getNode("tempLight");

        // Initially registered
        controller.commands.should.containEql(tempLight);

        // Test deregistration
        controller.deregisterCommand(tempLight);
        controller.commands.should.not.containEql(tempLight);

        // Verify device list is updated
        request(controller._hub[0].app)
          .get("/api/test-user/lights")
          .expect(200)
          .end(function(err, res) {
            if (err) throw err;
            
            const lights = JSON.parse(res.text);
            Object.keys(lights).length.should.equal(0);
            done();
          });
      });
    });

    it("should handle invalid device control requests", function(done) {
      const hubPort = 60000 + Math.floor(Math.random() * 1000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller", 
          controllername: "Error Test Controller",
          port: hubPort,
          useNode: false
        }
      ];

      helper.load(controllerNode, flow, function() {
        const controller = helper.getNode("controller1");

        // Test control of non-existent light
        request(controller._hub[0].app)
          .put("/api/test-user/lights/nonexistent/state")
          .send({ on: true })
          .expect(200) // Should not error, just return empty response
          .end(function(err, res) {
            if (err) throw err;
            done();
          });
      });
    });

    it("should handle server shutdown gracefully", function(done) {
      const hubPort = 60000 + Math.floor(Math.random() * 1000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Shutdown Test Controller", 
          port: hubPort,
          useNode: false
        },
        {
          id: "testLight",
          type: "alexa-home",
          devicename: "Test Light"
        }
      ];

      helper.load([controllerNode, alexaNode], flow, function() {
        const controller = helper.getNode("controller1");
        const testLight = helper.getNode("testLight");

        // Verify setup is working
        request(controller._hub[0].app)
          .get("/api/config")
          .expect(200)
          .end(function(err, res) {
            if (err) throw err;
            
            // Trigger shutdown
            controller.emit("close", function() {
              // Verify cleanup
              should(alexaHelper.controllerNode).be.undefined();
              should(testLight.controller).be.undefined();
              done();
            });
          });
      });
    });
  });

  describe("Performance and Load Testing", function() {
    it("should handle multiple simultaneous requests", function(done) {
      const hubPort = 60000 + Math.floor(Math.random() * 1000);
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Load Test Controller",
          port: hubPort,
          useNode: false  
        },
        {
          id: "loadLight",
          type: "alexa-home",
          devicename: "Load Test Light",
          wires: [["loadOutput"]]
        },
        {
          id: "loadOutput", 
          type: "helper"
        }
      ];

      helper.load([controllerNode, alexaNode], flow, function() {
        const controller = helper.getNode("controller1");
        const loadOutput = helper.getNode("loadOutput");

        let requestsCompleted = 0;
        const totalRequests = 10;
        let messagesReceived = 0;

        loadOutput.on("input", function(msg) {
          messagesReceived++;
          if (messagesReceived === totalRequests) {
            done();
          }
        });

        // Send multiple simultaneous requests
        for (let i = 0; i < totalRequests; i++) {
          request(controller._hub[0].app)
            .put("/api/test-user/lights/loadLight/state")
            .send({ on: i % 2 === 0, bri: 100 + i * 10 })
            .expect(200)
            .end(function(err, res) {
              if (err) throw err;
              requestsCompleted++;
            });
        }
      });
    });

    it("should handle many devices efficiently", function(done) {
      const hubPort = 60000 + Math.floor(Math.random() * 1000);
      const deviceCount = 20;
      const flow = [
        {
          id: "controller1",
          type: "alexa-home-controller",
          controllername: "Many Devices Controller",
          port: hubPort,
          useNode: false
        }
      ];

      // Add many devices
      for (let i = 0; i < deviceCount; i++) {
        flow.push({
          id: `device${i}`,
          type: "alexa-home", 
          devicename: `Device ${i}`,
          devicetype: i % 3 === 0 ? "Extended color light" : "Dimmable light"
        });
      }

      helper.load([controllerNode, alexaNode], flow, function() {
        const controller = helper.getNode("controller1");

        // Verify all devices are registered
        controller.commands.length.should.equal(deviceCount);

        // Test device listing performance
        const startTime = Date.now();
        request(controller._hub[0].app)
          .get("/api/test-user/lights")
          .expect(200)
          .end(function(err, res) {
            if (err) throw err;
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            // Should respond quickly even with many devices  
            responseTime.should.be.below(1000);
            
            const lights = JSON.parse(res.text);
            Object.keys(lights).length.should.equal(deviceCount);
            done();
          });
      });
    });
  });
});
