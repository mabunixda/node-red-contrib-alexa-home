/**
 * Test utilities for parallel test execution
 */

/**
 * Generate a random test port in a safe range for testing
 * Uses a wide range to minimize conflicts during parallel execution
 * @param {number} min - Minimum port number (default: 50000)
 * @param {number} max - Maximum port number (default: 65000)
 * @returns {number} Random port number
 */
function getRandomTestPort(min = 50000, max = 65000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate multiple unique test ports for a single test
 * @param {number} count - Number of ports needed
 * @param {number} min - Minimum port number (default: 50000)
 * @param {number} max - Maximum port number (default: 65000)
 * @returns {number[]} Array of unique port numbers
 */
function getRandomTestPorts(count = 1, min = 50000, max = 65000) {
  const ports = new Set();
  while (ports.size < count) {
    ports.add(getRandomTestPort(min, max));
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
  const basePort = 50000 + baseOffset * range;
  return basePort + Math.floor(Math.random() * range);
}

module.exports = {
  getRandomTestPort,
  getRandomTestPorts,
  getTestPortWithOffset,
};
// Test comment
