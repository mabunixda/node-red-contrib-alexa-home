module.exports = function (RED) {

    "use strict";
    var alexa_home = require('./alexa-helper');

    function AlexaHomeNode(config) {

        RED.nodes.createNode(this, config);

        var node = this;
        node.control = config.control;
        node.name = config.devicename;
        if (config.devicetype) {
            node.devicetype = config.devicetype;
        } else {
            node.devicetype = "Extended color light"
        }
        node.inputTrigger = config.inputtrigger;
        node.state = false;
        node.bri = 0;

        node.on('input', function (msg) {
            msg.inputTrigger = true;
            node.processCommand(msg);
        });

        node.on('close', function (done) {
            if (node.controller) {
                node.controller.deregisterCommand(node);
            }
            done();
        })

        if (alexa_home.controllerNode) {
            alexa_home.controllerNode.registerCommand(node);
            return;
        }
        RED.log.debug("No Alexa Home Controller available")
        node.setConnectionStatusMsg("red", "No Alexa Home Controller available");
    }

    AlexaHomeNode.prototype.setConnectionStatusMsg = function (color, text, shape) {
        shape = shape || 'dot';
        this.status({
            fill: color,
            shape: shape,
            text: text
        });
    }

    AlexaHomeNode.prototype.updateController = function (controllerNode) {
        var node = this;
        node.controller = controllerNode;
        node.setConnectionStatusMsg("green", "Ok")
    }

    AlexaHomeNode.prototype.processCommand = function (msg) {
        var node = this;

        if (node.controller == null || node.controller == undefined) {
            node.warn("Ignoring process command - no controller available!");
            node.setConnectionStatusMsg("red", "No Alexa Home Controller available");
            return;
        }
        //Detect increase/decrease command
        msg.change_direction = 0;
        if (msg.payload.bri) {
            if (msg.payload.bri == alexa_home.bri_default - 64) //magic number
                msg.change_direction = -1;
            if (msg.payload.bri == alexa_home.bri_default + 63) //magic number
                msg.change_direction = 1;
        }

        //Dimming or Temperature command
        if (msg.payload.bri) {
            RED.log.debug(this.name + " - Setting values on bri");
            msg.payload.on = msg.payload.bri > 0;

            node.setConnectionStatusMsg("blue",
                "dot",
                "bri:" + msg.payload.bri
            );
        }
        //On/off command
        else {
            RED.log.debug(this.name + " - Setting values on On/Off");
            var isOn = false;
            if (typeof msg.payload === "object") {
                isOn = msg.payload.on
            } else {
                if (typeof msg.payload === "string") {
                    isOn = msg.payload === "1" || msg.payload === "on";
                } else if (typeof msg.payload === "number") {
                    isOn = msg.payload === 1;
                } else {
                    node.setConnectionStatusMsg("orange", "could not process input msg");
                    return;
                }
                msg.payload = {};
            }
            msg.payload.on = isOn;
            msg.payload.bri = isOn ? 255.0 : 0.0;

            //Node status
            node.setConnectionStatusMsg(
                "blue",
                (isOn ? "On" : "Off")
            );
        }
        msg.payload.bri_normalized = msg.payload.bri / 255.0 * 100.0;

        msg.device_name = this.name;
        msg.light_id = this.id;

        node.state = msg.payload.on;
        node.bri = msg.payload.bri;

        if (msg.inputTrigger) {
            RED.log.debug(this.name + " - Set values on input");
            return;
        }

        RED.log.debug(this.name + " - sending values");

        node.send(msg);
    }

    RED.nodes.registerType("alexa-home", AlexaHomeNode);

}