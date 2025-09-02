/**
 * Test utilities for parallel test execution
 */

const net = require('net');

/**
 * Check if a port is available synchronously
 * @param {number} port - Port number to check
 * @returns {boolean} True if port is available, false if in use
 */
function isPortAvailable(port) {
  try {
    const server = net.createServer();
    server.listen(port, '127.0.0.1');
    server.close();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a random test port in a safe range for testing with availability check
 * Uses a wide range to minimize conflicts during parallel execution
 * @param {number} min - Minimum port number (default: 30000)
 * @param {number} max - Maximum port number (default: 65000)
 * @param {number} maxAttempts - Maximum attempts to find an available port (default: 100)
 * @returns {number} Available random port number
 */
function getRandomTestPort(min = 30000, max = 65000, maxAttempts = 100) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = Math.floor(Math.random() * (max - min + 1)) + min;
    if (isPortAvailable(port)) {
      return port;
    }
  }

  // Fallback: if no available port found, return a random port and let the test handle the conflict
  console.warn(`Warning: Could not find an available port after ${maxAttempts} attempts. Returning random port.`);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate multiple unique test ports for a single test with availability check
 * @param {number} count - Number of ports needed
 * @param {number} min - Minimum port number (default: 30000)
 * @param {number} max - Maximum port number (default: 65000)
 * @returns {number[]} Array of unique available port numbers
 */
function getRandomTestPorts(count = 1, min = 30000, max = 65000) {
  const ports = new Set();
  let attempts = 0;
  const maxAttempts = count * 50; // Allow more attempts for multiple ports

  while (ports.size < count && attempts < maxAttempts) {
    const port = getRandomTestPort(min, max, 10); // Fewer attempts per port when getting multiple
    if (!ports.has(port)) {
      ports.add(port);
    }
    attempts++;
  }

  if (ports.size < count) {
    console.warn(`Warning: Could only find ${ports.size} available ports out of ${count} requested.`);
  }

  return Array.from(ports);
}

/**
 * Generate a test port with an offset from a base port with availability check
 * @param {number} basePort - Base port number
 * @param {number} offset - Offset to add to base port
 * @returns {number} Port number (basePort + offset) if available, or a random available port
 */
function getTestPortWithOffset(basePort, offset) {
  const targetPort = basePort + offset;

  // Check if the target port is available
  if (isPortAvailable(targetPort)) {
    return targetPort;
  }

  // If target port is not available, find an alternative near the target
  console.warn(`Port ${targetPort} not available, finding alternative...`);

  // Try ports in a range around the target port
  const rangeSize = 100;
  const minPort = Math.max(targetPort - rangeSize, 30000);
  const maxPort = Math.min(targetPort + rangeSize, 65000);

  return getRandomTestPort(minPort, maxPort, 50);
}

module.exports = {
  getRandomTestPort,
  getRandomTestPorts,
  getTestPortWithOffset,
};
