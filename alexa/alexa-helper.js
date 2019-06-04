"use strict";

module.exports = {
    controllerNode: undefined,
    isDebug: process.env.DEBUG && process.env.DEBUG.indexOf("node-red-contrib-alexa-home") > 0 || false,
    bri_default: process.env.BRI_DEFAULT || 126,
    prefixUUID: "f6543a06-da50-11ba-8d8f-",
    HUE_USERNAME: "1028d66426293e821ecfd9ef1a0731df",
    nodeSubPath : ""
}

module.exports.formatUUID = function (lightId) {
    if (lightId === null || lightId === undefined)
        return "";

    var string = ("" + lightId);
    return string.replace(".", "").trim();
}

module.exports.formatHueBridgeUUID = function (lightId) {
    if (lightId === null || lightId === undefined)
        return "";
    var uuid = module.exports.prefixUUID;
    uuid += module.exports.formatUUID(lightId);
    return uuid;
}


