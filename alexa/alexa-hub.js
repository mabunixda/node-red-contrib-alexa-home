"use strict";

const express = require("express");

/**
 * AlexaHub - Modern HTTP/HTTPS server with Alexa compatibility
 * Handles Express app setup, SSDP discovery, and API routing
 * Now supports both Hue API v1 and v2 protocols
 */
class AlexaHub {
  constructor(controller, port, id, options = {}) {
    this.controller = this.validateController(controller);
    this.id = this.validateId(id);
    this.port = this.validatePort(port, id);
    this.willClose = false;

    // Configure protocol and HTTPS options
    this.useHttps = options.useHttps || false;
    this.httpsOptions = options.httpsOptions || null;
    this.protocol = this.useHttps
      ? "https"
      : process.env.ALEXA_PROTOCOL || "http";

    // Initialize v2 API handler
    const HueApiV2Handler = require("./hue-api-v2-handler");
    this.v2Handler = new HueApiV2Handler(
      controller,
      controller.templateManager,
    );

    this.startSsdp();

    if (this.controller.useNode) {
      this.controller.log(
        "Using Node-RED node for Alexa Hub, skipping server creation",
      );
      return;
    }

    // Server instances - only initialize when not using Node-RED
    this.httpServer = null;
    this.server = null;

    this.createServer();
  }

  /**
   * Validate controller parameter
   */
  validateController(controller) {
    if (!controller || typeof controller !== "object") {
      throw new Error("Invalid controller provided to AlexaHub");
    }
    return controller;
  }

  /**
   * Validate ID parameter
   */
  validateId(id) {
    if (id === undefined || id === null) {
      throw new Error("ID is required for AlexaHub");
    }
    return id;
  }

  /**
   * Validate port configuration
   */
  validatePort(port, id) {
    const calculatedPort = port + id;
    if (isNaN(calculatedPort) || calculatedPort < 1 || calculatedPort > 65535) {
      throw new Error(
        `Invalid port number: ${calculatedPort} (base: ${port}, id: ${id})`,
      );
    }
    return calculatedPort;
  }

  /**
   * Create and configure Express server with enhanced Alexa compatibility
   */
  createServer() {
    const app = express();
    this.app = app;
    this.ip = "0.0.0.0";
    if (process.env.ALEXA_IP !== undefined) {
      this.ip = process.env.ALEXA_IP;
      this.controller.log(`Using ${this.ip} to listen to alexa commands`);
    }

    this.controller.log(
      `Creating server based on ${this.protocol} protocol and port ${this.port}`,
    );

    // Create HTTP or HTTPS server based on configuration
    if (this.useHttps && this.httpsOptions) {
      // Create HTTPS server
      this.httpServer = require("https").createServer(this.httpsOptions, app);
      this.controller.log("HTTPS server created with SSL/TLS certificates");
    } else {
      // Create HTTP server
      this.httpServer = require("http").createServer(app);
    }

    this.server = this.httpServer.listen(this.port, this.ip, (error) => {
      if (error) {
        this.controller.error(`Failed to start server: ${error.message}`);
        return;
      }

      app.on("error", (error) => {
        this.controller.error(`Express app error: ${error.message}`);
      });

      this.setupMiddleware(app);
      this.setupRoutes(app);
    });
  }

  /**
   * Setup Express middleware for Alexa compatibility
   */
  setupMiddleware(app) {
    // Use built-in Express JSON parser (replaces body-parser dependency)
    // Handles all content types (*/*) for Alexa compatibility
    app.use(
      express.json({
        type: "*/*",
      }),
    );

    app.use((err, req, res, next) => {
      if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        this.controller.log(
          `Error: Invalid JSON request from ${req.ip}: ${err.message}`,
        );
        // Return proper Hue bridge error format for Alexa compatibility
        res.status(400).json([
          {
            error: {
              type: 2,
              address: req.url,
              description: "Body contains invalid JSON",
            },
          },
        ]);
        return;
      }

      // Handle other errors gracefully for Alexa
      this.controller.error(`Request error: ${err.message}`);
      res.status(500).json([
        {
          error: {
            type: 901,
            address: req.url,
            description: "Internal bridge error",
          },
        },
      ]);
    });

    app.use((req, res, next) => {
      req.headers.alexaIp = this.controller.getAlexaIPAddress(req);
      this.controller.log(
        `Request data: ${req.headers.alexaIp}-${this.port}/${req.method} -> ${req.url}`,
      );
      if (req.body && Object.keys(req.body).length > 0) {
        this.controller.debug(`Request body: ${JSON.stringify(req.body)}`);
      }
      if (this.willClose) {
        res.set("Connection", "close");
        res.status(503).json({ error: "Temporarly Unavailable" });
        return;
      }

      // Add Alexa-compatible response headers
      res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "no-cache",
        Server: "nginx/1.10.3 (Ubuntu)",
      });

      next();
    });
  }

  /**
   * Setup Express routes for Alexa API endpoints
   * Supports both v1 and v2 API protocols
   */
  setupRoutes(app) {
    // Root and setup routes
    app.get("/", (req, res) => {
      this.controller.handleIndex(this.id, req, res);
    });

    app.get("/alexa-home/setup.xml", (req, res) => {
      this.controller.handleSetup(this.id, req, res);
    });

    // v1 API routes (existing)
    app.post("/api", (req, res) => {
      this.controller.handleRegistration(this.id, req, res);
    });

    app.get("/api/", (req, res) => {
      this.controller.handleApiCall(this.id, req, res);
    });

    app.get("/api/config", (req, res) => {
      this.controller.handleConfigList(this.id, req, res);
    });

    app.get("/api/:username", (req, res) => {
      this.controller.handleApiCall(this.id, req, res);
    });

    app.get("/api/:username/config", (req, res) => {
      this.controller.handleConfigList(this.id, req, res);
    });

    app.get("/api/:username/:itemType", (req, res) => {
      this.controller.handleItemList(this.id, req, res);
    });

    app.post("/api/:username/:itemType", (req, res) => {
      this.controller.handleItemList(this.id, req, res);
    });

    app.get("/api/:username/:itemType/new", (req, res) => {
      this.controller.handleItemList(this.id, req, res);
    });

    app.get("/api/:username/:itemType/:id", (req, res) => {
      this.controller.getItemInfo(this.id, req, res);
    });

    app.put("/api/:username/:itemType/:id/state", (req, res) => {
      this.controller.controlItem(this.id, req, res);
    });

    // v2 API routes (new)
    app.get("/clip/v2/resource/:resourceType", (req, res) => {
      this.v2Handler.handleResourceRequest(this.id, req, res);
    });

    app.get("/clip/v2/resource/:resourceType/:id", (req, res) => {
      this.v2Handler.handleResourceRequest(this.id, req, res);
    });

    app.put("/clip/v2/resource/:resourceType/:id", (req, res) => {
      this.v2Handler.handleResourceRequest(this.id, req, res);
    });

    app.post("/clip/v2/resource/:resourceType", (req, res) => {
      this.v2Handler.handleResourceRequest(this.id, req, res);
    });

    app.delete("/clip/v2/resource/:resourceType/:id", (req, res) => {
      this.v2Handler.handleResourceRequest(this.id, req, res);
    });

    // v2 EventSource endpoint for real-time updates
    app.get("/eventstream/clip/v2", (req, res) => {
      this.v2Handler.handleEventStream(this.id, req, res);
    });

    // v2 bridge configuration
    app.get("/clip/v2/resource/bridge", (req, res) => {
      this.v2Handler.handleBridgeResource(this.id, req, res);
    });
  }

  /**
   * Stop HTTP servers and SSDP service gracefully
   */
  stopServers() {
    this.controller.log("Stopping SSDP server");
    if (this.ssdpServer) {
      try {
        this.ssdpServer.stop();
      } catch (error) {
        // Use error method if available, fallback to log
        if (typeof this.controller.error === "function") {
          this.controller.error(`Error stopping SSDP server: ${error.message}`);
        } else {
          this.controller.log(`Error stopping SSDP server: ${error.message}`);
        }
      }
    }

    if (!this.server) {
      return;
    }

    this.controller.log("Stopping HTTP server");
    this.server.close(() => {
      this.controller.log("HTTP server stopped successfully");
    });
  }

  /**
   * Start SSDP (Simple Service Discovery Protocol) for Alexa device discovery
   */
  startSsdp() {
    this.controller.log(`${this.id} - alexa-home - Starting SSDP`);
    const hueuuid = this.controller.formatHueBridgeUUID(this.id);
    const Ssdp = require("node-ssdp").Server;
    let location = process.env.ALEXA_URI + "/alexa-home/setup.xml";

    if (process.env.ALEXA_URI === undefined) {
      location = {
        protocol: this.protocol + "://",
        port: this.port,
        path: "/alexa-home/setup.xml",
      };
    }

    // Enhanced SSDP configuration for better Alexa compatibility
    this.ssdpServer = new Ssdp({
      location,
      udn: "uuid:" + hueuuid,
      // Add more specific UPnP device information for Alexa
      description: "Philips hue Personal Wireless Lighting",
      ttl: 1800, // Standard TTL for UPnP announcements
      ssdpSig: "Linux/3.14.0 UPnP/1.0 IpBridge/1.56.0", // Updated to indicate v2 support
    });

    // Add essential USN entries for Alexa discovery
    this.ssdpServer.addUSN("upnp:rootdevice");
    this.ssdpServer.addUSN("urn:schemas-upnp-org:device:basic:1");
    this.ssdpServer.addUSN("urn:schemas-upnp-org:device:Basic:1"); // Case variation for compatibility

    // Configure for better network discovery
    this.ssdpServer.reuseAddr = true;

    // Set multicast options for better Alexa discovery
    try {
      this.ssdpServer.start();
      this.controller.log(`${this.id} - SSDP server started successfully`);
    } catch (error) {
      this.controller.error(`Failed to start SSDP server: ${error.message}`);
    }

    this.controller.log(
      `${this.id} - announcing location is ${JSON.stringify(location)}`,
    );
  }
}

module.exports = AlexaHub;
