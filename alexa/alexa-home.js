/**
 * Modern Node-RED Alexa Home Device Node
 * Provides Alexa-compatible smart home device functionality with enhanced validation and error handling
 */

"use strict";

module.exports = function (RED) {
  const alexaHome = require("./alexa-helper");
  const utils = require("./utils");

  // Device type constants for better maintainability
  const DEVICE_TYPES = {
    LIGHT: "Extended color light",
    SWITCH: "On/Off plug-in unit",
    DIMMER: "Dimmable light",
    COLOR: "Color light",
  };

  // Default color coordinates (warm white)
  const DEFAULT_XY_COORDINATES = [0.3127, 0.329];

  // Validation constants
  const BRIGHTNESS_RANGE = { MIN: 0, MAX: 254 };
  const XY_RANGE = { MIN: 0.0, MAX: 1.0 };

  /**
   * Modern Alexa Home Device Node with enhanced features
   * @constructor
   * @param {Object} config - Node-RED configuration object
   */
  function AlexaHomeNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    try {
      // Initialize core properties with validation
      node.name = config.devicename || "Alexa Device";
      node.control = config.control || "lights";
      node.devicetype = node.validateDeviceType(config.devicetype);
      node.inputTrigger = Boolean(config.inputtrigger);

      // Initialize device state
      node.initializeDeviceState(config);

      // Set up event handlers
      node.setupEventHandlers();

      // Register with controller
      node.registerWithController();

      RED.log.debug(`Alexa Home Node '${node.name}' initialized successfully`);
    } catch (error) {
      RED.log.error(`Failed to initialize Alexa Home Node: ${error.message}`);
      node.setConnectionStatusMsg("red", `Init failed: ${error.message}`);
    }
  }

  /**
   * Validates and sets the device type
   * @param {string} deviceType - Device type from configuration
   * @returns {string} Valid device type
   */
  AlexaHomeNode.prototype.validateDeviceType = function (deviceType) {
    const validTypes = Object.values(DEVICE_TYPES);
    if (deviceType && validTypes.includes(deviceType)) {
      return deviceType;
    }
    return DEVICE_TYPES.LIGHT; // Default fallback
  };

  /**
   * Initialize device state properties
   * @param {Object} config - Configuration object
   */
  AlexaHomeNode.prototype.initializeDeviceState = function (config) {
    this.state = false;
    this.bri = alexaHome.bri_default || 254;
    this.hue = 0;
    this.sat = 0;
    this.ct = 200;
    this.xy = [...DEFAULT_XY_COORDINATES];
    this.uniqueid = this.generateUniqueId(config.id);
    this.friendlyName = this.name;
  };

  /**
   * Set up event handlers for the node
   */
  AlexaHomeNode.prototype.setupEventHandlers = function () {
    const node = this;

    node.on("input", function (msg) {
      try {
        msg.inputTrigger = true;
        node.processCommand(msg);
      } catch (error) {
        RED.log.error(`Input processing error: ${error.message}`);
        node.setConnectionStatusMsg("red", "Input error");
      }
    });

    node.on("close", function (done) {
      try {
        if (node.controller) {
          node.controller.deregisterCommand(node);
        }
        RED.log.debug(`Alexa Home Node '${node.name}' closed successfully`);
        done();
      } catch (error) {
        RED.log.warn(`Error during node cleanup: ${error.message}`);
        done();
      }
    });
  };

  /**
   * Register this device with the Alexa Home Controller
   */
  AlexaHomeNode.prototype.registerWithController = function () {
    const controller = alexaHome.controllerNode;

    if (controller) {
      controller.registerCommand(this);
      this.setConnectionStatusMsg("green", "Connected");
    } else {
      RED.log.debug("No Alexa Home Controller available");
      this.setConnectionStatusMsg("red", "No Alexa Home Controller available");
    }
  };

  /**
   * Set connection status message with enhanced formatting
   * @param {string} color - Status color (red, yellow, green, blue, etc.)
   * @param {string} text - Status text
   * @param {string} shape - Status shape (dot, ring, etc.)
   */
  AlexaHomeNode.prototype.setConnectionStatusMsg = function (
    color,
    text,
    shape = "dot",
  ) {
    this.status({
      fill: color,
      shape,
      text: `${this.name}: ${text}`,
    });
  };

  /**
   * Update controller reference with enhanced validation
   * @param {Object} controllerNode - Controller node instance
   */
  AlexaHomeNode.prototype.updateController = function (controllerNode) {
    if (!controllerNode) {
      this.warn("Attempted to update with invalid controller");
      return;
    }

    this.controller = controllerNode;
    this.setConnectionStatusMsg("green", "Connected");
    RED.log.debug(`Device '${this.name}' connected to controller`);
  };

  /**
   * Enhanced command processing with comprehensive validation and error handling
   * @param {Object} msg - Message object containing payload with device commands
   * @param {Object} msg.payload - Command payload (on/off, brightness, color, etc.)
   * @param {boolean} msg.inputTrigger - Whether triggered from input vs Alexa
   */
  AlexaHomeNode.prototype.processCommand = function (msg) {
    const node = this;

    try {
      // Comprehensive input validation
      const validationResult = node.validateMessage(msg);
      if (!validationResult.isValid) {
        node.handleValidationError(validationResult.error);
        return;
      }

      // Controller availability check
      if (!node.controller) {
        node.warn("Ignoring process command - no controller available!");
        node.setConnectionStatusMsg("red", "No Controller");
        return;
      }

      // Process different command types
      const processedMsg = node.processCommandPayload(msg);

      // Update device state
      node.updateDeviceState(processedMsg);

      // Send output if appropriate
      if (node.shouldSendOutput(processedMsg)) {
        RED.log.debug(`${node.name} - Sending processed command to output`);
        node.send(processedMsg);
      }
    } catch (error) {
      RED.log.error(
        `Command processing error in ${node.name}: ${error.message}`,
      );
      node.setConnectionStatusMsg("red", "Processing Error");
    }
  };

  /**
   * Validate incoming message structure and content
   * @param {Object} msg - Message to validate
   * @returns {Object} Validation result with isValid flag and error details
   */
  AlexaHomeNode.prototype.validateMessage = function (msg) {
    if (!msg) {
      return { isValid: false, error: "Message is null or undefined" };
    }

    if (msg.payload === null || msg.payload === undefined) {
      return { isValid: false, error: "Message payload is missing" };
    }

    return { isValid: true };
  };

  /**
   * Handle validation errors consistently
   * @param {string} error - Error message
   */
  AlexaHomeNode.prototype.handleValidationError = function (error) {
    this.warn(`Validation error: ${error}`);
    this.setConnectionStatusMsg("orange", "Invalid Input");
  };
  /**
   * Process command payload and determine command type
   * @param {Object} msg - Original message
   * @returns {Object} Processed message with command information
   */
  AlexaHomeNode.prototype.processCommandPayload = function (msg) {
    const node = this;

    // Initialize change direction tracking
    msg.change_direction = 0;

    // Process color commands first (color with brightness should be treated as color)
    if (msg.payload.xy || (msg.payload.hue !== undefined && msg.payload.sat !== undefined)) {
      return node.processColorCommand(msg);
    }

    // Process brightness commands
    if (msg.payload.bri !== undefined) {
      return node.processBrightnessCommand(msg);
    }

    // Process on/off commands
    return node.processOnOffCommand(msg);
  };

  /**
   * Process brightness/dimming commands
   * @param {Object} msg - Message with brightness payload
   * @returns {Object} Processed message
   */
  AlexaHomeNode.prototype.processBrightnessCommand = function (msg) {
    const brightness = this.validateBrightness(msg.payload.bri);
    if (brightness === null) {
      throw new Error(`Invalid brightness value: ${msg.payload.bri}`);
    }

    // Determine change direction
    if (brightness < this.bri) {
      msg.change_direction = -1;
    } else if (brightness > this.bri) {
      msg.change_direction = 1;
    }

    msg.payload.bri = brightness;
    msg.payload.on = brightness > 0;
    msg.payload.command = "dim";

    RED.log.debug(
      `${this.name} - Processing brightness command: ${brightness}`,
    );
    this.setConnectionStatusMsg("blue", `Brightness: ${brightness}`);

    return msg;
  };

  /**
   * Process color commands
   * @param {Object} msg - Message with color payload
   * @returns {Object} Processed message
   */
  AlexaHomeNode.prototype.processColorCommand = function (msg) {
    msg.payload.command = "color";

    // Color commands should also set device to on and use current brightness
    msg.payload.on = msg.payload.on !== undefined ? msg.payload.on : true;
    msg.payload.bri = msg.payload.bri !== undefined ? msg.payload.bri : this.bri;

    // Handle different color input formats
    if (msg.payload.xy) {
      // XY coordinates provided
      const coordinates = this.validateColorCoordinates(msg.payload.xy);
      msg.payload.xy = coordinates;
      this.xy = coordinates;

      RED.log.debug(
        `${this.name} - Processing XY color command: [${coordinates.join(", ")}]`,
      );
      this.setConnectionStatusMsg("blue", `Color XY: [${coordinates.join(", ")}]`);
    } else if (msg.payload.hue !== undefined && msg.payload.sat !== undefined) {
      // Hue/Saturation provided (Alexa's preferred format)
      const hue = this.validateHue(msg.payload.hue);
      const sat = this.validateSaturation(msg.payload.sat);

      // Update device state with validated values
      this.hue = hue;
      this.sat = sat;
      msg.payload.hue = hue;
      msg.payload.sat = sat;

      RED.log.debug(
        `${this.name} - Processing HSB color command: H=${hue}, S=${sat}`,
      );
      this.setConnectionStatusMsg("blue", `Color HSB: H=${hue}, S=${sat}`);
    }

    return msg;
  };

  /**
   * Process on/off commands
   * @param {Object} msg - Message with on/off payload
   * @returns {Object} Processed message
   */
  AlexaHomeNode.prototype.processOnOffCommand = function (msg) {
    let isOn = false;

    if (typeof msg.payload === "object" && msg.payload.on !== undefined) {
      isOn = Boolean(msg.payload.on);
    } else {
      // Handle various payload formats
      isOn = this.parseOnOffValue(msg.payload);
      msg.payload = {}; // Reset to object structure
    }

    msg.payload.on = isOn;
    msg.payload.bri = this.bri;
    msg.payload.command = "switch";

    RED.log.debug(
      `${this.name} - Processing switch command: ${isOn ? "ON" : "OFF"}`,
    );
    this.setConnectionStatusMsg("blue", isOn ? "ON" : "OFF");

    return msg;
  };
  /**
   * Validate brightness value
   * @param {*} value - Brightness value to validate
   * @returns {number|null} Valid brightness or null if invalid
   */
  AlexaHomeNode.prototype.validateBrightness = function (value) {
    const brightness = parseInt(value, 10);
    if (
      isNaN(brightness) ||
      brightness < BRIGHTNESS_RANGE.MIN ||
      brightness > BRIGHTNESS_RANGE.MAX
    ) {
      return null;
    }
    return brightness;
  };

  /**
   * Validate and normalize color coordinates
   * @param {Array} coordinates - XY color coordinates
   * @returns {Array} Valid coordinates
   */
  AlexaHomeNode.prototype.validateColorCoordinates = function (coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return [...DEFAULT_XY_COORDINATES];
    }

    return [
      Math.max(
        XY_RANGE.MIN,
        Math.min(XY_RANGE.MAX, parseFloat(coordinates[0]) || 0),
      ),
      Math.max(
        XY_RANGE.MIN,
        Math.min(XY_RANGE.MAX, parseFloat(coordinates[1]) || 0),
      ),
    ];
  };

  /**
   * Validate and normalize hue value
   * @param {number} hue - Hue value (0-65535 for Philips Hue compatibility)
   * @returns {number} Valid hue value
   */
  AlexaHomeNode.prototype.validateHue = function (hue) {
    const numericHue = parseInt(hue) || 0;
    return Math.max(0, Math.min(65535, numericHue));
  };

  /**
   * Validate and normalize saturation value
   * @param {number} sat - Saturation value (0-254 for Philips Hue compatibility)
   * @returns {number} Valid saturation value
   */
  AlexaHomeNode.prototype.validateSaturation = function (sat) {
    const numericSat = parseInt(sat) || 0;
    return Math.max(0, Math.min(254, numericSat));
  };

  /**
   * Parse various on/off value formats
   * @param {*} value - Value to parse
   * @returns {boolean} Boolean on/off state
   */
  AlexaHomeNode.prototype.parseOnOffValue = function (value) {
    if (typeof value === "string") {
      return value === "1" || value.toLowerCase() === "on";
    }
    if (typeof value === "number") {
      return value === 1;
    }
    if (typeof value === "boolean") {
      return value;
    }
    return false; // Default to off for unknown types
  };

  /**
   * Update device state from processed message
   * @param {Object} msg - Processed message
   */
  AlexaHomeNode.prototype.updateDeviceState = function (msg) {
    // Update normalized brightness
    msg.payload.bri_normalized = Math.round((msg.payload.bri / 254.0) * 100.0);

    // Set message metadata
    msg.device_name = this.name;
    msg.light_id = this.id;

    // Update device state
    this.state = msg.payload.on;
    this.bri = msg.payload.bri;

    if (msg.payload.xy) {
      this.xy = msg.payload.xy;
    }
  };

  /**
   * Determine if output should be sent
   * @param {Object} msg - Message to evaluate
   * @returns {boolean} Whether to send output
   */
  AlexaHomeNode.prototype.shouldSendOutput = function (msg) {
    return !(msg.inputTrigger && !msg.output);
  };

  /**
   * Generate a unique identifier for the device using modern approach
   * @param {string} uuid - Base UUID from node configuration
   * @returns {string} Formatted unique identifier
   */
  AlexaHomeNode.prototype.generateUniqueId = function (uuid) {
    if (!uuid) {
      RED.log.warn("No UUID provided, using fallback");
      uuid = this.id || "default";
    }

    // Use a more robust unique ID generation
    const base = "00:11:22:33:44:55:66:77-88";
    const characters = uuid.replace(/[^a-fA-F0-9]/g, "").split("");
    let index = 0;

    return base.replace(/\d/g, () => {
      if (characters[index]) {
        return characters[index++];
      }
      return Math.floor(Math.random() * 10).toString();
    });
  };

  // Register the node type with Node-RED
  RED.nodes.registerType("alexa-home", AlexaHomeNode);
};
