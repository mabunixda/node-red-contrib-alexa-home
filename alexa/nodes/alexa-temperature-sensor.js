/**
 * Node-RED Alexa Temperature Sensor Node
 * Provides Alexa-compatible temperature sensor functionality
 */

"use strict";

module.exports = function (RED) {
  const alexaHome = require("../alexa-helper");
  const utils = require("../utils");

  /**
   * Alexa Temperature Sensor Node
   * @constructor
   * @param {Object} config - Node-RED configuration object
   */
  function AlexaTemperatureSensorNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    try {
      // Initialize core properties
      node.name = config.devicename || "Alexa Temperature Sensor";
      node.control = "temperature";
      node.devicetype = "Temperature sensor"; // Device type for display
      node.inputTrigger = Boolean(config.inputtrigger);
      node.scale = config.scale || "CELSIUS";

      // Initialize device state for temperature sensor
      node.initializeTemperatureSensorState(config);

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
   * Initialize temperature sensor-specific device state
   * @param {Object} config - Node configuration
   */
  AlexaTemperatureSensorNode.prototype.initializeTemperatureSensorState = function (config) {
    // Initialize temperature sensor state
    const temperature = parseFloat(config.temperature) || 20.0; // Default 20°C

    this.state = {
      temperature: temperature,
      on: true // Temperature sensors are always "on"
    };
    this.temperature = temperature; // Keep for backwards compatibility
    this.temperatureScale = this.scale;
    this.bri = Math.round((temperature + 50) * 2.54); // Convert to brightness scale
    this.uniqueid = this.generateUniqueId();

    this.debug(`Temperature sensor initialized: ${temperature}°${this.temperatureScale}`);
  };

  /**
   * Set up event handlers for the temperature sensor node
   */
  AlexaTemperatureSensorNode.prototype.setupEventHandlers = function () {
    // Handle incoming messages
    this.on("input", this.handleInputMessage.bind(this));

    // Handle node close
    this.on("close", this.handleNodeClose.bind(this));

    // Register with controller if available
    this.registerWithController();
  };

  /**
   * Handle incoming messages for temperature sensor updates
   * @param {Object} msg - Node-RED message object
   */
  AlexaTemperatureSensorNode.prototype.handleInputMessage = function (msg) {
    try {
      // Validate input
      if (!msg || typeof msg !== "object") {
        this.warn("Invalid message received");
        return;
      }

      // Process temperature sensor command
      const processedMsg = this.processTemperatureSensorCommand(msg);

      // Only send output if inputTrigger is false or output is explicitly set
      if (!this.inputTrigger || msg.output === true) {
        this.send(processedMsg);
      }

      this.updateStatus(`${this.temperature}°${this.temperatureScale}`, "green");
    } catch (error) {
      this.error(`Message processing failed: ${error.message}`);
      this.updateStatus("Error", "red");
    }
  };

  /**
   * Process temperature sensor-specific commands
   * @param {Object} msg - Input message
   * @returns {Object} Processed message
   */
  AlexaTemperatureSensorNode.prototype.processTemperatureSensorCommand = function (msg) {
    const payload = msg.payload || {};
    let command = "temperature";

    // Handle temperature updates
    if (payload.temperature !== undefined) {
      let temperature = parseFloat(payload.temperature) || 0;

      // Handle scale conversion if input has different scale than node's configured scale
      if (payload.scale !== undefined) {
        const inputScale = payload.scale.toString().toUpperCase();
        if ((inputScale === "CELSIUS" || inputScale === "FAHRENHEIT") && inputScale !== this.scale) {
          // Convert input temperature to node's configured scale
          if (inputScale === "CELSIUS" && this.scale === "FAHRENHEIT") {
            temperature = (temperature * 9/5) + 32;
          } else if (inputScale === "FAHRENHEIT" && this.scale === "CELSIUS") {
            temperature = (temperature - 32) * 5/9;
          }
        }
      }

      this.temperature = temperature;
      command = "temperature";
    }

    // Handle scale changes without temperature (change node's scale)
    if (payload.scale !== undefined && payload.temperature === undefined) {
      const newScale = payload.scale.toString().toUpperCase();
      if (newScale === "CELSIUS" || newScale === "FAHRENHEIT") {
        // Convert existing temperature if scale changed
        if (this.scale !== newScale) {
          if (this.scale === "CELSIUS" && newScale === "FAHRENHEIT") {
            this.temperature = (this.temperature * 9/5) + 32;
          } else if (this.scale === "FAHRENHEIT" && newScale === "CELSIUS") {
            this.temperature = (this.temperature - 32) * 5/9;
          }
          this.scale = newScale;
          this.temperatureScale = newScale;
        }
      }
    }

    // Create output message
    const outputMsg = {
      topic: msg.topic || this.name,
      device_name: this.name,
      device_type: this.devicetype,
      payload: {
        on: this.state.on, // Always true for sensors
        temperature: this.temperature,
        scale: this.temperatureScale,
        command: command
      }
    };

    this.debug(`Temperature sensor command processed: ${this.temperature}°${this.temperatureScale}`);
    return outputMsg;
  };

  /**
   * Register with the Alexa controller
   */
  AlexaTemperatureSensorNode.prototype.registerWithController = function () {
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
  AlexaTemperatureSensorNode.prototype.updateController = function (controllerNode) {
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
  AlexaTemperatureSensorNode.prototype.handleNodeClose = function () {
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
  AlexaTemperatureSensorNode.prototype.updateStatus = function (text, color) {
    this.status({
      fill: color,
      shape: "dot",
      text: text
    });
  };

  /**
   * Generate unique ID for the temperature sensor device
   * @returns {string} Unique device ID
   */
  AlexaTemperatureSensorNode.prototype.generateUniqueId = function () {
    return utils.generateUniqueId(this.name, this.devicetype);
  };

  // Register the node
  RED.nodes.registerType("alexa-temperature-sensor", AlexaTemperatureSensorNode);
};
