module.exports = function(RED) {
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

    node.on("input", function(msg) {
      msg.inputTrigger = true;
      node.processCommand(msg);
    });

    node.on("close", function(done) {
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

  AlexaHomeNode.prototype.setConnectionStatusMsg = function(
    color,
    text,
    shape
  ) {
    shape = shape || "dot";
    this.status({
      fill: color,
      shape,
      text
    });
  };

  AlexaHomeNode.prototype.updateController = function(controllerNode) {
    const node = this;
    node.controller = controllerNode;
    node.setConnectionStatusMsg("green", "Ok");
  };

  AlexaHomeNode.prototype.processCommand = function(msg) {
    const node = this;

    if (node.controller === null || node.controller === undefined) {
      node.warn("Ignoring process command - no controller available!");
      node.setConnectionStatusMsg("red", "No Alexa Home Controller available");
      return;
    }
    // Detect increase/decrease command
    msg.change_direction = 0;
    if (msg.payload.bri) {
      if (msg.payload.bri < node.bri) {
        msg.change_direction = -1;
      }
      if (msg.payload.bri > node.bri) {
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

  AlexaHomeNode.prototype.generateUniqueId = function(uuid) {
    let i = 9;
    const base = "00:11:22:33:44:55:66:77-88";
    const nodeid = uuid.split("");
    const uniqueid = base.replace(
      /\d/g,
      () => nodeid.shift() || Math.max(--i, 0),
      "g"
    );
    return uniqueid;
  };

  RED.nodes.registerType("alexa-home", AlexaHomeNode);
};
