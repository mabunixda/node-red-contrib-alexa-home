module.exports = function (RED) {
  "use strict";
  const alexaHome = require("./alexa-helper");

  /**
   * creates a node which is reflected as command in alexa
   * @constructor
   * @param {map} config configuration injected by node-red
   **/
  function AlexaHomeNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.name = config.devicename;
    node.control = config.control;

    if (config.devicetype) {
      node.devicetype = config.devicetype;
    } else {
      node.devicetype = "Extended color light";
    }
    node.inputTrigger = config.inputtrigger;
    node.state = false;
    node.bri = alexaHome.bri_default;
    node.xy = [0, 0];
    node.uniqueid = node.generateUniqueId(config.id);

    node.on("input", function (msg) {
      msg.inputTrigger = true;
      node.processCommand(msg);
    });

    node.on("close", function (done) {
      if (node.controller) {
        node.controller.deregisterCommand(node);
      }
      done();
    });

    const controller = alexaHome.controllerNode;

    if (controller) {
      controller.registerCommand(node);
      return;
    }
    RED.log.debug("No Alexa Home Controller available");
    node.setConnectionStatusMsg("red", "No Alexa Home Controller available");
  }

  AlexaHomeNode.prototype.setConnectionStatusMsg = function (
    color,
    text,
    shape,
  ) {
    shape = shape || "dot";
    this.status({
      fill: color,
      shape,
      text,
    });
  };

  AlexaHomeNode.prototype.updateController = function (controllerNode) {
    const node = this;
    node.controller = controllerNode;
    node.setConnectionStatusMsg("green", "Ok");
  };

  /**
   * Process commands from Alexa or input messages
   * @param {Object} msg - Message object containing payload with device commands
   * @param {Object} msg.payload - Command payload (on/off, brightness, color, etc.)
   * @param {boolean} msg.inputTrigger - Whether triggered from input vs Alexa
   */
  AlexaHomeNode.prototype.processCommand = function (msg) {
    const node = this;

    // Basic input validation
    if (!msg || msg.payload === null || msg.payload === undefined) {
      node.warn("Received message without valid payload");
      node.setConnectionStatusMsg("orange", "Invalid message");
      return;
    }

    if (node.controller === null || node.controller === undefined) {
      node.warn("Ignoring process command - no controller available!");
      node.setConnectionStatusMsg("red", "No Alexa Home Controller available");
      return;
    }
    // Detect increase/decrease command
    msg.change_direction = 0;
    if (msg.payload.bri) {
      // Add validation for brightness values when they exist
      const brightness = parseInt(msg.payload.bri);
      if (isNaN(brightness) || brightness < 0 || brightness > 254) {
        node.warn(`Invalid brightness value: ${msg.payload.bri}. Must be 0-254.`);
        node.setConnectionStatusMsg("orange", "Invalid brightness");
        return;
      }
      msg.payload.bri = brightness; // Ensure it's a proper integer
      
      if (brightness < node.bri) {
        msg.change_direction = -1;
      }
      if (brightness > node.bri) {
        msg.change_direction = 1;
      }
    }

    // set color
    if (msg.payload.xy) {
      RED.log.debug(node.name + " - Setting values on xy: " + msg.payload.xy);
      node.setConnectionStatusMsg("blue", "xy: " + msg.payload.xy);
      msg.payload.command = "color";
    }
    // Dimming or Temperature command
    if (msg.payload.bri) {
      RED.log.debug(node.name + " - Setting values on bri: " + msg.payload.bri);
      msg.payload.on = msg.payload.bri > 0;
      msg.payload.command = "dim";
      node.setConnectionStatusMsg("blue", "bri:" + msg.payload.bri);
    } else {
      RED.log.debug(node.name + " - Setting values on On/Off");
      let isOn = false;
      if (typeof msg.payload === "object") {
        isOn = msg.payload.on;
      } else {
        if (typeof msg.payload === "string") {
          isOn = msg.payload === "1" || msg.payload === "on";
        } else if (typeof msg.payload === "number") {
          isOn = msg.payload === 1;
        } else {
          node.setConnectionStatusMsg("orange", "could not process input msg");
          return;
        }
        msg.payload = {};
      }
      msg.payload.on = isOn;
      msg.payload.bri = node.bri;

      if (msg.payload.xy === undefined) {
        msg.payload.command = "switch";
        // Node status
        node.setConnectionStatusMsg("blue", isOn ? "On" : "Off");
      }
    }

    msg.payload.bri_normalized = Math.round((msg.payload.bri / 254.0) * 100.0);
    msg.device_name = node.name;
    msg.light_id = node.id;
    node.state = msg.payload.on;
    node.bri = msg.payload.bri;
    node.xy = msg.payload.xy;
    if (node.xy === undefined) {
      node.xy = [0, 0];
    }
    if (msg.inputTrigger && !msg.output) {
      RED.log.debug(node.name + " - Set values on input");
      return;
    }

    RED.log.debug(node.name + " - Pass values to output");

    node.send(msg);
  };

  AlexaHomeNode.prototype.generateUniqueId = function (uuid) {
    let i = 9;
    const base = "00:11:22:33:44:55:66:77-88";
    const nodeid = uuid.split("");
    const uniqueid = base.replace(
      /\d/g,
      () => nodeid.shift() || Math.max(--i, 0),
      "g",
    );
    return uniqueid;
  };

  RED.nodes.registerType("alexa-home", AlexaHomeNode);
};
