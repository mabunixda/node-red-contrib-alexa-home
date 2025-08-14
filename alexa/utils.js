/**
 * Utility functions for Node-RED Alexa Home
 * Provides common validation, formatting, and helper functions
 */

"use strict";

/**
 * Validates if a port number is valid
 * @param {number|string} port - Port number to validate
 * @returns {boolean} True if valid port
 */
function isValidPort(port) {
  const portNum = parseInt(port, 10);
  return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
}

/**
 * Safely parses JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Generates a MAC address from a node ID
 * @param {string} id - Node ID
 * @returns {string} Formatted MAC address
 */
function generateMacAddress(id) {
  let i = 9;
  const base = "00:11:22:33:44:55";
  const nodeid = id
    .replace(/[^a-fA-F0-9]/g, "f")
    .toUpperCase()
    .split("");

  return base.replace(/\d/g, () => nodeid.shift() || Math.max(--i, 0));
}

/**
 * Generates a bridge ID from MAC address
 * @param {string} mac - MAC address
 * @returns {string} Bridge ID
 */
function getBridgeIdFromMac(mac) {
  const id = mac.replace(/[:]/g, "");
  return id.slice(0, 6) + "FFFE" + id.slice(6);
}

/**
 * Formats UUID by removing dots and trimming
 * @param {string} lightId - Light ID to format
 * @returns {string} Formatted UUID
 */
function formatUUID(lightId) {
  if (lightId === null || lightId === undefined) {
    return "";
  }
  return String(lightId).replace(/\./g, "").trim();
}

/**
 * Formats a Hue bridge UUID
 * @param {string} lightId - Light ID
 * @param {string} prefix - UUID prefix
 * @returns {string} Formatted Hue bridge UUID
 */
function formatHueBridgeUUID(lightId, prefix) {
  if (lightId === null || lightId === undefined) {
    return "";
  }
  return prefix + formatUUID(lightId);
}

/**
 * Strips excessive whitespace from content
 * @param {string} content - Content to strip
 * @returns {string} Stripped content
 */
function stripWhitespace(content) {
  if (typeof content !== "string") return content;

  return content
    .replace(/ {2,}/g, " ") // Replace multiple spaces with single space
    .replace(/\r?\n/g, "") // Remove line breaks
    .trim();
}

/**
 * Extracts client IP address from request
 * @param {Object} request - Express request object
 * @returns {string|undefined} Client IP address
 */
function getClientIP(request) {
  return (
    request.headers["x-forwarded-for"] ||
    request.socket?.remoteAddress ||
    request.connection?.remoteAddress ||
    request.connection?.socket?.remoteAddress
  );
}

/**
 * Validates device type
 * @param {string} deviceType - Device type to validate
 * @returns {boolean} True if valid device type
 */
function isValidDeviceType(deviceType) {
  const validTypes = ["light", "switch", "dimmer", "color"];
  return validTypes.includes(deviceType);
}

/**
 * Creates a deep clone of an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const copy = {};
    Object.keys(obj).forEach((key) => {
      copy[key] = deepClone(obj[key]);
    });
    return copy;
  }
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttles a function call
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Gets an available port for testing
 * @param {number} min - Minimum port number (default: 3000)
 * @param {number} max - Maximum port number (default: 65535)
 * @returns {Promise<number>} Available port number
 */
function getAvailablePort(min = 3000, max = 65535) {
  return new Promise((resolve, reject) => {
    const net = require("net");
    const server = net.createServer();

    // Try random port first
    const tryPort = Math.floor(Math.random() * (max - min + 1)) + min;

    server.listen(tryPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });

    server.on("error", () => {
      // If random port fails, let the system assign one
      server.listen(0, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
    });

    server.on("error", (err) => {
      reject(err);
    });
  });
}

module.exports = {
  isValidPort,
  safeJsonParse,
  generateMacAddress,
  getBridgeIdFromMac,
  formatUUID,
  formatHueBridgeUUID,
  stripWhitespace,
  getClientIP,
  isValidDeviceType,
  deepClone,
  debounce,
  throttle,
  getAvailablePort,
};
