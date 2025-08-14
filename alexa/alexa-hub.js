"use strict";

const express = require("express");
const bodyParser = require("body-parser");
/**
 * Hub to create communication with alexa devices
 * @constructor
 * @param {AlexaHomeController} controller - Controller node
 * @param {number} port - base port where controllerhub starts
 * @param {number} id - counting number which is maintained in controller node
 * @param {Object} options - Optional configuration including HTTPS settings
 */
function AlexaHub(controller, port, id, options = {}) {
  const node = this;
  node.controller = controller;
  node.id = id;
  node.port = port + id;
  node.willClose = false;

  // Configure protocol and HTTPS options
  node.useHttps = options.useHttps || false;
  node.httpsOptions = options.httpsOptions || null;
  node.protocol = node.useHttps
    ? "https"
    : process.env.ALEXA_PROTOCOL || "http";

  node.startSsdp();

  if (node.controller.useNode) {
    node.controller.log(
      "Using Node-RED node for Alexa Hub, skipping server creation",
    );
    return;
  }

  node.createServer();
}

AlexaHub.prototype.createServer = function () {
  const node = this;
  const app = express();
  node.app = app;
  node.ip = "0.0.0.0";
  if (process.env.ALEXA_IP !== undefined) {
    node.ip = process.env.ALEXA_IP;
    node.controller.log("Using " + node.ip + " to listing to alexa commands");
  }

  node.controller.log(
    "Creating server based on " +
      node.protocol +
      " protocol and port " +
      node.port,
  );

  // Create HTTP or HTTPS server based on configuration
  if (node.useHttps && node.httpsOptions) {
    // Create HTTPS server
    node.httpServer = require("https").createServer(node.httpsOptions, app);
    node.controller.log("HTTPS server created with SSL/TLS certificates");
  } else {
    // Create HTTP server
    node.httpServer = require("http").createServer(app);
  }

  node.server = node.httpServer.listen(node.port, node.ip, function (error) {
    if (error) {
      node.controller.log(error);
    }
    app.on("error", function (error) {
      node.controller.log(error);
    });

    app.use(
      bodyParser.json({
        type: "*/*",
      }),
    );

    app.use(function (err, req, res, next) {
      if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        node.controller.log(
          "Error: Invalid JSON request from " + req.ip + ": " + err.message,
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
      node.controller.error("Request error: " + err.message);
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

    app.use(function (req, res, next) {
      req.headers.alexaIp = node.controller.getAlexaIPAddress(req);
      node.controller.log(
        "Request data: " +
          req.headers.alexaIp +
          "-" +
          node.port +
          "/" +
          req.method +
          " -> " +
          req.url,
      );
      if (Object.keys(req.body).length > 0) {
        node.controller.debug("Request body: " + JSON.stringify(req.body));
      }
      if (node.willClose) {
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

    app.get("/", function (req, res) {
      node.controller.handleIndex(node.id, req, res);
    });

    app.get("/alexa-home/setup.xml", function (req, res) {
      node.controller.handleSetup(node.id, req, res);
    });

    app.post("/api", function (req, res) {
      node.controller.handleRegistration(node.id, req, res);
    });

    app.get("/api/", function (req, res) {
      node.controller.handleApiCall(node.id, req, res);
    });

    app.get("/api/config", function (req, res) {
      node.controller.handleConfigList(node.id, req, res);
    });

    app.get("/api/:username", function (req, res) {
      node.controller.handleApiCall(node.id, req, res);
    });

    app.get("/api/:username/config", function (req, res) {
      node.controller.handleConfigList(node.id, req, res);
    });

    app.get("/api/:username/:itemType", function (req, res) {
      node.controller.handleItemList(node.id, req, res);
    });

    app.post("/api/:username/:itemType", function (req, res) {
      node.controller.handleItemList(node.id, req, res);
    });

    app.get("/api/:username/:itemType/new", function (req, res) {
      node.controller.handleItemList(node.id, req, res);
    });

    app.get("/api/:username/:itemType/:id", function (req, res) {
      node.controller.getItemInfo(node.id, req, res);
    });

    app.put("/api/:username/:itemType/:id/state", function (req, res) {
      node.controller.controlItem(node.id, req, res);
    });
  });
};

AlexaHub.prototype.stopServers = function () {
  const node = this;
  node.controller.log("Stopping ssdp");
  node.ssdpServer.stop();
  if (!node.server) {
    return;
  }
  node.controller.log("Stopping app");
  node.server.close(function () {
    node.controller.log("stopped http");
  });
};
AlexaHub.prototype.startSsdp = function () {
  const node = this;
  node.controller.log(node.id + " - alexa-home - Starting SSDP");
  const hueuuid = node.controller.formatHueBridgeUUID(node.id);
  const Ssdp = require("node-ssdp").Server;
  let location = process.env.ALEXA_URI + "/alexa-home/setup.xml";
  if (process.env.ALEXA_URI === undefined) {
    location = {
      protocol: node.protocol + "://",
      port: node.port,
      path: "/alexa-home/setup.xml",
    };
  }

  // Enhanced SSDP configuration for better Alexa compatibility
  node.ssdpServer = new Ssdp({
    location,
    udn: "uuid:" + hueuuid,
    // Add more specific UPnP device information for Alexa
    description: "Philips hue Personal Wireless Lighting",
    ttl: 1800, // Standard TTL for UPnP announcements
    ssdpSig: "Linux/3.14.0 UPnP/1.0 IpBridge/1.26.0", // Mimic real Hue bridge signature
  });

  // Add essential USN entries for Alexa discovery
  node.ssdpServer.addUSN("upnp:rootdevice");
  node.ssdpServer.addUSN("urn:schemas-upnp-org:device:basic:1");
  node.ssdpServer.addUSN("urn:schemas-upnp-org:device:Basic:1"); // Case variation for compatibility

  // Configure for better network discovery
  node.ssdpServer.reuseAddr = true;

  // Set multicast options for better Alexa discovery
  try {
    node.ssdpServer.start();
    node.controller.log(node.id + " - SSDP server started successfully");
  } catch (error) {
    node.controller.error("Failed to start SSDP server: " + error.message);
  }

  node.controller.log(
    node.id + " - announcing location is " + JSON.stringify(location),
  );
};

module.exports = AlexaHub;
