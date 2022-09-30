"use strict";

module.exports = {
  hubPort:
    (process.env.ALEXA_PORT !== undefined &&
      parseInt(process.env.ALEXA_PORT)) ||
    80,
  controllerNode: undefined,
  isDebug:
    (process.env.DEBUG &&
      process.env.DEBUG.indexOf("node-red-contrib-alexa-home") > 0) ||
    false,
  bri_default: process.env.BRI_DEFAULT || 254,
  prefixUUID: "f6543a06-da50-11ba-8d8f-"
};
