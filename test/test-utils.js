/**
 * Test utilities for parallel test execution
 */

const crypto = require("crypto");

/**
 * Generate a cryptographically strong random number between min and max (inclusive)
 * Uses Node.js crypto module for better entropy than Math.random()
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
function getSecureRandom(min, max) {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const threshold = maxValue - (maxValue % range);

  let randomValue;
  do {
    const randomBytes = crypto.randomBytes(bytesNeeded);
    randomValue = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      randomValue = (randomValue << 8) + randomBytes[i];
    }
  } while (randomValue >= threshold);

  return (randomValue % range) + min;
}

/**
 * Enhanced random with process-based entropy
 * Combines crypto random with process ID and timestamp for better distribution
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
function getEnhancedRandom(min, max) {
  // Use cryptographically secure, unbiased randomness.
  return getSecureRandom(min, max);
}

/**
 * Generate a random test port in a safe range for testing
 * Uses enhanced randomness to minimize conflicts during parallel execution
 * @param {number} min - Minimum port number (default: 30000)
 * @param {number} max - Maximum port number (default: 65000)
 * @returns {number} Random port number
 */
function getRandomTestPort(min = 30000, max = 65000) {
  return getEnhancedRandom(min, max);
}

/**
 * Generate multiple unique test ports for a single test
 * @param {number} count - Number of ports needed
 * @param {number} min - Minimum port number (default: 30000)
 * @param {number} max - Maximum port number (default: 65000)
 * @returns {number[]} Array of unique port numbers
 */
function getRandomTestPorts(count = 1, min = 30000, max = 65000) {
  const ports = new Set();
  let attempts = 0;
  const maxAttempts = count * 10; // Prevent infinite loops

  while (ports.size < count && attempts < maxAttempts) {
    ports.add(getEnhancedRandom(min, max));
    attempts++;
  }

  // If we couldn't get enough unique ports, fill with crypto random
  while (ports.size < count) {
    ports.add(getSecureRandom(min, max));
  }

  return Array.from(ports);
}

/**
 * Generate a test port with an offset to avoid conflicts within the same test file
 * @param {number} baseOffset - Base offset multiplier (use test index or similar)
 * @param {number} range - Range size for each offset (default: 1000)
 * @returns {number} Port number
 */
function getTestPortWithOffset(baseOffset = 0, range = 1000) {
  const basePort = 30000 + baseOffset * range;
  return basePort + getEnhancedRandom(0, range - 1);
}

/**
 * Generate a port with time-based seed for even better distribution
 * Useful when you need ports that are very unlikely to collide across processes
 * @param {number} min - Minimum port number (default: 30000)
 * @param {number} max - Maximum port number (default: 65000)
 * @returns {number} Random port number
 */
function getTimeBasedPort(min = 30000, max = 65000) {
  const now = Date.now();
  const nanos = process.hrtime.bigint();
  const pid = process.pid;

  // Create a unique seed combining timestamp, nanoseconds, and process ID
  const seed = Number(nanos) ^ now ^ (pid << 16);
  const range = max - min + 1;

  return (Math.abs(seed) % range) + min;
}

module.exports = {
  getRandomTestPort,
  getRandomTestPorts,
  getTestPortWithOffset,
  getTimeBasedPort,
  getSecureRandom,
  getEnhancedRandom,
};
