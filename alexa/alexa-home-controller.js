
module.exports = function (RED) {

    "use strict"

    const prefixUUID = "f6543a06-da50-11ba-8d8f-";
    const maxItemCount = 30;

    var Mustache = require('mustache'),
        fs = require('fs'),
        alexa_home = require('./alexa-helper'),
        alexa_hub = require('./alexa-hub');

    function AlexaHomeController(config) {

        RED.nodes.createNode(this, config)
        var node = this
        alexa_home.controllerNode = node

        node.name = config.controllername
        node._commands = new Map()
        node._hub = []
        node._hub.push(new alexa_hub(node, 0, RED.settings.https))

        node.on('close', function (removed, done) {

            try {
                while (node._hub.length > 0) {
                    var hub = node._hub.pop();
                    hub.stopServers();
                }

            } catch (error) {
                RED.log.warn("Error at closing hubs: " + error);
            }
            alexa_home.controllerNode = undefined;
            done();
        })

        node.setConnectionStatusMsg("yellow", "setup done")

        RED.log.info("Assigning alexa-home nodes to this controller")

        RED.nodes.eachNode(function (n) {
            if (n.type == "alexa-home") {
                var x = RED.nodes.getNode(n.id)
                if (x) {
                    node.registerCommand(x)
                }
            }
        })
        node.setConnectionStatusMsg("green", "ok")
    }

    AlexaHomeController.prototype.getDevices = function () {
        return this._commands;
    }

    AlexaHomeController.prototype.getDevice = function (uuid) {
        if (this._commands.has(uuid)) {
            return this._commands.get(uuid)
        }
        return undefined;
    }

    AlexaHomeController.prototype.registerCommand = function (deviceNode) {
        deviceNode.updateController(this)
        this._commands.set(this.formatUUID(deviceNode.id), deviceNode)
        var currentNeed = Math.ceil(this._commands.size / maxItemCount)
        if (currentNeed <= this._hub.length) {
            return
        }
        RED.log.debug("upscaling: " + currentNeed + "/" + this._hub.length)
        this._hub.push(new alexa_hub(this, this._hub.length, RED.settings.https))
    }

    AlexaHomeController.prototype.deregisterCommand = function (deviceNode) {
        this._commands.delete(this.formatUUID(deviceNode.id))
        if (this._commands.size == 0) {
            return
        }
        var currentNeed = Math.ceil(this._commands.size / maxItemCount)
        if (currentNeed >= this._hub.length) {
            return
        }
        RED.log.debug("downscale");
        var hub = this._hub.pop();
        hub.stopServers(function () { });
    }

    AlexaHomeController.prototype.test = function (req, res) {
        res.set({
            'Content-Type': 'text/plain'
        })
        var content = "--\n";
        var node = this;
        for (const [k, v] of node._hub) {
            content += JSON.stringify(v) + "\n";
        }
        res.send(content);
    }

    AlexaHomeController.prototype.stripSpace = function (content) {
        while (content.indexOf('  ') > 0) {
            content = content.replace(/  /g, '')
        }
        content = content.replace(/\r?\n/g, '')
        return content
    }
    AlexaHomeController.prototype.handleIndex = function (id, request, response) {
        RED.log.debug(this.name + "/" + id + " - Handling index request")
        var template = fs.readFileSync(__dirname + '/templates/index.html', 'utf8').toString()
        var data = {
            id: id,
            uuid: this.formatHueBridgeUUID(this.id),
            baseUrl: (RED.settings.https == undefined ? "https" : "http") + "://" + request.headers["host"]
        }
        var content = Mustache.render(template, data)
        response.writeHead(200, {
            'Content-Type': 'text/html; charset=UTF-8'
        })
        response.end(content)
    }
    AlexaHomeController.prototype.handleSetup = function (id, request, response) {
        RED.log.debug(this.name + "/" + id + " - Handling setup request")
        var template = fs.readFileSync(__dirname + '/templates/setup.xml', 'utf8').toString()
        var data = {
            uuid: this.formatHueBridgeUUID(this.id),
            baseUrl: (RED.settings.https == undefined ? "https" : "http") + "://" + request.headers["host"]
        }
        var content = Mustache.render(template, data)
        this.setConnectionStatusMsg("green", "setup requested")
        response.writeHead(200, {
            'Content-Type': 'application/xml; charset=UTF-8'
        })
        response.end(content)
    }

    AlexaHomeController.prototype.handleRegistration = function (id, request, response) {
        RED.log.debug(this.name + "/" + id + " - Handling registration request")
        var template = fs.readFileSync(__dirname + '/templates/registration.json', 'utf8').toString()
        var data = {
            username: request.params.username
        }
        var content = Mustache.render(template, data)
        this.setConnectionStatusMsg("green", "registration succeded")
        response.set({
            'Content-Type': 'application/json'
        })
        response.send(content)
    }

    // max response size of alexa seems at content-length=14173 
    AlexaHomeController.prototype.handleItemList = function (id, request, response) {
        RED.log.debug(this.name + "/" + id + " - handling api item list request: " + request.params.itemType)
        if (request.params.itemType !== "lights") {
            response.status(404).end("")
            return
        }
        var template = fs.readFileSync(__dirname + '/templates/items/list.json', 'utf8').toString()
        var data = {
            lights: this.generateAPIDeviceList(id),
            date: new Date().toISOString().split('.').shift()
        }
        var content = Mustache.render(template, data)
        RED.log.debug(this.name + + "/" + id + " - listing " + request.params.username + " #" + data.lights.length + " api information to " + request.connection.remoteAddress)
        this.setConnectionStatusMsg("yellow", request.params.itemType + " list requested: " + this._commands.size)
        response.set({
            'Content-Type': 'application/json'
        })
        response.send(this.stripSpace(content))
    }

    AlexaHomeController.prototype.handleApiCall = function (id, request, response) {
        RED.log.debug(this.name + "/" + id + " - Hanlding API listing request")
        var responseTemplate = fs.readFileSync(__dirname + '/templates/response.json', 'utf8').toString()
        var lights = fs.readFileSync(__dirname + '/templates/items/list.json', 'utf8').toString()
        var data = {
            lights: this.generateAPIDeviceList(id),
            address: request.hostname,
            username: request.params.username,
            date: new Date().toISOString().split('.').shift()
        }
        var content = Mustache.render(responseTemplate, data, {
            itemsTemplate: lights
        })
        RED.log.debug(this.name + + "/" + id + " - Sending " + request.params.username + " #" + data.lights.length + " api information to " + request.connection.remoteAddress)
        this.setConnectionStatusMsg("yellow", "api requested")
        response.set({
            'Content-Type': 'application/json'
        })
        response.send(this.stripSpace(content))
    }

    AlexaHomeController.prototype.generateAPIDeviceList = function (id) {
        var deviceList = []
        var startItem = (id * maxItemCount) + 1
        var endItem = ((id + 1) * maxItemCount) + 1
        var count = 0
        RED.log.debug(this.name + "/" + id + " - starting at " + (startItem - 1) + " till " + (endItem - 1) + " at #" + this._commands.size)
        for (const [uuid, dev] of this._commands) {
            count += 1
            if (count < startItem) {
                continue
            }
            if (count >= endItem) {
                break;
            }
            var device = {
                id: uuid,
                name: dev.name
            }
            var deviceData = this.generateAPIDevice(uuid, dev)
            deviceList.push(Object.assign({}, deviceData, device))
        }
        return deviceList
    }

    AlexaHomeController.prototype.generateAPIDevice = function (uuid, node) {

        var defaultAttributes = {
            on: node.state,
            bri: node.bri,
            devicetype: node.devicetype,
            x: node.xy[0],
            y: node.xy[1],
            hue: 0,
            sat: 254,
            ct: 199,
            colormode: "ct"
        }

        return defaultAttributes

    }

    AlexaHomeController.prototype.controlItem = function (id, request, response) {

        if (request.params.itemType !== "lights") {
            response.status(404).end("")
            return
        }

        var template = fs.readFileSync(__dirname + '/templates/items/set-state.json', 'utf8').toString()
        var token = request.params.username
        var uuid = request.params.id
        uuid = uuid.replace("/", "")
        var targetNode = this.getDevice(uuid)
        if (targetNode === undefined) {
            RED.log.warn("control item - unknown alexa node of type " + request.params.itemType + " was requested: " + uuid)
            response.status(502).end()
            return
        }

        var msg = {
            payload: request.body
        }

        msg.alexa_ip = request.headers['x-forwarded-for'] ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            request.connection.socket.remoteAddress

        if (alexa_home.isDebug) {
            var header_names = Object.keys(request.headers)
            header_names.forEach(function (key) {
                msg["http_header_" + key] = request.headers[key]
            })
        }
        targetNode.processCommand(msg)

        var data = this.generateAPIDevice(uuid, targetNode)
        var output = Mustache.render(template, data).replace(/\s/g, '')
        response.set({
            'Content-Type': 'application/json'
        })
        response.send(output)
    }

    AlexaHomeController.prototype.getItemInfo = function (id, request, response) {

        if (request.params.itemType !== "lights") {
            response.status(404).end("")
            return
        }

        var template = fs.readFileSync(__dirname + '/templates/items/get-state.json', 'utf8').toString()

        var token = request.params.username
        var uuid = request.params.id

        var targetNode = this.getDevice(uuid)
        if (targetNode === undefined) {
            RED.log.warn("unknown alexa node of type " + request.params.itemType + " was requested: " + uuid)
            response.status(502).end()
            return
        }
        var data = this.generateAPIDevice(uuid, targetNode)
        data.name = targetNode.name
        data.date = new Date().toISOString().split('.').shift()
        var output = Mustache.render(template, data).replace(/\s/g, '')
        response.set({
            'Content-Type': 'application/json'
        })
        response.send(output)

    }

    AlexaHomeController.prototype.setConnectionStatusMsg = function (color, text, shape) {
        shape = shape || 'dot'
        this.status({
            fill: color,
            shape: shape,
            text: text
        })
    }

    AlexaHomeController.prototype.formatUUID = function (lightId) {
        if (lightId === null || lightId === undefined)
            return "";

        var string = ("" + lightId);
        return string.replace(".", "").trim();
    }

    AlexaHomeController.prototype.formatHueBridgeUUID = function (lightId) {
        if (lightId === null || lightId === undefined)
            return "";
        var uuid = prefixUUID;
        uuid += this.formatUUID(lightId);
        return uuid;
    }

    RED.nodes.registerType("alexa-home-controller", AlexaHomeController)

}