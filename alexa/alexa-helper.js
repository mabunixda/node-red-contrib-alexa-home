'use strict'

module.exports = {
  hubPort: (process.env.ALEXA_PORT !== undefined &&
             parseInt(process.env.ALEXA_PORT)
  ) ||
           80,
  controllerNode: undefined,
  isDebug: (process.env.DEBUG &&
             process.env.DEBUG.indexOf('node-red-contrib-alexa-home') > 0
  ) ||
           false,
  bri_default: process.env.BRI_DEFAULT || 254,
  prefixUUID: 'f6543a06-da50-11ba-8d8f-',

  AlexaIPAddress: function (req) {
    if (req.headers['x-forwarded-for'] !== undefined) {
      return req.headers['x-forwarded-for']
    }
    if (req.socket.remoteAddress !== undefined) {
      return req.socket.remoteAddress
    }
    if (req.connection.remoteAddress !== undefined) {
      return req.connection.remoteAddress
    }
    if ((req.connection.socket) && (req.connection.socket.remoteAddress)) {
      return req.connection.socket.remoteAddress
    }
    return undefined
  }
}
