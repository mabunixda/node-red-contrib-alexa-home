module.exports = function (RED) {

    "use strict";

    var Mustache = require('mustache'),
        fs = require('fs'),
        alexa_home = require('./alexa-helper');

    // var bodyParser = require('body-parser');

    // var app = RED.httpAdmin;
    // app.use(bodyParser.json({
    //     verify: function (req, res, buf, encoding) {
    //         console.log("test")
    //         // sha1 content
    //         var hash = crypto.createHash('sha1');
    //         hash.update(buf);
    //         req.hasha = hash.digest('hex');
    //         console.log("hash", req.hasha);

    //         // get rawBody        
    //         req.rawBody = buf.toString();
    //         console.log("rawBody", req.rawBody);

    //     }
    // }));

    function findControllerNode() {

        RED.nodes.eachNode(function (node) {
            if (node.type == "alexa-home-controller") {
                return node;
            }
        });
        return undefined;
    }

    function getControllerNode(req, res) {

        var node = findControllerNode();

        if (alexa_home.controllerNode) {
            return alexa_home.controllerNode;
        }
        if (node != undefined) {
            alexa_home.controllerDynamic = false;
            alexa_home.controllerNode = node;
            return node;
        }
        console.log("no controller id found");
        res.status(501).end();
        return undefined;
    }

    RED.httpAdmin.get(alexa_home.nodeSubPath + '/setup.xml', function (req, res) {
        RED.log.debug("Setup was requested");
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.handleSetup(req, res);
    })

    RED.httpAdmin.post(alexa_home.nodeSubPath + '/api', function (req, res) {
        RED.log.debug("Got registion api call");
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.handleRegistration(req, res);
    })

    RED.httpAdmin.get(alexa_home.nodeSubPath + "/api/", function (req, res) {
        RED.log.debug("Got api call without username");
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.handleApiCall(req, res);
    })


    RED.httpAdmin.get(alexa_home.nodeSubPath + "/api/:username", function (req, res) {
        RED.log.debug("Got api call with username");
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.handleApiCall(req, res);
    })

    RED.httpAdmin.get(alexa_home.nodeSubPath + "/api/:username/:itemType", function (req, res) {

        RED.log.debug("Got " + req.params.itemType + " api call");
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.handleItemList(req, res);
    })

    RED.httpAdmin.get(alexa_home.nodeSubPath + "/api/:username/:itemType/:id", function (req, res) {

        RED.log.debug(req.params.itemType + " information was requested: " + req.params.id);
        var node = getControllerNode(req, res);
        if (node === undefined) {
            RED.log.warn("ERROR: Could not find controller");
            response.status(502).end();
            return;
        }
        node.getItemInfo(req, res);
    })

    RED.httpAdmin.put(alexa_home.nodeSubPath + '/api/:username/:itemType/:id/state', function (req, res) {

        RED.log.debug(req.params.itemType + " gets state set: " + req.params.id + ' by ' + req.connection.remoteAddress);
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

        var node = this;
        node.name = config.controllername;
        node._commands = new Map();
        alexa_home.controllerNode = node;

        var ssdpURIs = node.getHttpAddress();
        var ssdpURI = undefined
        if (ssdpURIs.length == 0) {
            RED.log.error("Could not determine ssdp uri");
        } else {
            ssdpURI = ssdpURIs[0];
            if (ssdpURIs.length > 1) {
                RED.log.warn("More than 1 URI available - using 1st: " + ssdpURIs);
            }
        }
        node.startSSDP(ssdpURI);

        node.on('close', function (removed, doneFunction) {
            node.server.stop()
            for (const [k, v] of node._commands) {
                node.deregisterCommand(v);
            }

            doneFunction();
        });
        node.setConnectionStatusMsg("green", "ok");

        RED.log.info("Assigning alexa-home nodes to this controller");

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
        var node = this;
        var uiPort = RED.settings.uiPort || 1880;
        if (process.env.ALEXA_IP) {
            var publicIP = process.env.ALEXA_IP;
            if (publicIP.indexOf(":") > 0) {
                RED.log.debug(this.name + " - httpAddress using env.ALEXA_IP: " + publicIP);
                return publicIP;
            }
            RED.log.debug(this.name + " - httpAddress using env.ALEXA_IP and node-red uiPort: " + publicIP + ":" + uiPort);
            return publicIP + ":" + uiPort;
        }
        if (RED.settings.uiHost && RED.settings.uiHost != "0.0.0.0") {
            RED.log.debug(this.name + " - httpAddress using node-red settings: " + RED.settings.uiHost + ":" + uiPort);
            return RED.settings.uiHost + ":" + uiPort;
        }
        RED.log.debug(node.name + " - Determining httpAddress...")
        var os = require('os');
        var ifaces = os.networkInterfaces();
        var keys = Object.keys(ifaces);
        var ssdpAddresses = [];
        for (let k in keys) {
            var alias = 0;
            var ifname = keys[k];
            ifaces[ifname].forEach(function (iface) {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return;
                }

                if (alias >= 1) {
                    // this single interface has multiple ipv4 addresses
                    if (alexa_home.isDebug) {
                        RED.log.debug(node.name + " - " + ifname + ':' + alias, iface.address);
                    }
                } else {
                    if (alexa_home.isDebug) {
                        RED.log.debug(node.name + " - " + ifname + "-" + iface.address);
                    }
                    RED.log.debug(node.name + " - httpAddress using interface address: " + iface.address + ":" + uiPort);
                    ssdpAddresses.push(iface.address + ":" + uiPort);
                }
                ++alias;
            });
        }

        return ssdpAddresses;
    }

    AlexaHomeController.prototype.getDevices = function () {
        return this._commands;
    }

    AlexaHomeController.prototype.getDevice = function (uuid) {
        if (this._commands.has(uuid)) {
            return this._commands.get(uuid);
        }
        return undefined;
    }

    AlexaHomeController.prototype.registerCommand = function (deviceNode) {
        deviceNode.updateController(this);
        this._commands.set(alexa_home.formatUUID(deviceNode.id), deviceNode);
    }

    AlexaHomeController.prototype.deregisterCommand = function (deviceNode) {
        this._commands.delete(alexa_home.formatUUID(deviceNode.id))
    }

    AlexaHomeController.prototype.startSSDP = function (endpoint) {

        var node = this;
        node.log(this.name + " - alexa-home - Starting SSDP");
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
        RED.log.debug(this.name + " - announcing: " + "http://" + endpoint + alexa_home.nodeSubPath + "/setup.xml");
    }

    AlexaHomeController.prototype.handleSetup = function (request, response) {
        RED.log.debug(this.name + " - Handling setup request");
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
        RED.log.debug(this.name + " - Handling registration request");
        var template = fs.readFileSync(__dirname + '/templates/registration.json', 'utf8').toString();
        var data = {
            username: alexa_home.HUE_USERNAME
        }
        var content = Mustache.render(template, data);
        this.setConnectionStatusMsg("green", "registration succeded");
        response.set({
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip'
        });
        response.send(content);

    }

    AlexaHomeController.prototype.handleItemList = function (request, response) {
        RED.log.debug(this.name + " - handling api item list request: " + request.params.itemType);
        if (request.params.itemType !== "lights") {
            response.status(404).end("");
            return;
        }
        var template = fs.readFileSync(__dirname + '/templates/items/list.json', 'utf8').toString();
        var data = {
            lights: this.generateAPIDeviceList(),
            date: new Date().toISOString().split('.').shift()
        }
        var content = Mustache.render(template, data);
        RED.log.debug(this.name + " - Sending all " + this._commands.size + " " + request.params.itemType + " json to " + request.connection.remoteAddress);
        this.setConnectionStatusMsg("yellow", request.params.itemType + " list requested: " + this._commands.size);
        response.set({
            'Content-Type': 'application/json'
        });
        response.send(content);
    }

    AlexaHomeController.prototype.handleApiCall = function (request, response) {
        RED.log.debug(this.name + " - Hanlding API listing request");
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
        RED.log.debug(this.name + " - Sending all " + this._commands.size + " lights information to " + request.connection.remoteAddress);
        this.setConnectionStatusMsg("yellow", "api requested");
        response.set({
            'Content-Type': 'application/json'
        });
        response.send(content);
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
            x: node.xy[0],
            y: node.xy[1],
            hue: 0,
            sat: 254,
            ct: 199,
            colormode: "ct"
        };

        return defaultAttributes;

    }

    AlexaHomeController.prototype.controlItem = function (request, response) {
        console.log(request.rawBody)
        if (request.params.itemType !== "lights") {
            response.status(404).end("");
            return;
        }

        var template = fs.readFileSync(__dirname + '/templates/items/set-state.json', 'utf8').toString();

        var token = request.params.username;
        var uuid = request.params.id;
        uuid = uuid.replace("/", "");
        var targetNode = this.getDevice(uuid);
        if (targetNode === undefined) {
            RED.log.warn("unknown alexa node of type " + request.params.itemType + " was requested: " + uuid);
            response.status(502).end();
            return
        }


        var body = JSON.stringify(request.body);
        var payloadRaw = undefined;
        if (body.indexOf('xy') > 0) {
            payloadRaw = body.replace("{\"{", "{").replace(" \":{\"", "[").replace("\":\"\"}", "]").replace(/\\/g, "");
        } else {
            payloadRaw = Object.keys(request.body)[0];
        }

        var msg = {
            payload: JSON.parse(payloadRaw)
        };
        if (alexa_home.isDebug) {
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
        response.set({
            'Content-Type': 'application/json'
        });
        response.send(output);
    }

    AlexaHomeController.prototype.getItemInfo = function (request, response) {

        if (request.params.itemType !== "lights") {
            response.status(404).end("");
            return;
        }

        var template = fs.readFileSync(__dirname + '/templates/items/get-state.json', 'utf8').toString();

        var token = request.params.username;
        var uuid = request.params.id;

        var targetNode = this.getDevice(uuid);
        if (targetNode === undefined) {
            RED.log.warn("unknown alexa node of type " + request.params.itemType + " was requested: " + uuid);
            response.status(502).end();
            return
        }
        var data = this.generateAPIDevice(uuid, targetNode);
        data.name = targetNode.name;
        data.date = new Date().toISOString().split('.').shift();
        var output = Mustache.render(template, data);
        response.set({
            'Content-Type': 'application/json'
        });
        response.send(output);

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