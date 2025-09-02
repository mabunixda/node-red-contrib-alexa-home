/**
 * Node-RED Alexa Switch Node
 * Provides Alexa-compatible on/off plug-in unit functionality
 */

"use strict";

module.exports = function (RED) {
  const alexaHome = require("../alexa-helper");
  const utils = require("../utils");

  /**
   * Alexa Switch Node for on/off plug-in units
   * @constructor
   * @param {Object} config - Node-RED configuration object
   */
  function AlexaSwitchNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    try {
      // Initialize core properties
      node.name = config.devicename || "Alexa Switch";
      node.control = "lights"; // Use lights control for compatibility
      node.devicetype = "On/Off plug-in unit";
      node.inputTrigger = Boolean(config.inputtrigger);

      // Initialize device state
      node.state = false; // Default to off
      node.bri = 254; // Full brightness when on (for Hue compatibility)

      // Generate unique ID for the device
      node.unique = utils.generateUniqueId(`${node.name}${node.id}${node.devicetype}`);

      // Set up event handlers
      node.on("input", function(msg) {
        node.handleInputMessage(msg);
      });

      node.on("close", function() {
        if (node.controller && node.controller.deregisterCommand) {
          node.controller.deregisterCommand(node.unique);
        }
      });

      // Register with controller
      if (alexaHome.controllerNode && alexaHome.controllerNode.registerCommand) {
        alexaHome.controllerNode.registerCommand(node.unique, node);
        node.controller = alexaHome.controllerNode;
        node.status({ fill: "green", shape: "dot", text: "Connected" });
      } else {
        node.status({ fill: "red", shape: "dot", text: "No controller" });
      }

      RED.log.debug(`Alexa Switch Node '${node.name}' initialized successfully`);
    } catch (error) {
      RED.log.error(`Failed to initialize Alexa Switch Node: ${error.message}`);
      node.status({ fill: "red", shape: "dot", text: `Init failed: ${error.message}` });
    }
  }

  /**
   * Handle incoming messages for switch control
   * @param {Object} msg - Node-RED message object
   */
  AlexaSwitchNode.prototype.handleInputMessage = function (msg) {
    try {
      // Validate input
      if (!msg || typeof msg !== "object") {
        this.warn("Invalid message received");
        return;
      }

      let isOn = false;

      if (typeof msg.payload === "object" && msg.payload.on !== undefined) {
        isOn = Boolean(msg.payload.on);
      } else {
        // Handle various payload formats
        if (typeof msg.payload === "string") {
          isOn = msg.payload === "1" || msg.payload.toLowerCase() === "on";
        } else if (typeof msg.payload === "number") {
          isOn = msg.payload === 1;
        } else if (typeof msg.payload === "boolean") {
          isOn = msg.payload;
        }
        msg.payload = {}; // Reset to object structure
      }

      // Update message payload
      msg.payload.on = isOn;
      msg.payload.bri = isOn ? this.bri : 0;
      msg.payload.command = "switch";

      // Set message metadata
      msg.device_name = this.name;
      msg.light_id = this.id;
      msg.device_type = this.devicetype;

      if (!msg.topic) {
        msg.topic = this.name;
      }

      // Update device state
      this.state = isOn;

      // Update node status
      this.status({ fill: "blue", shape: "dot", text: isOn ? "ON" : "OFF" });

      // Only send output if inputTrigger is false or output is explicitly set
      if (!this.inputTrigger || msg.output === true) {
        this.send(msg);
      }
    } catch (error) {
      this.error(`Error processing message: ${error.message}`, msg);
    }
  };

  // Register the node
  RED.nodes.registerType("alexa-switch", AlexaSwitchNode);
};
