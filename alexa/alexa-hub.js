"use strict";

const express = require("express");
const bodyParser = require("body-parser");
/**
 * Hub to create communication with alexa devices
 * @constructor
 * @param {AlexaHomeController} controller - Controller node
 * @param {number} port - base port where controllerhub starts
 * @param {number} id - counting number which is maintained in controller node
 */
function AlexaHub(controller, port, id) {
  const node = this;
  node.controller = controller;
  node.id = id;
  node.port = port + id;
  node.willClose = false;
  const protocol = "http";
  const options = undefined;
  node.startSsdp(protocol);
  if (node.controller.useNode) {
    return;
  }
  node.createServer(protocol, options);
}

AlexaHub.prototype.createServer = function(protocol, options) {
  const node = this;
  const app = express();
  node.app = app;
  node.ip = "0.0.0.0";
  if (process.env.ALEXA_IP !== undefined) {
    node.ip = process.env.ALEXA_IP;
    node.controller.log("Using " + node.ip + " to listing to alexa commands");
  }
  node.httpServer = require(protocol).createServer(options, app);
  node.server = node.httpServer.listen(node.port, node.ip, function(error) {
    if (error) {
      node.controller.log(error);
    }
    app.on("error", function(error) {
      node.controller.log(error);
    });

    app.use(
      bodyParser.json({
        type: "*/*"
      })
    );

    app.use(function(err, req, res, next) {
      if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        node.controller.log(
          "Error: Invalid JSON request: " + JSON.stringify(err.body)
        );
      }
      next();
    });

    app.use(function(req, res, next) {
      req.headers.alexaIp = node.controller.getAlexaIPAddress(req);
      node.controller.log(
        "Request data: " +
          req.headers.alexaIp +
          "-" +
          node.port +
          "/" +
          req.method +
          " -> " +
          req.url
      );
      if (Object.keys(req.body).length > 0) {
        node.controller.debug("Request body: " + JSON.stringify(req.body));
      }
      if (node.willClose) {
        res.set("Connection", "close");
        res.status(503).json({ error: "Temporarly Unavailable" });
        return;
      }
      next();
    });

    app.get("/", function(req, res) {
      node.controller.handleIndex(node.id, req, res);
    });

    app.get("/alexa-home/setup.xml", function(req, res) {
      node.controller.handleSetup(node.id, req, res);
    });

    app.post("/api", function(req, res) {
      node.controller.handleRegistration(node.id, req, res);
    });

    app.get("/api/", function(req, res) {
      node.controller.handleApiCall(node.id, req, res);
    });

    app.get("/api/config", function(req, res) {
      node.controller.handleConfigList(node.id, req, res);
    });

    app.get("/api/:username", function(req, res) {
      node.controller.handleApiCall(node.id, req, res);
    });

    app.get("/api/:username/config", function(req, res) {
      node.controller.handleConfigList(node.id, req, res);
    });

    app.get("/api/:username/:itemType", function(req, res) {
      node.controller.handleItemList(node.id, req, res);
    });

    app.post("/api/:username/:itemType", function(req, res) {
      node.controller.handleItemList(node.id, req, res);
    });

    app.get("/api/:username/:itemType/new", function(req, res) {
      node.controller.handleItemList(node.id, req, res);
    });

    app.get("/api/:username/:itemType/:id", function(req, res) {
      node.controller.getItemInfo(node.id, req, res);
    });

    app.put("/api/:username/:itemType/:id/state", function(req, res) {
      node.controller.controlItem(node.id, req, res);
    });
  });
};

AlexaHub.prototype.stopServers = function() {
  const node = this;
  node.controller.log("Stopping ssdp");
  node.ssdpServer.stop();
  if (!node.server) {
    return;
  }
  node.controller.log("Stopping app");
  node.server.close(function() {
    node.controller.log("stopped http");
  });
};
AlexaHub.prototype.startSsdp = function(protocol) {
  const node = this;
  node.controller.log(node.id + " - alexa-home - Starting SSDP");
  const hueuuid = node.controller.formatHueBridgeUUID(node.id);
  const Ssdp = require("node-ssdp").Server;
  let location = process.env.ALEXA_URI + "/alexa-home/setup.xml";
  if (process.env.ALEXA_URI === undefined) {
    location = {
      protocol: protocol + "://",
      port: node.port,
      path: "/alexa-home/setup.xml"
    };
  }
  node.ssdpServer = new Ssdp({
    location,
    udn: "uuid:" + hueuuid
  });
  node.ssdpServer.addUSN("upnp:rootdevice");
  node.ssdpServer.addUSN("urn:schemas-upnp-org:device:basic:1");
  node.ssdpServer.reuseAddr = true;
  node.ssdpServer.start();

  node.controller.log(node.id + " - announcing location is " + location);
};

module.exports = AlexaHub;
