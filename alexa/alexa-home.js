module.exports = function (RED) {

    "use strict";
    const HUE_USERNAME = "1028d66426293e821ecfd9ef1a0731df";

    const maximumNodeCount = 25;
    const httpDefaultPort = process.env.ALEXA_PORT || 60000;
    const httpGraceTime = 500;
    const bri_default = process.env.BRI_DEFAULT || 126;
    const bri_step = 25;
    const util = require('util')
    var storage = require('node-persist');

    function AlexaHomeController(config) {

        RED.nodes.createNode(this, config);

        var node = this;
        node.active = true;
        node._commands = {};
        node.port = config.port;
        node.nodeCount = 0;

        var stoppable = require('stoppable');
        var http = require('http');
        node.httpServer = stoppable(http.createServer(function (request, response) {
            node.handleHueApiRequestFunction(request, response, config);
        }), httpGraceTime);

        node.httpServer.on('error', function (error) {
            if (!error) {
                node.setConnectionStatusMsg("red", "unable to start [0] (p:" + node.port + ")")
                return;
            }

            var errorCode = null;
            if (error.code) errorCode = error.code;
            else if (error.errno) errorCode = error.errno;

            var errorText = "";
            if (errorCode) errorText += errorCode;
            else errorText += "unable to start [1]";
            errorText += " (p:" + node.port + ")";
            node.setConnectionStatusMsg("red", errorText, "ring");
            node.error(error);
        });

        node.httpServer.listen(node.port, function (error) {
            if (error) {
                node.setConnectionStatusMsg("red", "unable to start [2] (p:" + node.port + ")", "ring");
                console.error(error);
                return;
            }

            config.httpServer = node.httpSever;
            config.port = node.port;
            //Start discovery service after we know the port number
            node.startSSDP(config);
        });

        node.on('input', function (msg) {
            node.handleEvent(node, config, msg);
        });

        node.on('close', function (removed, doneFunction) {
            if (removed) {
                /// FIXXME clean _commands
            }
            node.httpServer.stop(function () {
                if (typeof doneFunction === 'function')
                    doneFunction();
            });
            setImmediate(function () {
                node.httpServer.emit('close');
            });
        });
    }


    AlexaHomeController.prototype.registerCommand = function (deviceNode) {
        // console.log("registering: " + deviceNode.name);
        this._commands[formatUUID(deviceNode.id)] = deviceNode;
        this.nodeCount += 1;
    }

    AlexaHomeController.prototype.deregisterCommand = function (deviceNode) {
        delete this._commands[formatUUID(deviceNode.id)]
        this.nodeCount -= 1;
    }

    AlexaHomeController.prototype.startSSDP = function (config) {

        if (config.port === null || config.port === undefined || config.port <= 0 || config.port >= 65536) {
            var errorMsg = "port is in valid (" + config.port + ")";
            this.status({
                fill: "red",
                shape: "ring",
                text: errorMsg
            });
            console.error(errorMsg);
            return;
        }

        var ssdp = require("peer-ssdp");
        var peer = ssdp.createPeer();
        peer.on("ready", function () {});
        peer.on("notify", function (headers, address) {});
        peer.on("search", function (headers, address) {
            // console.log("SEARCH: ", headers, address);
            var isValid = headers.ST && headers.MAN == '"ssdp:discover"';
            if (!isValid)
                return;

            var uuid = formatUUID(config.id);
            var hueuuid = formatHueBridgeUUID(config.id);

            peer.reply({
                ST: "urn:schemas-upnp-org:device:basic:1",
                SERVER: "Linux/3.14.0 UPnP/1.0 IpBridge/1.17.0",
                EXT: "",
                USN: "uuid:" + hueuuid,
                "hue-bridgeid": uuid,
                LOCATION: "http://{{networkInterfaceAddress}}:" + config.port + "/upnp/amazon-ha-bridge/setup.xml",
            }, address);
        });
        peer.on("found", function (headers, address) {});
        peer.on("close", function () {});
        peer.start();
    }

    AlexaHomeController.prototype.generateControllerConfig = function () {
        var keys = Object.keys(this._commands);
        var itemCount = keys.length;
        var data = '{ ';
        for (var i = 0; i < itemCount; ++i) {
            var uuid = keys[i];
            data += '"' + uuid + '": ' + this.generateCommandConfig(uuid, this._commands[uuid]);
            if ((i + 1) < itemCount) {
                data += ","
            }
        }
        data = data + " }";
        return data;
    }

    AlexaHomeController.prototype.generateCommandConfig = function (uuid, node) {
        // console.log("node: ", node);
        var state = null;
        if (state === undefined || state === null)
            state = "true";
        else
            state = state ? "true" : "false";

        var fullResponseString = '{"state": ' +
            '{"on": ' + state + ', "bri": ' + bri_default + ',' +
            ' "hue": 15823, "sat": 88, "effect": "none", ' +
            '"alert": "none", "colormode": "ct", "ct": 365, "reachable": true, ' +
            '"xy": [0.4255, 0.3998]}, "type": "Extended color light", ' +
            '"name": "' + node.name + '", ' +
            '"modelid": "LCT004", "manufacturername": "Philips", ' +
            '"uniqueid": "' + uuid + '", ' +
            '"swversion": "65003148", ' +
            '"pointsymbol": {"1": "none", "2": "none", "3": "none", "4": "none", "5": "none", "6": "none", "7": "none", "8": "none"}' +
            '}';

        return fullResponseString;
    }

    AlexaHomeController.prototype.generateBridgeSetupXml = function (lightId, deviceName) {

        //IP Address of this local machine
        var ip = require("ip").address();

        //Unique UUID for each bridge device
        var uuid = formatUUID(lightId);
        var bridgeUUID = formatHueBridgeUUID(lightId);

        //Load setup.xml & replace dynamic values
        var fs = require('fs');
        var setupXml = fs.readFileSync(__dirname + '/setup.xml');
        setupXml = setupXml.toString();
        setupXml = setupXml.replace("IP_ADDRESS_WITH_PORT", ip + ":" + this.port);
        setupXml = setupXml.replace("UUID_UUID_UUID", bridgeUUID);

        return setupXml;
    }

    AlexaHomeController.prototype.handleEvent = function (node, config, msg) {
        if (msg == null || msg.payload === null || msg.payload === undefined) {
            node.status({
                fill: "red",
                shape: "dot",
                text: "invalid payload received"
            });
            return;
        }

        var lightId = formatUUID(config.id);
        var isOnOffCommand = false;

        var briInput = 0;
        msg.payload = "" + msg.payload;
        msg.payload = msg.payload.trim().toLowerCase();
        if (msg.payload === "toggle") {
            isOnOffCommand = true;
        } else if (msg.payload === "on") {
            msg.payload = "on";
            briInput = 100;
            isOnOffCommand = true;
        } else if (msg.payload === "off") {
            msg.payload = "off";
            briInput = 0;
            isOnOffCommand = true;
        } else {
            briInput = Math.round(parseFloat(msg.payload));
            msg.bri = Math.round(parseFloat(msg.payload) / 100.0 * 255.0);
            msg.payload = (msg.bri > 0) ? "on" : "off";
            isOnOffCommand = false;
        }

        msg.on_off_command = isOnOffCommand;

        //Check if we want to trigger the node
        var inputTrigger = false;
        if (config.inputtrigger)
            inputTrigger = config.inputtrigger;
        if (inputTrigger) {
            node.justDoIt(node, config, lightId, msg);
            return;
        }

        //No trigger, simply update the internal 'bri' value
        var bri = Math.round(briInput / 100.0 * 255.0);
        /// FIXXME setLightBriForLightId(lightId, bri);
        node.status({
            fill: "blue",
            shape: "dot",
            text: "updated bri:" + briInput
        });
    }

    AlexaHomeController.prototype.justDoIt = function (uuid, msg) {
        //Node parameters
        var targetNode = this._commands[uuid];
        var deviceName = targetNode.name;
        var httpPort = this.port;

        //Detect increase/decrease command
        msg.change_direction = 0;
        if (msg.bri && msg.bri == bri_default - 64) //magic number
            msg.change_direction = -1;
        if (msg.bri && msg.bri == bri_default + 63) //magic number
            msg.change_direction = 1;

        /// FIXXME
        //Toggle command
        //if (msg.payload === "toggle") {
        //    var state = getLightStateForLightId(uuid);
        //    var isOn = !state;
        //    msg.payload = isOn ? "on" : "off";
        //}

        //Dimming or Temperature command
        if (msg.bri) {
            //Save the last value (raw value)
            /// FIXXME setLightBriForLightId(uuid, msg.bri);

            msg.bri = Math.round(msg.bri / 255.0 * 100.0);
            msg.bri_normalized = msg.bri / 100.0;
            msg.on = msg.bri > 0;
            msg.payload = msg.on ? "on" : "off";

            //Save the last state value
            // setLightStateForLightId(uuid, msg.on);

            //Node status
            targetNode.status({
                fill: "blue",
                shape: "dot",
                text: "bri:" + msg.bri + " (p:" + httpPort + ")"
            });
        }
        //On/off command
        else {
            var isOn = (msg.payload == "on")
            msg.bri = isOn ? 100 : 0;
            msg.bri_normalized = isOn ? 1.0 : 0.0;

            //Save the last state value
            /// FIXXME setLightStateForLightId(uuid, isOn);

            //Restore the previous value before off command
            var savedBri = bri_default; // getLightBriForLightId(uuid);
            if (isOn) {
                if (savedBri && savedBri > 0) {
                    msg.bri = Math.round(savedBri / 255.0 * 100.0);
                    msg.bri_normalized = msg.bri / 100.0;
                }
            }
            //Output the saved bri value for troubleshooting
            else {
                if (savedBri) {
                    msg.saved_bri = Math.round(savedBri / 255.0 * 100.0);
                    msg.save_bri_normalized = msg.saved_bri / 100.0;
                }
            }

            //Node status
            targetNode.status({
                fill: "blue",
                shape: "dot",
                text: "" + msg.payload + " (p:" + httpPort + ")"
            });
        }

        //Add extra device parameters
        msg.device_name = deviceName;
        msg.light_id = uuid;
        msg.port = httpPort;

        //Send the message to next node
        targetNode.send(msg);
    }

    AlexaHomeController.prototype.controlSingleLight = function (lightMatch, request, response) {

        var token = lightMatch[1];
        var uuid = lightMatch[2];
        uuid = uuid.replace("/", "");
	if(this._commands[uuid] === undefined) {
		RED.log.warn("unknown alexa node was requested: " + uuid)
		return
	}

        // console.log("lightMatch: " + token + "|" + uuid);
        var node = this;
        if (request.method == 'PUT') {
            request.on('data', function (chunk) {
                // console.log("Receiving PUT data ", chunk.toString());
                request.data = JSON.parse(chunk);
            });
            request.on('end', function () {
                node.handleAlexaDeviceRequestFunction(request, response, uuid);
            });
        } else {
            // console.log("Sending light " + uuid + " to " + request.connection.remoteAddress);
            var targetNode = this._commands[uuid];
            var lightJson = this.generateCommandConfig(uuid, targetNode);
            response.writeHead(200, {
                'Content-Type': 'application/json'
            });
            response.end(lightJson);
        }
    }
    AlexaHomeController.prototype.handleHueApiRequestFunction = function (request, response, config) {

        var node = this;
        var lightId = formatUUID(node.id);
        var lightMatch = /^\/api\/(\w*)\/lights\/([\w\-]*)/.exec(request.url);
        var authMatch = /^\/api\/(\w*)/.exec(request.url) && (request.method == 'POST');

        //Debug
        // console.log(node.port, request.method, request.url, request.connection.remoteAddress);

        //Control 1 single light
        if (lightMatch) {
            this.controlSingleLight(lightMatch, request, response)
        } else if (authMatch) {
            var responseStr = '[{"success":{"username":"' + HUE_USERNAME + '"}}]';
            console.log("Sending response to " + request.connection.remoteAddress, responseStr);
            this.setConnectionStatusMsg("blue", "auth (p: " + node.port + ")")
            response.writeHead(200, "OK", {
                'Content-Type': 'application/json'
            });
            response.end(responseStr);
        } else if (/^\/api/.exec(request.url)) {
            console.log("Sending all lights json to " + request.connection.remoteAddress);
            this.setConnectionStatusMsg("yellow", "/lights (p:" + node.port + ")");
            var allLightsConfig = this.generateControllerConfig();
            response.writeHead(200, {
                'Content-Type': 'application/json'
            });
            response.end(allLightsConfig);
        } else if (request.url == '/upnp/amazon-ha-bridge/setup.xml') {
            console.log("Sending setup.xml to " + request.connection.remoteAddress);
            this.setConnectionStatusMsg("yellow", "discovery (p: " + node.port + ")")
            var rawXml = this.generateBridgeSetupXml(lightId, config.devicename);
            console.log("xml", rawXml);
            response.writeHead(200, {
                'Content-Type': 'application/xml'
            });
            response.end(rawXml);
        }
    }

    AlexaHomeController.prototype.setConnectionStatusMsg = function (color, text, shape) {
        shape = shape || 'dot';
        var newState = function (item) {
            item.status({
                fill: color,
                shape: shape,
                text: text
            });
        };
        var keys = Object.keys(this._commands);
        var node = this;
        keys.forEach(function (key) {
            newState(node._commands[key]);
        });
    }

    AlexaHomeController.prototype.handleAlexaDeviceRequestFunction = function (request, response, uuid) {
        if (request === null || request === undefined || request.data === null || request.data === undefined) {
            this.setConnectionStatusMsg("red", "Invalid request")
            RED.log.error("Invalid request");
            return;
        }
        var alexa_ip = request.headers['x-forwarded-for'] || 
	                 request.connection.remoteAddress || 
	                 request.socket.remoteAddress ||
	                 request.connection.socket.remoteAddress;

        //Use the json from Alexa as the base for our msg
        var msg = request.data;
        // console.log("Got request " + this.id + " for " + uuid + ": " + msg);
        //Differentiate between on/off and dimming command. Issue #24
        var isOnOffCommand = (msg.on !== undefined && msg.on !== null) && (msg.bri === undefined || msg.bri === null);
        msg.on_off_command = isOnOffCommand;

        //Add extra 'payload' parameter which if either "on" or "off"
        var onoff = "off";
        if (request.data.on) //true/false
            onoff = "on";
        msg.payload = onoff;
        msg.alexa_ip = alexa_ip;
        this.justDoIt(uuid, msg);

        //Response to Alexa
        var responseStr = '[{"success":{"/lights/' + uuid + '/state/on":true}}]';
        // console.log("Sending response to " + request.connection.remoteAddress, responseStr);
        response.writeHead(200, "OK", {
            'Content-Type': 'application/json'
        });
        response.end(responseStr);
    }

    function formatUUID(lightId) {
        if (lightId === null || lightId === undefined)
            return "";

        var string = ("" + lightId);
        return string.replace(".", "").trim();
    }

    function formatHueBridgeUUID(lightId) {
        if (lightId === null || lightId === undefined)
            return "";
        var uuid = "f6543a06-da50-11ba-8d8f-";
        uuid += formatUUID(lightId);
        return uuid; // f6543a06-da50-11ba-8d8f-5ccf7f139f3d
    }

    function AlexaHomeNode(config) {

        RED.nodes.createNode(this, config);

        storage.initSync({
            dir: RED.settings.userDir + '/alexa-home'
        });

        var node = this;
        node.state = config.state;
        node.control = config.control;
        node.name = config.devicename;
        node.controller = node.findAlexaHomeController();

        if (!node.controller) {
            RED.log.error("Could not get a Alexa Home Controller - node is not functional!")
            node.status("red", "No Alexa Home Controller")
            return;
        }
        node.persistControllerPort();
        node.controller.registerCommand(node);
        node.on('close', function (done) {
            if (node.controller) {
                node.controller.deregisterCommand(node);
            }
            done();
        })

        node.on('input', function (msg) {
            node.controller.handleEvent(node, config, msg);
        });
        node.status({
            fill: "green",
            shape: "dot",
            text: "online (p:" + node.controller.port + ")"
        });
    }
    AlexaHomeNode.prototype.persistControllerPort = function () {
        if (!storage)
            return

        storage.setItemSync(this.id, this.controller.port);
    }
    AlexaHomeNode.prototype.loadControllerPort = function () {
        var port = undefined;
        if (storage) {
            port = storage.getItemSync(this.id);
        }
        if (port === null) {
            port = undefined;
        }
        return port
    }

    AlexaHomeNode.prototype.findAlexaHomeController = function () {

        var persistedPort = this.loadControllerPort();

        var globalContext = this.context().global;
        var controllerList = [];
        var lastController = null;
        if (globalContext.get("alexa-home-controller") !== null && globalContext.get("alexa-home-controller") !== undefined) {
            controllerList = globalContext.get("alexa-home-controller");
            for (var i = 0; i < controllerList.length; ++i) {
                lastController = controllerList[i];
                if (controllerList[i].nodeCount < maximumNodeCount) {
                    if (persistedPort === undefined || persistedPort === controllerList[i].port)
                        return controllerList[i];
                }
            }
        }
        var port = httpDefaultPort;
        if (persistedPort !== undefined) {
            port = persistedPort;
        } else if (lastController !== null) {
            port = lastController.port + 1;
        }
        var controllerId = this.loadControllerId(port);
        if(controllerId === undefined)
            controllerId = RED.util.generateId()

        var controllerConfig = {
            id: controllerId,
            type: 'alexa-home-controller',
            z: '',
            name: port,
            port: port
        }
        var createdController = new AlexaHomeController(controllerConfig);
        controllerList.push(createdController);
        globalContext.set("alexa-home-controller", controllerList)
        this.persistControllerId(port, controllerConfig.id);
        return createdController;
    }
    AlexaHomeNode.prototype.persistControllerId = function (port, id) {
        if (!storage)
            return

        storage.setItemSync(port.toString(), id)
    }
    AlexaHomeNode.prototype.loadControllerId = function(port) {
        var cid = undefined;
        if(storage && port !== undefined) {
            cid = storage.getItemSync(port.toString());
        }
        if(cid == null)
            cid = undefined;

        return cid
    }

    RED.nodes.registerType("alexa-home", AlexaHomeNode);
    RED.nodes.registerType("alexa-home-controller", AlexaHomeController)

}
