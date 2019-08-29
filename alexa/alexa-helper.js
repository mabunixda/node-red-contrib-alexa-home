'use strict';

module.exports = {
  hubPort: ( process.env.ALEXA_PORT != undefined
             &&
             parseInt(process.env.ALEXA_PORT)
  )
           || 60000,
  controllerNode: undefined,
  isDebug: ( process.env.DEBUG
             &&
             process.env.DEBUG.indexOf('node-red-contrib-alexa-home') > 0
  )
           || false,
  bri_default: process.env.BRI_DEFAULT || 126,
};
