#!/usr/bin/env node

/**
 * Test script to verify the fix for GitHub issue #143
 * Tests that hue/sat color commands are processed correctly
 */

const alexaHomeModule = require('./alexa/alexa-home.js');

// Mock RED environment
const mockRED = {
  nodes: {
    createNode: function(node, config) {
      node.id = config.id || 'test-node';
      node.name = config.devicename || 'Test Device';
      node.on = function() {};
      node.send = function() {};
      node.warn = function() {};
      node.error = function() {};
    },
    registerType: function() {}
  },
  log: {
    debug: function(msg) { console.log('DEBUG:', msg); },
    info: function(msg) { console.log('INFO:', msg); },
    warn: function(msg) { console.log('WARN:', msg); }
  }
};

// Create the node constructor
const AlexaHomeNode = alexaHomeModule(mockRED);

// Test configurations
const testCases = [
  {
    name: "RED color (working case from issue)",
    payload: { on: true, hue: 0, sat: 254, bri: 254 }
  },
  {
    name: "BLUE color (failing case from issue)",
    payload: { on: true, hue: 43690, sat: 254, bri: 254 }
  },
  {
    name: "GREEN color",
    payload: { on: true, hue: 21845, sat: 254, bri: 254 }
  },
  {
    name: "YELLOW color",
    payload: { on: true, hue: 10923, sat: 254, bri: 254 }
  }
];

console.log("Testing GitHub Issue #143 Fix - Hue/Saturation Color Commands\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Input:  ${JSON.stringify(testCase.payload)}`);

  // Create a test node
  const config = {
    devicename: "Test Light",
    devicetype: "Extended color light"
  };

  const node = new AlexaHomeNode(config);

  // Mock controller to prevent errors
  node.controller = { deregisterCommand: function() {} };

  // Override send to capture output
  let outputMessage = null;
  node.send = function(msg) {
    outputMessage = msg;
  };

  // Override status setting
  node.setConnectionStatusMsg = function() {};

  try {
    // Process the message
    const inputMsg = { payload: testCase.payload, output: true };
    node.receive(inputMsg);

    if (outputMessage) {
      console.log(`Output: ${JSON.stringify(outputMessage.payload)}`);
      console.log(`Command: ${outputMessage.payload.command}`);
      console.log(`Node State - Hue: ${node.hue}, Sat: ${node.sat}`);

      if (outputMessage.payload.command === 'color') {
        console.log('✅ SUCCESS: Processed as color command');
      } else {
        console.log('❌ FAILED: Not processed as color command');
      }
    } else {
      console.log('❌ FAILED: No output message generated');
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }

  console.log('-'.repeat(50));
});

console.log("\nFix Summary:");
console.log("- Added support for hue/sat color commands alongside existing xy coordinates");
console.log("- Added validation for hue (0-65535) and saturation (0-254) values");
console.log("- Updated device state to track current hue/sat values");
console.log("- Updated controller API to return actual hue/sat values instead of hardcoded ones");
console.log("\nThis should resolve the issue where Alexa reported 'device not working properly'");
console.log("for colors other than red when using hue/sat commands.");
