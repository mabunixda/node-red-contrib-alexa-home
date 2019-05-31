module.exports = function (RED) {


    "use strict";
    const HUE_USERNAME = "1028d66426293e821ecfd9ef1a0731df";
    const prefixUUID = "f6543a06-da50-11ba-8d8f-";

    const bri_default = process.env.BRI_DEFAULT || 126;

    const isDebug = process.env.DEBUG && process.env.DEBUG.indexOf("node-red-contrib-alexa-home") > 0 || false;
    const Mustache = require('mustache');
    const fs = require('fs')

    var nodeSubPath = "";
    var controllerNode = undefined;

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

    function findControllerNode() {

        RED.nodes.eachNode(function (node) {
            if (node.type == "alexa-home-controller") {
                return node;
            }
        });
        return undefined;
    }

    function getControllerNode(req, res) {

        if (!controllerNode) {
            var node = findControllerNode();
            if (node != undefined) {
                controllerNode = node;
                return node;
            }
            console.log("no controller id found");
            res.writeHead(501);
            res.end();
            return undefined;
        }

        return controllerNode;
    }

    RED.httpAdmin.get(nodeSubPath + '/upnp/amazon-ha-bridge/setup.xml', function (req, res) {
        var node = getControllerNode(req, res);
        if (node === undefined) {
            return;
        }
        node.handleSetup(req, res);
    })

    RED.httpAdmin.post(nodeSubPath + '/api', function (req, res) {
        var node = getControllerNode(req, res);
        if (node === undefined) {
            return;
        }
        node.handleRegistration(req, res);
    })

    RED.httpAdmin.get(nodeSubPath + '/api', function (req, res) {
        var node = getControllerNode(req, res);
        if (node === undefined) {
            return;
        }
        node.handleHueApi(req, res);
    })

    RED.httpAdmin.get(nodeSubPath + "/api/:username", function (req, res) {
        var node = getControllerNode(req, res);
        if (node === undefined) {
            return;
        }
        node.handleApiCall(req, res);
    })

    RED.httpAdmin.get(nodeSubPath + "/api/:username/lights", function (req, res) {
        var node = getControllerNode(req, res);
        if (node === undefined) {
            return;
        }
        node.handleApiItemList(req, res);
    })

    RED.httpAdmin.get(nodeSubPath + "/api/:username/lights/:id", function (req, res) {
        var node = getControllerNode(req, res);
        if (node === undefined) {
            return;
        }
        node.getItemInfo(req, res);
    })

    RED.httpAdmin.put(nodeSubPath + '/api/:username/lights/:id/state', function (req, res) {
        var node = getControllerNode(req, res);
        if (node === undefined) {
            return;
        }
        node.controlItem(req, res);
    });

    function AlexaHomeController(config) {

        RED.nodes.createNode(this, config);

//        nodeSubPath = RED.settings.httpRoot;

        var node = this;
        node._commands = {};
        controllerNode = node;

        node.startSSDP(node.getHttpAddress());

        node.on('close', function (removed, doneFunction) {
            node.server.stop()
            if (removed) {}

            doneFunction();
        });
        node.setConnectionStatusMsg("green", "ok");

        RED.nodes.eachNode(function (n) {
            if (n.type == "alexa-home") {
                var x = RED.nodes.getNode(n.id);
                if (x) {
                    x.initController(node);
                }
            }
        });
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
                    if (isDebug) {
                        RED.log.debug(ifname + ':' + alias, iface.address);
                    }
                } else {
                    if (isDebug) {
                        RED.log.debug(ifname, iface.address);
                    }
                    return iface.address + ":" + RED.settings.uiPort;
                }
                ++alias;
            });
        });
    }

    AlexaHomeController.prototype.registerCommand = function (deviceNode) {
        deviceNode.controller = this;
        this._commands[formatUUID(deviceNode.id)] = deviceNode;
    }

    AlexaHomeController.prototype.deregisterCommand = function (deviceNode) {
        _commands[formatUUID(deviceNode.id)].controller = undefined;
        delete this._commands[formatUUID(deviceNode.id)]
    }

    AlexaHomeController.prototype.startSSDP = function (endpoint) {

        var node = this;
        var hueuuid = formatHueBridgeUUID(node.id);
        const ssdp = require("node-ssdp").Server;
        node.server = new ssdp({
            location: "http://" + endpoint + "/" + RED.settings.httpRoot + "/upnp/amazon-ha-bridge/setup.xml",
            udn: 'uuid:' + hueuuid
        });
        node.server.addUSN('upnp:rootdevice');
        node.server.reuseAddr = true;
        node.server.addUSN('urn:schemas-upnp-org:device:basic:1')
        node.server.start();
        RED.log.debug("announcing: " + "http://" + endpoint + "/upnp/amazon-ha-bridge/setup.xml");
    }

    AlexaHomeController.prototype.handleSetup = function (request, response) {
        var template = fs.readFileSync(__dirname + '/templates/setup.xml', 'utf8').toString();
        var data = {
            uuid: formatHueBridgeUUID(this.id),
            baseUrl: "http://" + request.headers["host"] + "/" + nodeSubPath
        }
        var content = Mustache.render(template, data);
        this.setConnectionStatusMsg("green", "setup requested");
        response.writeHead(200, {
            'Content-Type': 'application/xml'
        });
        response.end(content);
    }

    AlexaHomeController.prototype.handleRegistration = function (request, response) {
        var template = fs.readFileSync(__dirname + '/templates/registration.json', 'utf8').toString();
        var data = {
            username: HUE_USERNAME
        }
        var content = Mustache.render(template, data);
        this.setConnectionStatusMsg("green", "registration succeded");
        response.writeHead(200, {
            'Content-Type': 'application/json'
        });
        response.end(content);
    }

    AlexaHomeController.prototype.handleApiItemList = function (request, response) {
        var template = fs.readFileSync(__dirname + '/templates/items/list.json', 'utf8').toString();
        var data = {
            lights: this.generateAPIDeviceList(),
            date: new Date().toISOString().split('.').shift()
        }
        var content = Mustache.render(template, data);
        RED.log.debug("Sending all lights json to " + request.connection.remoteAddress);
        this.setConnectionStatusMsg("yellow", "device list requested");
        response.writeHead(200, {
            'Content-Type': 'application/json'
        });
        response.end(content);
    }

    AlexaHomeController.prototype.handleApiCall = function (request, response) {
        var responseTemplate = fs.readFileSync(__dirname + '/templates/response.json', 'utf8').toString();
        var itemTemplate = fs.readFileSync(__dirname + '/templates/items/list.json', 'utf8').toString();
        var data = {
            lights: this.generateAPIDeviceList(),
            address: request.hostname,
            username: request.params.username,
            date: new Date().toISOString().split('.').shift()
        }
        var content = Mustache.render(responseTemplate, data, {
            itemsTemplate: itemTemplate
        });
        RED.log.debug("Sending all information json to " + request.connection.remoteAddress);
        this.setConnectionStatusMsg("yellow", "api requested");
        response.writeHead(200, {
            'Content-Type': 'application/json'
        });
        response.end(content);
    }

    AlexaHomeController.prototype.generateAPIDeviceList = function () {
        var keys = Object.keys(this._commands);
        var itemCount = keys.length;

        var deviceList = [];

        for (var i = 0; i < itemCount; ++i) {
            var uuid = keys[i];
            var device = {
                id: uuid,
                name: this._commands[uuid].name
            };
            var deviceData = this.generateAPIDevice(uuid, this._commands[uuid]);
            deviceList.push(Object.assign({}, deviceData, device));
        }
        return deviceList;
    }

    AlexaHomeController.prototype.generateAPIDevice = function (uuid, node) {

        var defaultAttributes = {
            on: node.state,
            bri: node.bri,
            hue: 0,
            sat: 254,
            ct: 199,
            colormode: "ct"
        };

        return defaultAttributes;

    }

    AlexaHomeController.prototype.controlItem = function (request, response) {

        var template = fs.readFileSync(__dirname + '/templates/items/set-state.json', 'utf8').toString();

        var token = request.params.username;
        var uuid = request.params.id;
        uuid = uuid.replace("/", "");
        if (this._commands[uuid] === undefined) {
            RED.log.warn("unknown alexa node was requested: " + uuid)
            return
        }

        var payloadRaw = Object.keys(request.body)[0];

        var msg = {
            payload: JSON.parse(payloadRaw)
        }
        if (isDebug) {
            msg.alexa_ip = request.headers['x-forwarded-for'] ||
                request.connection.remoteAddress ||
                request.socket.remoteAddress ||
                request.connection.socket.remoteAddress;
            var header_names = Object.keys(request.headers);
            header_names.forEach(function (key) {
                msg["http_header_" + key] = request.headers[key];
            })
        }
        var targetNode = this._commands[uuid];
        targetNode.processCommand(msg);

        var data = this.generateAPIDevice(uuid, targetNode);
        var output = Mustache.render(template, data);
        response.writeHead(200, {
            'Content-Type': 'application/json'
        });
        response.end(output);
    }

    AlexaHomeController.prototype.getItemInfo = function (request, response) {

        var template = fs.readFileSync(__dirname + '/templates/items/get-state.json', 'utf8').toString();

        var token = request.params.username;
        var uuid = request.params.id;

        var targetNode = this._commands[uuid];
        var data = this.generateAPIDevice(uuid, targetNode);
        data.name = targetNode.name;
        data.date = new Date().toISOString().split('.').shift();
        var output = Mustache.render(template, data);
        response.writeHead(200, {
            'Content-Type': 'application/json'
        });
        response.end(output);
    }

    AlexaHomeController.prototype.setConnectionStatusMsg = function (color, text, shape) {
        shape = shape || 'dot';
        this.status({
            fill: color,
            shape: shape,
            text: text
        });
    }

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


        node.initController();
    }
    AlexaHomeNode.prototype.initController = function (controller) {

        var node = this;
        var text = "online";
        if (controller) {
            controllerNode = controller;
            text += " - post init";
        }
        if (controllerNode == undefined || controllerNode == null) {
            RED.log.warn("Could not get an Alexa Home Controller - node is not functional!");
            node.status("red", "No Alexa Home Controller available");
            return;
        }

        controllerNode.registerCommand(node);

        node.status({
            fill: "green",
            shape: "dot",
            text: "online"
        });
    }

    AlexaHomeNode.prototype.processCommand = function (msg) {
        var node = this;
        if (node.controller == null || node.controller == undefined) {
            node.status("red", "No Alexa Home Controller available");
            return;
        }
        //Detect increase/decrease command
        msg.change_direction = 0;
        if (msg.payload.bri) {
            if (msg.payload.bri == bri_default - 64) //magic number
                msg.change_direction = -1;
            if (msg.payload.bri == bri_default + 63) //magic number
                msg.change_direction = 1;
        }

        //Dimming or Temperature command
        if (msg.payload.bri) {

            msg.payload.on = msg.payload.bri > 0;

            node.status({
                fill: "blue",
                shape: "dot",
                text: "bri:" + msg.payload.bri
            });
        }
        //On/off command
        else {
            var isOn = msg.payload.on
            msg.payload.on = isOn;
            msg.payload.bri = isOn ? 255.0 : 0.0;

            //Node status
            node.status({
                fill: "blue",
                shape: "dot",
                text: isOn ? "On" : "Off"
            });
        }
        msg.payload.bri_normalized = msg.payload.bri / 255.0 * 100.0;

        msg.device_name = this.name;
        msg.light_id = this.id;

        node.state = msg.payload.on;
        node.bri = msg.payload.bri;

        if (msg.inputTrigger) {
            return;
        }

        node.send(msg);
    }

    RED.nodes.registerType("alexa-home", AlexaHomeNode);
    RED.nodes.registerType("alexa-home-controller", AlexaHomeController)

}