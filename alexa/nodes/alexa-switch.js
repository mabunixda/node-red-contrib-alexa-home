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
      node.initializeState(config);

      // Set up event handlers
      node.setupEventHandlers();

      // Show initial status
      node.updateStatus("Ready", "green");
    } catch (error) {
      node.error(`Initialization failed: ${error.message}`);
      node.updateStatus("Error", "red");
    }
  }

  /**
   * Initialize switch-specific device state
   * @param {Object} config - Node configuration
   */
  AlexaSwitchNode.prototype.initializeState = function (config) {
    // Initialize device state
    this.state = false; // Default to off
    this.bri = 254; // Full brightness when on (for Hue compatibility)
    this.uniqueid = this.generateUniqueId();
  };

  /**
   * Set up event handlers for the blinds node
   */
  AlexaSwitchNode.prototype.setupEventHandlers = function () {
    // Handle incoming messages
    this.on("input", this.processCommand.bind(this));

    // Handle node close
    this.on("close", this.handleNodeClose.bind(this));

    // Register with controller if available
    this.registerWithController();
  };

  /**
   * Handle incoming messages for switch control
   * @param {Object} msg - Node-RED message object
   */
  AlexaSwitchNode.prototype.processCommand = function (msg) {
    try {
      // Validate input
      if (!msg || typeof msg !== "object") {
        this.warn("Invalid message received");
        return;
      }

      let isOn = false;

      if (
        typeof msg.payload === "object" &&
        msg.payload !== null &&
        msg.payload.on !== undefined
      ) {
        isOn = Boolean(msg.payload.on);
      } else {
        // Handle various payload formats
        if (typeof msg.payload === "string") {
          isOn = msg.payload === "1" || msg.payload.toLowerCase() === "on";
        } else if (typeof msg.payload === "number") {
          isOn = msg.payload === 1;
        } else if (typeof msg.payload === "boolean") {
          isOn = msg.payload;
        } else if (msg.payload === null || msg.payload === undefined) {
          // Explicitly handle null/undefined - default to false
          isOn = false;
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

  /**
   * Register with the Alexa controller
   */
  AlexaSwitchNode.prototype.registerWithController = function () {
    const controllerNode = alexaHome.controllerNode;
    if (controllerNode) {
      this.controller = controllerNode;
      controllerNode.registerCommand(this);
      this.debug(`Registered with controller: ${this.name}`);
    } else {
      this.updateStatus("No Controller", "yellow");
      this.debug("No controller found for registration");
    }
  };

  /**
   * Update controller reference
   * @param {Object} controllerNode - Controller node instance
   */
  AlexaSwitchNode.prototype.updateController = function (controllerNode) {
    if (!controllerNode) {
      this.warn("Attempted to update with invalid controller");
      return;
    }

    this.controller = controllerNode;
    this.updateStatus("Connected", "green");
    this.debug(`Device '${this.name}' connected to controller`);
  };

  /**
   * Handle node close event
   */
  AlexaSwitchNode.prototype.handleNodeClose = function () {
    if (this.controller) {
      this.controller.deregisterCommand(this);
      this.debug(`Deregistered from controller: ${this.name}`);
    }
  };

  /**
   * Update node status display
   * @param {string} text - Status text
   * @param {string} color - Status color
   */
  AlexaSwitchNode.prototype.updateStatus = function (text, color) {
    this.status({
      fill: color,
      shape: "dot",
      text: text,
    });
  };

  /**
   * Generate unique ID for the blinds device
   * @returns {string} Unique device ID
   */
  AlexaSwitchNode.prototype.generateUniqueId = function () {
    return utils.generateUniqueId(this.name, this.devicetype);
  };

  // Register the node
  RED.nodes.registerType("alexa-switch", AlexaSwitchNode);
};
