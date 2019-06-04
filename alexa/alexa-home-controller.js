module.exports = function (RED) {

    "use strict";

    var alexa_home = require('./alexa-helper.js');
    var Mustache = require('mustache'),
        fs = require('fs'),
        debug = require('debug');


    var compression = require("compression");
    // var app = RED.server.server;
    // app.use(compression({ filter: shouldCompress }))

    function shouldCompress(req, res) {
        console.log(req.url);
        if (req.headers['x-no-compression']) {
            // don't compress responses with this request header
            return false
        }

        // fallback to standard filter function
        return compression.filter(req, res)
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

        if (alexa_home.controllerNode) {
            return alexa_home.controllerNode;
        }
        var node = findControllerNode();
        if (node != undefined) {
            alexa_home.controllerNode = node;
            return node;
        }
        console.log("no controller id found");
        res.status(501).end();
        return undefined;
    }

    RED.httpAdmin.get(alexa_home.nodeSubPath + '/setup.xml', function (req, res) {
        var logger = debug("alexa-home:controller")
        logger("Setup was requested");
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.handleSetup(req, res);
    })

    RED.httpAdmin.post(alexa_home.nodeSubPath + '/api', function (req, res) {
        var logger = debug("alexa-home:controller")
        logger("Got registion api call");
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.handleRegistration(req, res);
    })

    RED.httpAdmin.get(alexa_home.nodeSubPath + "/api/", function (req, res) {
        var logger = debug("alexa-home:controller")
        logger("Got api call without username");
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.handleApiCall(req, res);
    })


    RED.httpAdmin.get(alexa_home.nodeSubPath + "/api/:username", function (req, res) {
        var logger = debug("alexa-home:controller")
        logger("Got api call with username");
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.handleApiCall(req, res);
    })

    RED.httpAdmin.get(alexa_home.nodeSubPath + "/api/:username/:itemType", function (req, res) {
        var logger = debug("alexa-home:controller")
        logger(RED.server);
        logger("Got " + req.params.itemType + " api call");
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.handleLightsList(req, res);
    })

    RED.httpAdmin.get(alexa_home.nodeSubPath + "/api/:username/:itemType/:id", function (req, res) {
        var logger = debug("alexa-home:controller")
        logger(req.params.itemType + " information was requested: " + req.params.id);
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.getItemInfo(req, res);
    })

    RED.httpAdmin.put(alexa_home.nodeSubPath + '/api/:username/:itemType/:id/state', function (req, res) {
        var logger = debug("alexa-home:controller")
        logger(req.params.itemType + " gets state set: " + req.param.id);
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.controlItem(req, res);
    });

    function AlexaHomeController(config) {

        RED.nodes.createNode(this, config);

        this._subclass = 'alexa-home:controller';
        this._logger = debug(this._subclass)

        var node = this;
        node._commands = new Map();
        alexa_home.controllerNode = node;

        node.startSSDP(node.getHttpAddress());

        node.on('close', function (removed, doneFunction) {
            node.server.stop()
            if (removed) { }

            doneFunction();
        });
        node.setConnectionStatusMsg("green", "ok");

        RED.nodes.eachNode(function (n) {
            if (n.type == "alexa-home") {
                var x = RED.nodes.getNode(n.id);
                if (x) {
                    node.registerCommand(x);
                }
            }
        });
    }

    AlexaHomeController.prototype.getHttpAddress = function () {
        if (process.env.ALEXA_IP) {
            var publicIP = process.env.ALEXA_IP;
            if (publicIP.indexOf(":") > 0) {
                this._logger("httpAddress using env.ALEXA_IP: " + publicIP);
                return publicIP;
            }
            this._logger("httpAddress using env.ALEXA_IP and node-red uiPort: " + publicIP + ":" + RED.settings.uiPort);
            return publicIP + ":" + RED.settings.uiPort;
        }
        if (RED.settings.uiHost && RED.settings.uiHost != "0.0.0.0") {
            this._logger("httpAddress using node-red settings: " + RED.settings.uiHost + ":" + RED.settings.uiPort);
            return RED.settings.uiHost + ":" + RED.settings.uiPort;
        }
        this._logger("Determining httpAddress...")
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
                    this._logger("httpAddress using interface address: " + iface.address + ":" + RED.settings.uiPort);
                    return iface.address + ":" + RED.settings.uiPort;
                }
                ++alias;
            });
        });
    }

    AlexaHomeController.prototype.getDevices = function () {
        return this._commands;;
    }

    AlexaHomeController.prototype.getDevice = function (uuid) {
        if (this._commands.has(uuid)) {
            return this._commands[uuid];
        }
        return undefined;
    }

    AlexaHomeController.prototype.registerCommand = function (deviceNode) {
        deviceNode.controller = this;
        this._commands.set(alexa_home.formatUUID(deviceNode.id), deviceNode);
    }

    AlexaHomeController.prototype.deregisterCommand = function (deviceNode) {
        this._commands.delete(alexa_home.formatUUID(deviceNode.id))
    }

    AlexaHomeController.prototype.startSSDP = function (endpoint) {

        this._logger("Starting SSDP");
        var node = this;
        var hueuuid = alexa_home.formatHueBridgeUUID(node.id);
        const ssdp = require("node-ssdp").Server;
        node.server = new ssdp({
            location: "http://" + endpoint + alexa_home.nodeSubPath + "/setup.xml",
            udn: 'uuid:' + hueuuid
        });
        node.server.addUSN('upnp:rootdevice');
        node.server.reuseAddr = true;
        node.server.addUSN('urn:schemas-upnp-org:device:basic:1')
        node.server.start();
        this._logger("announcing: " + "http://" + endpoint + alexa_home.nodeSubPath + "/setup.xml");
    }

    AlexaHomeController.prototype.handleSetup = function (request, response) {
        this._logger("Handling setup request");
        var template = fs.readFileSync(__dirname + '/templates/setup.xml', 'utf8').toString();
        var data = {
            uuid: alexa_home.formatHueBridgeUUID(this.id),
            baseUrl: "http://" + request.headers["host"] + alexa_home.nodeSubPath
        }
        var content = Mustache.render(template, data);
        this.setConnectionStatusMsg("green", "setup requested");
        response.writeHead(200, {
            'Content-Type': 'application/xml; charset=UTF-8'
        });
        response.end(content);
    }

    AlexaHomeController.prototype.handleRegistration = function (request, response) {
        this._logger("Handling registration request");
        var template = fs.readFileSync(__dirname + '/templates/registration.json', 'utf8').toString();
        var data = {
            username: alexa_home.HUE_USERNAME
        }
        var content = Mustache.render(template, data);
        this.setConnectionStatusMsg("green", "registration succeded");
        var data = JSON.parse(content)
        response.json(data);
    }

    AlexaHomeController.prototype.handleLightsList = function (request, response) {
        this._logger("handling api item list request");
        var template = fs.readFileSync(__dirname + '/templates/items/list.json', 'utf8').toString();
        var data = {
            lights: this.generateAPIDeviceList(),
            date: new Date().toISOString().split('.').shift()
        }
        var content = Mustache.render(template, data);
        this._logger("Sending all " + this._commands.size + " lights json to " + request.connection.remoteAddress);
        this.setConnectionStatusMsg("yellow", "device list requested: " + this._commands.size);
        var data = JSON.parse(content)
        response.jsonp(data);
    }

    AlexaHomeController.prototype.handleApiCall = function (request, response) {
        this._logger("Hanlding API listing request");
        var responseTemplate = fs.readFileSync(__dirname + '/templates/response.json', 'utf8').toString();
        var lights = fs.readFileSync(__dirname + '/templates/items/list.json', 'utf8').toString();
        var data = {
            lights: this.generateAPIDeviceList(),
            address: request.hostname,
            username: request.params.username,
            date: new Date().toISOString().split('.').shift()
        }
        var content = Mustache.render(responseTemplate, data, {
            itemsTemplate: lights
        });
        this._logger("Sending all " + this._commands.size + " lights information to " + request.connection.remoteAddress);
        this.setConnectionStatusMsg("yellow", "api requested");
        var data = JSON.parse(content);
        response.json(data);
    }

    AlexaHomeController.prototype.generateAPIDeviceList = function () {
        var deviceList = [];
        for (const [uuid, dev] of this._commands) {
            var device = {
                id: uuid,
                name: dev.name
            };
            var deviceData = this.generateAPIDevice(uuid, dev);
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
        var targetNode = this.getDevice(uuid);
        if (targetNode === undefined) {
            RED.log.warn("unknown alexa node was requested: " + uuid);
            response.status(502).end();
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
        targetNode.processCommand(msg);

        var data = this.generateAPIDevice(uuid, targetNode);
        var output = Mustache.render(template, data);
        var data = JSON.parse(output);
        response.json(data);
    }

    AlexaHomeController.prototype.getItemInfo = function (request, response) {

        var template = fs.readFileSync(__dirname + '/templates/items/get-state.json', 'utf8').toString();

        var token = request.params.username;
        var uuid = request.params.id;

        var targetNode = this.getDevice(uuid);
        if (targetNode === undefined) {
            RED.log.warn("unknown alexa node was requested: " + uuid);
            response.status(502).end();
            return
        }
        var data = this.generateAPIDevice(uuid, targetNode);
        data.name = targetNode.name;
        data.date = new Date().toISOString().split('.').shift();
        var output = Mustache.render(template, data);
        var data = JSON.parse(output);
        response.json(data);
    }

    AlexaHomeController.prototype.setConnectionStatusMsg = function (color, text, shape) {
        shape = shape || 'dot';
        this.status({
            fill: color,
            shape: shape,
            text: text
        });
    }

    RED.nodes.registerType("alexa-home-controller", AlexaHomeController)

}
