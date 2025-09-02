/**
 * Node-RED Alexa Blinds/Window Covering Node
 * Provides Alexa-compatible window covering/blinds functionality
 */

"use strict";

module.exports = function (RED) {
  const alexaHome = require("../alexa-helper");
  const utils = require("../utils");

  /**
   * Alexa Blinds Node
   * @constructor
   * @param {Object} config - Node-RED configuration object
   */
  function AlexaBlindsNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    try {
      // Initialize core properties
      node.name = config.devicename || "Alexa Blinds";
      node.control = "blinds";
      node.devicetype = "Window covering";
      node.inputTrigger = Boolean(config.inputtrigger);

      // Initialize device state for blinds
      node.initializeBlindsState(config);

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
   * Initialize blinds-specific device state
   * @param {Object} config - Node configuration
   */
  AlexaBlindsNode.prototype.initializeBlindsState = function (config) {
    // Initialize blinds state with position (0-100)
    this.state = {
      on: true, // Blinds are always "available"
      bri: parseInt(config.brightness) || 254, // Maps to position (254 = 100% open)
      position: 100 // Default to fully open
    };

    // Convert brightness to position percentage
    this.state.position = Math.round((this.state.bri / 254) * 100);

    this.debug(`Blinds initialized: position=${this.state.position}%, bri=${this.state.bri}`);
  };

  /**
   * Set up event handlers for the blinds node
   */
  AlexaBlindsNode.prototype.setupEventHandlers = function () {
    // Handle incoming messages
    this.on("input", this.handleInputMessage.bind(this));

    // Handle node close
    this.on("close", this.handleNodeClose.bind(this));

    // Register with controller if available
    this.registerWithController();
  };

  /**
   * Handle incoming messages for blinds control
   * @param {Object} msg - Node-RED message object
   */
  AlexaBlindsNode.prototype.handleInputMessage = function (msg) {
    try {
      // Validate input
      if (!msg || typeof msg !== "object") {
        this.warn("Invalid message received");
        return;
      }

      // Process blinds command
      const processedMsg = this.processBlindsCommand(msg);

      // Only send output if inputTrigger is false or output is explicitly set
      if (!this.inputTrigger || msg.output === true) {
        this.send(processedMsg);
      }

      this.updateStatus(`Position: ${this.state.position}%`, "green");
    } catch (error) {
      this.error(`Message processing failed: ${error.message}`);
      this.updateStatus("Error", "red");
    }
  };

  /**
   * Process blinds-specific commands
   * @param {Object} msg - Input message
   * @returns {Object} Processed message
   */
  AlexaBlindsNode.prototype.processBlindsCommand = function (msg) {
    const payload = msg.payload || {};
    let command = "position";
    let position = this.state.position;

    // Handle brightness to position conversion
    if (payload.bri !== undefined) {
      this.state.bri = Math.max(0, Math.min(254, parseInt(payload.bri) || 0));
      position = Math.round((this.state.bri / 254) * 100);
      this.state.position = position;
      command = "position";
    }

    // Handle direct position commands
    if (payload.position !== undefined) {
      position = Math.max(0, Math.min(100, parseInt(payload.position) || 0));
      this.state.position = position;
      this.state.bri = Math.round((position / 100) * 254);
      command = "position";
    }

    // Handle on/off (open/close) commands
    if (payload.on !== undefined) {
      const isOpen = Boolean(payload.on);
      position = isOpen ? 100 : 0;
      this.state.position = position;
      this.state.bri = isOpen ? 254 : 0;
      this.state.on = true; // Blinds are always "available"
      command = "switch";
    }

    // Create output message
    const outputMsg = {
      topic: msg.topic || this.name,
      device_name: this.name,
      device_type: this.devicetype,
      payload: {
        on: this.state.on,
        bri: this.state.bri,
        position: this.state.position,
        command: command
      }
    };

    this.debug(`Blinds command processed: ${command}, position=${position}%, bri=${this.state.bri}`);
    return outputMsg;
  };

  /**
   * Register with the Alexa controller
   */
  AlexaBlindsNode.prototype.registerWithController = function () {
    const controllerNode = alexaHome.getController();
    if (controllerNode) {
      this.controller = controllerNode;
      controllerNode.registerCommand(this.id, this.name, this.devicetype, this);
      this.debug(`Registered with controller: ${this.name}`);
    } else {
      this.updateStatus("No Controller", "yellow");
      this.debug("No controller found for registration");
    }
  };

  /**
   * Handle node close event
   */
  AlexaBlindsNode.prototype.handleNodeClose = function () {
    if (this.controller) {
      this.controller.deregisterCommand(this.id);
      this.debug(`Deregistered from controller: ${this.name}`);
    }
  };

  /**
   * Update node status display
   * @param {string} text - Status text
   * @param {string} color - Status color
   */
  AlexaBlindsNode.prototype.updateStatus = function (text, color) {
    this.status({
      fill: color,
      shape: "dot",
      text: text
    });
  };

  /**
   * Generate unique ID for the blinds device
   * @returns {string} Unique device ID
   */
  AlexaBlindsNode.prototype.generateUniqueId = function () {
    return utils.generateUniqueId(this.name, this.devicetype);
  };

  // Register the node
  RED.nodes.registerType("alexa-blinds", AlexaBlindsNode);
};
