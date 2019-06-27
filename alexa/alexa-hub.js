
const alexa_home = require('./alexa-helper');
const express = require('express');
const bodyParser = require('body-parser');
const stoppable = require('stoppable');


function AlexaHub(controller, id, options) {

    var node = this;

    node.controller = controller;
    node.id = id;
    node.port = alexa_home.hubPort + id;

    var protocol = (options === undefined) ? "http" : "https";
    node.createServer( protocol, options);
    node.startSsdp( protocol);

}

AlexaHub.prototype.createServer = function (protocol, options) {

    var node = this;
    const graceMilliseconds = 250;
    var app = express();

    node.httpServer = stoppable(require(protocol).createServer(options, app), graceMilliseconds);
    node.server = node.httpServer.listen(node.port, function (error) {

        app.on('error', function (error) {
            node.controller.log(error);
            return;
        });

        app.use(bodyParser.json({ type: '*/*' }));

        app.use(function (err, req, res, next) {
            if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
                node.controller.log("Error: Invalid JSON request: " + JSON.stringify(err.body));
            }
            next();
        });

        app.use(function (req, res, next) {
            node.controller.log(node.port + " -> " + req.url)
            if (Object.keys(req.body).length > 0)
                node.controller.log("Request body: " + JSON.stringify(req.body));
            next();
        });

        app.get('/', function (req, res) {
            node.controller.handleIndex(node.id, req, res);
        })

        app.get('/alexa-home/setup.xml', function (req, res) {
            node.controller.handleSetup(node.id, req, res);
        });

        app.post('/api', function (req, res) {
            node.controller.handleRegistration(node.id, req, res);
        })

        app.get("/api/", function (req, res) {
            node.controller.handleApiCall(node.id, req, res);
        })

        app.get("/api/:username", function (req, res) {
            node.controller.handleApiCall(node.id, req, res);
        })

        app.get("/api/:username/:itemType", function (req, res) {
            node.controller.handleItemList(node.id, req, res);
        })

        app.get("/api/:username/:itemType/:id", function (req, res) {
            node.controller.getItemInfo(node.id, req, res);
        })

        app.put('/api/:username/:itemType/:id/state', function (req, res) {
            node.controller.controlItem(node.id, req, res);
        });
        app.get("/test", function (req, res) {
            node.controller.test(req, res);
        })

    });
}

AlexaHub.prototype.stopServers = function () {
    var node = this;
    node.controller.log("Stopping ssdp");
    node.ssdpServer.stop()
    node.controller.log("Stopping app")
    node.server.close(function () {
        node.controller.log("stopped http")
    })
}
AlexaHub.prototype.startSsdp = function ( protocol) {

    var node = this;
    node.controller.log(node.id + " - alexa-home - Starting SSDP");
    var hueuuid = node.controller.formatHueBridgeUUID(node.id);
    const ssdp = require("node-ssdp").Server;
    node.ssdpServer = new ssdp({
        location: {
            protocol: protocol + "://",
            port: node.port,
            path: "/alexa-home/setup.xml"
        },
        udn: 'uuid:' + hueuuid
    });
    node.ssdpServer.addUSN('upnp:rootdevice');
    node.ssdpServer.addUSN('urn:schemas-upnp-org:device:basic:1')
    node.ssdpServer.reuseAddr = true;
    node.ssdpServer.start();
    node.controller.log(node.id + " - announcing: " + protocol + "://*:" + node.port + "/alexa-home/setup.xml");
}


module.exports =  AlexaHub;
