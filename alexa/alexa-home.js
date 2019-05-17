module.exports = function (RED) {


    "use strict";
    const HUE_USERNAME = "1028d66426293e821ecfd9ef1a0731df";
    const prefixUUID = "f6543a06-da50-11ba-8d8f-";

    const nodeSubPath = "";
    const bri_default = process.env.BRI_DEFAULT || 126;

    var controllerId = undefined;
    var debug = require('debug');
    function formatUUID(lightId) {
        if (lightId === null || lightId === undefined)
            return "";

        var string = ("" + lightId);
        return string.replace(".", "").trim();
    }

    function formatHueBridgeUUID(lightId) {
        if (lightId === null || lightId === undefined)
            return "";
        var uuid = prefixUUID;
        uuid += formatUUID(lightId);
        return uuid; // f6543a06-da50-11ba-8d8f-5ccf7f139f3d
    }

    RED.httpAdmin.get(nodeSubPath + '/upnp/amazon-ha-bridge/setup.xml', function (req, res) {
        if (!controllerId) {
            debug("no controller id found");
            res.writeHead(501);
            res.end();
            return;
        }
        var node = RED.nodes.getNode(controllerId);
        if (!node) {
            console.log("controller node not found");
            res.writeHead(502);
            res.end();
            return;
        }
        node.setConnectionStatusMsg("green", "setup requested");
        var rawXml = node.generateBridgeSetupXml();
        res.writeHead(200, {
            'Content-Type': 'application/xml'
        });
        res.end(rawXml);
    });

    function _processHttpRequest(req, res) {
        if (!controllerId) {
            console.log("no controller id found");
            res.writeHead(501);
            res.end();
            return;
        }
        var node = RED.nodes.getNode(controllerId);
        if (!node) {
            console.log("controller node not found");
            res.writeHead(502);
            res.end();
            return;
        }
        node.handleHueApiRequestFunction(req, res);
    }

    RED.httpAdmin.get(nodeSubPath + '/api*', function (req, res) {
        _processHttpRequest(req, res);
    });
    RED.httpAdmin.post(nodeSubPath + '/api/*', function (req, res) {
        _processHttpRequest(req, res);
    });
    RED.httpAdmin.put(nodeSubPath + '/api/*', function (req, res) {
        if (!controllerId) {
            console.log("no controller id found");
            res.writeHead(501);
            res.end();
            return;
        }
        var node = RED.nodes.getNode(controllerId);
        if (!node) {
            console.log("controller node not found");
            res.writeHead(502);
            res.end();
            return;
        }
        req.on('data', function (chunk) {
            request.data = JSON.parse(chunk);
        });
        req.on('end', function () {
            node.handleAlexaDeviceRequestFunction(req, res, uuid);
        });

    });

    function AlexaHomeController(config) {

        RED.nodes.createNode(this, config);

        var node = this;
        node._commands = {};
        node.httpEndpoint = node.getHttpAddress();
	node._logger = debug(this)
        controllerId = node.id;

        node.startSSDP();

        node.on('input', function (msg) {
            node.handleEvent(node, config, msg);
        });

        node.on('close', function (removed, doneFunction) {
            node.server.stop()
            if (removed) {}

            doneFunction();
        });
        node.setConnectionStatusMsg("green", "ok");
    }

    AlexaHomeController.prototype.getHttpAddress = function () {
        if (process.env.ALEXA_IP) {
            return process.env.ALEXA_IP + ":" + RED.settings.uiPort;
        }
        if (RED.settings.uiHost && RED.settings.uiHost != "0.0.0.0") {
            return RED.settings.uiHost + ":" + RED.settings.uiPort;
        }

        var os = require('os');
        var ifaces = os.networkInterfaces();

        Object.keys(ifaces).forEach(function (ifname) {
            var alias = 0;

            ifaces[ifname].forEach(function (iface) {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return;
                }

                if (alias >= 1) {
                    // this single interface has multiple ipv4 addresses
                    // console.log(ifname + ':' + alias, iface.address);
                } else {
                    // this interface has only one ipv4 adress
                    // console.log(ifname, iface.address);
                    return iface.address + ":" + RED.settings.uiPort;
                }
                ++alias;
            });
        });
    }

    AlexaHomeController.prototype.registerCommand = function (deviceNode) {
        this._commands[formatUUID(deviceNode.id)] = deviceNode;
    }

    AlexaHomeController.prototype.deregisterCommand = function (deviceNode) {
        _commands[formatUUID(deviceNode.id)].controller = undefined;
        delete this._commands[formatUUID(deviceNode.id)]
    }

    AlexaHomeController.prototype.startSSDP = function () {

        var node = this;
        var hueuuid = formatHueBridgeUUID(node.id);
        const ssdp = require("node-ssdp").Server;
	node.server = new ssdp({ 
		location:  "http://" + node.httpEndpoint + nodeSubPath + "/upnp/amazon-ha-bridge/setup.xml",
		        udn: 'uuid:' + hueuuid
	});
	node.server.addUSN('upnp:rootdevice');
	node.server.addUSN('urn:schemas-upnp-org:device:basic:1')
	node.server.start();
        node._logger("announcing: " + "http://" + node.httpEndpoint + nodeSubPath + "/upnp/amazon-ha-bridge/setup.xml");	
    }

    AlexaHomeController.prototype.generateAPIDeviceList = function () {
        var keys = Object.keys(this._commands);
        var itemCount = keys.length;
        var data = '{ ';
        for (var i = 0; i < itemCount; ++i) {
            var uuid = keys[i];
            data += '"' + uuid + '": ' + this.generateAPIDevice(uuid, this._commands[uuid]);
            if ((i + 1) < itemCount) {
                data += ","
            }
        }
        data = data + " }";
        return data;
    }

    AlexaHomeController.prototype.generateAPIDevice = function (uuid, node) {
        // console.log("node: ", node);
        var state = null;
        if (state === undefined || state === null)
            state = "false";
        else
            state = state ? "true" : "false";

        var fullResponseString = '{"state": ' +
            '{"on": ' + state + ', "bri": ' + bri_default + ',' +
            ' "hue": 15823, "sat": 88, "effect": "none", ' +
            '"alert": "none", "colormode": "ct", "ct": 365, "reachable": true, ' +
            '"xy": [0.4255, 0.3998]}, "type": "' + node.devicetype + '", ' +
            '"name": "' + node.name + '", ' +
            '"modelid": "LCT004", "manufacturername": "Philips", ' +
            '"uniqueid": "' + uuid + '", ' +
            '"swversion": "65003148", ' +
            '"pointsymbol": {"1": "none", "2": "none", "3": "none", "4": "none", "5": "none", "6": "none", "7": "none", "8": "none"}' +
            '}';

        return fullResponseString;
    }

    AlexaHomeController.prototype.generateBridgeSetupXml = function (lightId) {

        var node = this;
        var bridgeUUID = formatHueBridgeUUID(lightId);
        var fs = require('fs');
        var setupXml = fs.readFileSync(__dirname + '/setup.xml');
        setupXml = setupXml.toString();
        setupXml = setupXml.replace("URL_BASE_RPL", "http://" + node.httpEndpoint + nodeSubPath + "/");
        setupXml = setupXml.replace("UUID_UUID_UUID", bridgeUUID);

//        console.log(setupXml);

        return setupXml;
    }

    AlexaHomeController.prototype.handleEvent = function (node, msg) {
        if (msg == null || msg.payload === null || msg.payload === undefined) {
            node.status({
                fill: "red",
                shape: "dot",
                text: "invalid payload received"
            });
            return;
        }
        var controller = this;
        var lightId = formatUUID(controller.id);
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
        if (controller.inputtrigger) {
            inputTrigger = controller.inputtrigger;
        }
        if (inputTrigger) {
            this.processCommand(lightId, msg);
            return;
        }
    }

    AlexaHomeController.prototype.processCommand = function (uuid, msg) {
        //Node parameters
        var targetNode = this._commands[uuid];
        var deviceName = targetNode.name;

        //Detect increase/decrease command
        msg.change_direction = 0;
        if (msg.bri && msg.bri == bri_default - 64) //magic number
            msg.change_direction = -1;
        if (msg.bri && msg.bri == bri_default + 63) //magic number
            msg.change_direction = 1;

        //Dimming or Temperature command
        if (msg.bri) {

            msg.bri = Math.round(msg.bri / 255.0 * 100.0);
            msg.bri_normalized = msg.bri / 100.0;
            msg.on = msg.bri > 0;
            msg.payload = msg.on ? "on" : "off";

            targetNode.status({
                fill: "blue",
                shape: "dot",
                text: "bri:" + msg.bri
            });
        }
        //On/off command
        else {
            var isOn = (msg.payload == "on")
            msg.bri = isOn ? 100 : 0;
            msg.bri_normalized = isOn ? 1.0 : 0.0;

            //Restore the previous value before off command
            var savedBri = bri_default;
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
                text: "" + msg.payload
            });
        }

        //Add extra device parameters
        msg.device_name = deviceName;
        msg.light_id = uuid;

        //Send the message to next node
        targetNode.send(msg);
    }

    AlexaHomeController.prototype.controlSingleLight = function (lightMatch, request, response) {

        var token = lightMatch[1];
        var uuid = lightMatch[2];
        uuid = uuid.replace("/", "");
        if (this._commands[uuid] === undefined) {
            RED.log.warn("unknown alexa node was requested: " + uuid)
            return
        }


        // console.log("Sending light " + uuid + " to " + request.connection.remoteAddress);
        var targetNode = this._commands[uuid];
        var lightJson = this.generateAPIDevice(uuid, targetNode);
        response.writeHead(200, {
            'Content-Type': 'application/json'
        });
        response.end(lightJson);

    }
    AlexaHomeController.prototype.handleHueApiRequestFunction = function (request, response) {

        var url = request.url.slice(nodeSubPath.length);

        var node = this;
        var lightId = formatUUID(node.id);
        var lightMatch = /^\/api\/(\w*)\/lights\/([\w\-]*)/.exec(url);
        var authMatch = /^\/api\/(\w*)/.exec(url) && (request.method == 'POST');
        //Control 1 single light
        if (lightMatch) {
            this.controlSingleLight(lightMatch, request, response)
        } else if (authMatch) {
            var responseStr = '[{"success":{"username":"' + HUE_USERNAME + '"}}]';
            console.log("Sending response to " + request.connection.remoteAddress, responseStr);
            this.setConnectionStatusMsg("blue", "auth")
            response.writeHead(200, "OK", {
                'Content-Type': 'application/json'
            });
            response.end(responseStr);
        } else if (/^\/api/.exec(url)) {
            console.log("Sending all lights json to " + request.connection.remoteAddress);
            this.setConnectionStatusMsg("yellow", "/lights");
            var allLightsConfig = this.generateAPIDeviceList();
            response.writeHead(200, {
                'Content-Type': 'application/json'
            });
            response.end(allLightsConfig);
        } else {
            response.writeHead(404, {
                'Content-Type': 'application/json'
            });
            response.end("WHAAAAAT?");

        }
    }

    AlexaHomeController.prototype.setConnectionStatusMsg = function (color, text, shape) {
        shape = shape || 'dot';
        this.status({
            fill: color,
            shape: shape,
            text: text
        });
    }

    AlexaHomeController.prototype.handleAlexaDeviceRequestFunction = function (request, response, uuid) {
        if (request === null || request === undefined || request.data === null || request.data === undefined) {
            this.setConnectionStatusMsg("red", "Invalid request")
            RED.log.error("Invalid request");
            return;
        }

        var msg = request.data;

        var header_names = Object.keys(request.headers);
        header_names.forEach(function (key) {
            msg["http_header_" + key] = request.headers[key];
        })

        var alexa_ip = requestAnimationFrame
            .headers['x-forwarded-for'] ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            request.connection.socket.remoteAddress;

        var isOnOffCommand = (msg.on !== undefined && msg.on !== null) && (msg.bri === undefined || msg.bri === null);
        msg.on_off_command = isOnOffCommand;

        //Add extra 'payload' parameter which if either "on" or "off"
        var onoff = "off";
        if (request.data.on) //true/false
            onoff = "on";
        msg.payload = onoff;
        msg.alexa_ip = alexa_ip;
        this.processCommand(uuid, msg);

        //Response to Alexa
        var responseStr = '[{"success":{"/lights/' + uuid + '/state/on":true}}]';
        // console.log("Sending response to " + request.connection.remoteAddress, responseStr);
        response.writeHead(200, "OK", {
            'Content-Type': 'application/json'
        });
        response.end(responseStr);
    }

    function AlexaHomeNode(config) {

        RED.nodes.createNode(this, config);

        var node = this;
        node.state = config.state;
        node.control = config.control;
        node.name = config.devicename;
        node.devicetype = config.devicetype
        if (!controllerId) {
            RED.log.error("Could not get an Alexa Home Controller - node is not functional!")
            node.status("red", "No Alexa Home Controller on any workflow")
            return;
        }

        node.controller = RED.nodes.getNode(controllerId)
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
            text: "online"
        });
    }

    RED.nodes.registerType("alexa-home", AlexaHomeNode);
    RED.nodes.registerType("alexa-home-controller", AlexaHomeController)

}
