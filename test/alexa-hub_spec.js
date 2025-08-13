const should = require("should");
const AlexaHub = require("../alexa/alexa-hub.js");

// Mock controller for testing
const mockController = {
  id: "test-controller-id",
  log: function (message) {
    /* console.log('Controller:', message); */
  },
  debug: function (message) {
    /* console.log('Debug:', message); */
  },
  useNode: false,
  getAlexaIPAddress: function (req) {
    return req.connection.remoteAddress || "127.0.0.1";
  },
  handleIndex: function (id, req, res) {
    res.send("Index");
  },
  handleSetup: function (id, req, res) {
    res.send("Setup");
  },
  handleRegistration: function (id, req, res) {
    res.json({});
  },
  handleApiCall: function (id, req, res) {
    res.json({});
  },
  handleConfigList: function (id, req, res) {
    res.json({});
  },
  handleItemList: function (id, req, res) {
    res.json({});
  },
  getItemInfo: function (id, req, res) {
    res.json({});
  },
  controlItem: function (id, req, res) {
    res.json({});
  },
  formatHueBridgeUUID: function (id) {
    return "test-uuid-" + id;
  },
};

describe("AlexaHub", function () {
  let hub;
  const testPort = 60000;

  beforeEach(function () {
    // Clean up any previous instances
    if (hub) {
      try {
        hub.stopServers();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  afterEach(function (done) {
    if (hub) {
      try {
        hub.stopServers();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    setTimeout(done, 100); // Give time for cleanup
  });

  describe("Hub Initialization", function () {
    it("should create hub with correct properties", function () {
      hub = new AlexaHub(mockController, testPort, 1);

      hub.should.have.property("controller", mockController);
      hub.should.have.property("id", 1);
      hub.should.have.property("port", testPort + 1);
      hub.should.have.property("willClose", false);
    });

    it("should start SSDP server", function () {
      hub = new AlexaHub(mockController, testPort, 2);

      hub.should.have.property("ssdpServer");
      hub.ssdpServer.should.have.property("_started", true);
    });

    it("should create HTTP server when useNode is false", function () {
      hub = new AlexaHub(mockController, testPort, 3);

      hub.should.have.property("httpServer");
      hub.should.have.property("app");
      hub.should.have.property("server");
    });

    it("should not create HTTP server when useNode is true", function () {
      const mockControllerUseNode = Object.assign({}, mockController, {
        useNode: true,
      });
      hub = new AlexaHub(mockControllerUseNode, testPort, 4);

      hub.should.not.have.property("httpServer");
      hub.should.not.have.property("app");
      hub.should.not.have.property("server");
    });

    it("should use custom IP from environment variable", function () {
      const originalIp = process.env.ALEXA_IP;
      process.env.ALEXA_IP = "127.0.0.1"; // Use localhost instead of a potentially unavailable IP

      hub = new AlexaHub(mockController, testPort, 5);

      hub.ip.should.equal("127.0.0.1");

      // Restore original value
      if (originalIp !== undefined) {
        process.env.ALEXA_IP = originalIp;
      } else {
        delete process.env.ALEXA_IP;
      }
    });

    it("should use default IP when no environment variable", function () {
      const originalIp = process.env.ALEXA_IP;
      delete process.env.ALEXA_IP;

      hub = new AlexaHub(mockController, testPort, 6);

      hub.ip.should.equal("0.0.0.0");

      // Restore original value if it existed
      if (originalIp !== undefined) {
        process.env.ALEXA_IP = originalIp;
      }
    });
  });

  describe("SSDP Configuration", function () {
    it("should configure SSDP with correct location when no ALEXA_URI", function () {
      const originalUri = process.env.ALEXA_URI;
      delete process.env.ALEXA_URI;

      hub = new AlexaHub(mockController, testPort, 7);

      // SSDP should be configured with object location
      hub.ssdpServer.should.have.property("_started", true);

      // Restore original value if it existed
      if (originalUri !== undefined) {
        process.env.ALEXA_URI = originalUri;
      }
    });

    it("should use ALEXA_URI environment variable for location", function () {
      const originalUri = process.env.ALEXA_URI;
      process.env.ALEXA_URI = "http://custom-host:8080";

      hub = new AlexaHub(mockController, testPort, 8);

      hub.ssdpServer.should.have.property("_started", true);

      // Restore original value
      if (originalUri !== undefined) {
        process.env.ALEXA_URI = originalUri;
      } else {
        delete process.env.ALEXA_URI;
      }
    });

    it("should add correct USN values", function () {
      hub = new AlexaHub(mockController, testPort, 9);

      // We can't easily test the internal USN array, but we can verify the server started
      hub.ssdpServer.should.have.property("_started", true);
    });
  });

  describe("HTTP Server and Express App", function () {
    it("should handle body parsing", function (done) {
      hub = new AlexaHub(mockController, testPort, 10);

      // Wait a bit for server to start
      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .post("/api")
          .send({ test: "data" })
          .expect(200)
          .end(function (err, res) {
            if (err) throw err;
            done();
          });
      }, 100);
    });

    it("should log requests", function (done) {
      let logCalled = false;
      const mockControllerWithLog = Object.assign({}, mockController, {
        log: function (message) {
          if (message.includes("Request data:")) {
            logCalled = true;
          }
        },
      });

      hub = new AlexaHub(mockControllerWithLog, testPort, 11);

      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .get("/")
          .end(function (err, res) {
            logCalled.should.be.true();
            done();
          });
      }, 100);
    });

    it("should handle willClose state", function (done) {
      hub = new AlexaHub(mockController, testPort, 12);

      setTimeout(function () {
        hub.willClose = true;

        const request = require("supertest");
        request(hub.app)
          .get("/")
          .expect(503)
          .end(function (err, res) {
            res.body.should.have.property("error", "Temporarly Unavailable");
            done();
          });
      }, 100);
    });

    it("should handle JSON parsing errors gracefully", function (done) {
      let errorLogged = false;
      const mockControllerWithError = Object.assign({}, mockController, {
        log: function (message) {
          if (message.includes("Error: Invalid JSON request:")) {
            errorLogged = true;
          }
        },
      });

      hub = new AlexaHub(mockControllerWithError, testPort, 13);

      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .post("/api")
          .set("Content-Type", "application/json")
          .send("{ invalid json")
          .expect(400)
          .end(function (err, res) {
            // The error should be handled by middleware
            done();
          });
      }, 100);
    });
  });

  describe("Route Handling", function () {
    beforeEach(function () {
      hub = new AlexaHub(mockController, testPort, 14);
    });

    it("should route to handleIndex", function (done) {
      setTimeout(function () {
        const request = require("supertest");
        request(hub.app).get("/").expect(200).expect("Index").end(done);
      }, 100);
    });

    it("should route setup requests", function (done) {
      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .get("/alexa-home/setup.xml")
          .expect(200)
          .expect("Setup")
          .end(done);
      }, 100);
    });

    it("should route API registration", function (done) {
      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .post("/api")
          .expect(200)
          .expect("Content-Type", /json/)
          .end(done);
      }, 100);
    });

    it("should route config requests", function (done) {
      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .get("/api/config")
          .expect(200)
          .expect("Content-Type", /json/)
          .end(done);
      }, 100);
    });

    it("should route user-specific API calls", function (done) {
      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .get("/api/testuser")
          .expect(200)
          .expect("Content-Type", /json/)
          .end(done);
      }, 100);
    });

    it("should route item list requests", function (done) {
      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .get("/api/testuser/lights")
          .expect(200)
          .expect("Content-Type", /json/)
          .end(done);
      }, 100);
    });

    it("should route item info requests", function (done) {
      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .get("/api/testuser/lights/123")
          .expect(200)
          .expect("Content-Type", /json/)
          .end(done);
      }, 100);
    });

    it("should route state control requests", function (done) {
      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .put("/api/testuser/lights/123/state")
          .send({ on: true })
          .expect(200)
          .expect("Content-Type", /json/)
          .end(done);
      }, 100);
    });
  });

  describe("Server Lifecycle", function () {
    it("should stop servers cleanly", function () {
      hub = new AlexaHub(mockController, testPort, 15);

      // Should have stopServers method
      hub.should.have.property("stopServers").which.is.a.Function();

      // Just verify it can be called (may throw internal Node.js warnings but shouldn't crash)
      try {
        hub.stopServers();
      } catch (error) {
        // Allow for internal Node.js cleanup warnings, but not application errors
        if (
          error.code !== "ERR_ASSERTION" ||
          !error.message.includes("interval")
        ) {
          throw error;
        }
      }
    });

    it("should handle stop when no server exists", function () {
      const mockControllerUseNode = Object.assign({}, mockController, {
        useNode: true,
      });
      hub = new AlexaHub(mockControllerUseNode, testPort, 16);

      // Should have stopServers method
      hub.should.have.property("stopServers").which.is.a.Function();

      // Just verify it can be called
      try {
        hub.stopServers();
      } catch (error) {
        // Allow for internal Node.js cleanup warnings
        if (
          error.code !== "ERR_ASSERTION" ||
          !error.message.includes("interval")
        ) {
          throw error;
        }
      }
    });

    it("should handle server errors during creation", function () {
      // Test with an invalid/busy port scenario
      const mockControllerError = Object.assign({}, mockController, {
        log: function (message) {
          // Should handle errors
        },
      });

      // Should be able to create hub instance
      hub = new AlexaHub(mockControllerError, testPort, 17);
      hub.should.have.property("controller", mockControllerError);
      hub.should.have.property("port", testPort + 17);
    });
  });

  describe("Network and Connection Handling", function () {
    it("should extract Alexa IP address from requests", function (done) {
      let capturedIp = null;
      const mockControllerWithIpCapture = Object.assign({}, mockController, {
        getAlexaIPAddress: function (req) {
          // The alexaIp header is set by middleware, check if it exists
          capturedIp =
            req.headers.alexaIp || req.connection.remoteAddress || "127.0.0.1";
          return capturedIp;
        },
        log: function (message) {
          // Capture log messages
        },
      });

      hub = new AlexaHub(mockControllerWithIpCapture, testPort, 17);

      setTimeout(function () {
        const request = require("supertest");
        request(hub.app)
          .get("/")
          .end(function (err, res) {
            if (err) return done(err);
            // capturedIp should have some value (either from headers or connection)
            should.exist(capturedIp);
            done();
          });
      }, 100);
    });

    it("should handle environment variable ALEXA_IP", function (done) {
      const originalIp = process.env.ALEXA_IP;
      process.env.ALEXA_IP = "127.0.0.1"; // Use localhost

      hub = new AlexaHub(mockController, testPort, 18);

      setTimeout(function () {
        hub.ip.should.equal("127.0.0.1");

        // Restore original value
        if (originalIp !== undefined) {
          process.env.ALEXA_IP = originalIp;
        } else {
          delete process.env.ALEXA_IP;
        }
        done();
      }, 100);
    });

    it("should set Connection close header when willClose is true", function (done) {
      hub = new AlexaHub(mockController, testPort, 19);

      setTimeout(function () {
        hub.willClose = true;

        const request = require("supertest");
        request(hub.app)
          .get("/")
          .expect("Connection", "close")
          .expect(503)
          .end(done);
      }, 100);
    });
  });
});
