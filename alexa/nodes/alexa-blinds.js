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
      node.control = "lights"; // Use lights for Alexa compatibility
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
    const brightness = parseInt(config.brightness) || 254;
    const position = Math.round((brightness / 254) * 100);

    this.state = {
      position: position,
      on: true, // Blinds are always "available"
    };
    this.bri = brightness; // Maps to position (254 = 100% open)
    this.position = position; // Position percentage
    this.uniqueid = this.generateUniqueId();

    this.debug(
      `Blinds initialized: position=${this.position}%, bri=${this.bri}`,
    );
  };

  /**
   * Set up event handlers for the blinds node
   */
  AlexaBlindsNode.prototype.setupEventHandlers = function () {
    // Handle incoming messages
    this.on("input", this.processCommand.bind(this));

    // Handle node close
    this.on("close", this.handleNodeClose.bind(this));

    // Register with controller if available
    this.registerWithController();
  };

  /**
   * Handle incoming messages for blinds control
   * @param {Object} msg - Node-RED message object
   */
  AlexaBlindsNode.prototype.processCommand = function (msg) {
    try {
      // Validate input
      if (!msg || typeof msg !== "object") {
        this.warn("Invalid message received");
        return;
      }

      // Process blinds command
      const processedMsg = this.processCommandBlinds(msg);

      // Only send output if inputTrigger is false or output is explicitly set
      if (!this.inputTrigger || msg.output === true) {
        this.send(processedMsg);
      }

      this.updateStatus(`Position: ${this.position}%`, "green");
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
  AlexaBlindsNode.prototype.processCommandBlinds = function (msg) {
    const payload = msg.payload || {};
    let command = "position";
    let position = this.position;

    // Handle brightness to position conversion
    if (payload.bri !== undefined) {
      this.bri = Math.max(0, Math.min(254, parseInt(payload.bri) || 0));
      position = Math.round((this.bri / 254) * 100);
      this.position = position;
      command = "position";
    }

    // Handle direct position commands
    if (payload.position !== undefined) {
      position = Math.max(0, Math.min(100, parseInt(payload.position) || 0));
      this.position = position;
      this.bri = Math.round((position / 100) * 254);
      command = "position";
    }

    // Handle on/off (open/close) commands
    if (payload.on !== undefined) {
      const isOpen = Boolean(payload.on);
      position = isOpen ? 100 : 0;
      this.position = position;
      this.bri = isOpen ? 254 : 0;
      command = "switch";
    }

    // Create output message
    const outputMsg = {
      topic: msg.topic || this.name,
      device_name: this.name,
      device_type: this.devicetype,
      payload: {
        on: this.state,
        bri: this.bri,
        position: this.position,
        command: command,
      },
    };

    this.debug(
      `Blinds command processed: ${command}, position=${position}%, bri=${this.bri}`,
    );
    return outputMsg;
  };

  /**
   * Register with the Alexa controller
   */
  AlexaBlindsNode.prototype.registerWithController = function () {
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
  AlexaBlindsNode.prototype.updateController = function (controllerNode) {
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
  AlexaBlindsNode.prototype.handleNodeClose = function () {
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
  AlexaBlindsNode.prototype.updateStatus = function (text, color) {
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
  AlexaBlindsNode.prototype.generateUniqueId = function () {
    return utils.generateUniqueId(this.name, this.devicetype);
  };

  // Register the node
  RED.nodes.registerType("alexa-blinds", AlexaBlindsNode);
};
