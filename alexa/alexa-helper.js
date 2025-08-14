"use strict";

const { isValidPort } = require("./utils");

/**
 * AlexaHelper - Configuration and utility constants for Alexa Home integration
 * Provides centralized configuration management with environment variable support
 */
class AlexaHelper {
  constructor() {
    this.hubPort = this.parseHubPort();
    this.controllerNode = undefined;
    this.isDebug = this.parseDebugMode();
    this.briDefault = this.parseBrightnessDefault();
    this.prefixUUID = "f6543a06-da50-11ba-8d8f-";
  }

  /**
   * Parse hub port from environment with validation
   */
  parseHubPort() {
    const envPort = process.env.ALEXA_PORT;
    if (envPort !== undefined) {
      const port = parseInt(envPort, 10);
      if (!isValidPort(port)) {
        throw new Error(`Invalid ALEXA_PORT environment variable: ${envPort}`);
      }
      return port;
    }
    return 80;
  }

  /**
   * Parse debug mode from environment
   */
  parseDebugMode() {
    return (
      (process.env.DEBUG &&
        process.env.DEBUG.indexOf("node-red-contrib-alexa-home") > -1) ||
      false
    );
  }

  /**
   * Parse default brightness with backward compatibility
   */
  parseBrightnessDefault() {
    // Maintain backward compatibility - return string from environment
    return process.env.BRI_DEFAULT || 254;
  }

  /**
   * Get configuration object for compatibility
   */
  getConfig() {
    return {
      hubPort: this.hubPort,
      controllerNode: this.controllerNode,
      isDebug: this.isDebug,
      bri_default: this.briDefault,
      prefixUUID: this.prefixUUID,
    };
  }

  /**
   * Set controller node reference
   */
  setControllerNode(node) {
    this.controllerNode = node;
  }

  /**
   * Validate environment configuration
   */
  validateEnvironment() {
    const errors = [];

    try {
      this.parseHubPort();
    } catch (error) {
      errors.push(error.message);
    }

    // Note: BRI_DEFAULT validation removed for backward compatibility

    return errors;
  }
}

// Create singleton instance for backward compatibility
const helperInstance = new AlexaHelper();

// Export both class and compatibility object
module.exports = {
  ...helperInstance.getConfig(),
  AlexaHelper,
  instance: helperInstance,
};
