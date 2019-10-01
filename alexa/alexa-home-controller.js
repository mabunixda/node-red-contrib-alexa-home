
module.exports = function(RED) {
  'use strict';

  const Mustache = require('mustache');
  const fs = require('fs');
  const alexaHome = require('./alexa-helper');
  const AlexaHub = require('./alexa-hub');

  /**
   * generates a controller node which manages the creation
   * of hubs to communicate with alexa devices
   * @constructor
   * @param {map} config nodered configuration
   */
  function AlexaHomeController(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    alexaHome.controllerNode = node;
    node.name = config.controllername;
    if (config.port === undefined || config.port === null) {
      node.port = alexaHome.hubPort;
    } else {
      node.port = parseInt(config.port);
    }
    node.maxItems = config.maxItems;
    node._commands = new Map();
    node._hub = [];
    node._hub.push(new AlexaHub(this, node.port, this._hub.length));

    node.on('close', function(removed, done) {
      try {
        while (node._hub.length > 0) {
          const hub = node._hub.pop();
          hub.stopServers();
        }
      } catch (error) {
        RED.log.warn('Error at closing hubs: ' + error);
      }
      alexaHome.controllerNode = undefined;
      done();
    });

    node.setConnectionStatusMsg('yellow', 'setup done');

    RED.log.info('Assigning alexa-home nodes to this controller');

    RED.nodes.eachNode(function(n) {
      if (n.type == 'alexa-home') {
        const x = RED.nodes.getNode(n.id);
        if (x) {
          node.registerCommand(x);
        }
      }
    });
    node.setConnectionStatusMsg('green', 'Ok');
  }

  AlexaHomeController.prototype.getDevices = function() {
    const node = this;
    return node._commands;
  };

  AlexaHomeController.prototype.getDevice = function(uuid) {
    const node = this;

    if (node._commands.has(uuid)) {
      return node._commands.get(uuid);
    }
    return undefined;
  };

  AlexaHomeController.prototype.registerCommand = function(deviceNode) {
    const node = this;

    deviceNode.updateController(node);
    node._commands.set(node.formatUUID(deviceNode.id), deviceNode);
    const itemCount = node.maxItems <= 0 ? node._commands.size : node.maxItems;
    const currentNeed = Math.ceil(node._commands.size / itemCount);
    if (currentNeed <= node._hub.length && node._hub.length > 0) {
      return;
    }
    RED.log.debug('upscaling: ' + currentNeed + '/' + node._hub.length);
    node._hub.push(new AlexaHub(node, node.port, node._hub.length));
  };

  AlexaHomeController.prototype.deregisterCommand = function(deviceNode) {
    const node = this;

    node._commands.delete(node.formatUUID(deviceNode.id));
    if (node._commands.size == 0) {
      return;
    }
    const itemCount = node.maxItems <= 0 ? node._commands.size : node.maxItems;
    const currentNeed = Math.ceil(node._commands.size / itemCount);
    if (currentNeed >= node._hub.length) {
      return;
    }
    RED.log.debug('downscale');
    const hub = node._hub.pop();
    hub.stopServers(function() { });
  };

  AlexaHomeController.prototype.test = function(req, res) {
    res.set({
      'Content-Type': 'text/plain',
    });
    let content = '--\n';
    const node = this;
    for (const [, v] of node._hub) {
      content += JSON.stringify(v) + '\n';
    }
    res.send(content);
  };

  AlexaHomeController.prototype.stripSpace = function(content) {
    while (content.indexOf('  ') > 0) {
      content = content.replace(/  /g, '');
    }
    content = content.replace(/\r?\n/g, '');
    return content;
  };
  AlexaHomeController.prototype.handleIndex = function(id, request, response) {
    const node = this;

    RED.log.debug(node.name + '/' + id + ' - Handling index request');
    const template = fs.readFileSync(__dirname +
      '/templates/index.html', 'utf8').toString();
    const data = {
      id: id,
      uuid: node.formatHueBridgeUUID(node.id),
      baseUrl: 'http://' + request.headers['host'],
    };
    const content = Mustache.render(template, data);
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=UTF-8',
    });
    response.end(content);
  };
  AlexaHomeController.prototype.handleSetup = function(id, request, response) {
    const node = this;

    RED.log.debug(node.name + '/' + id + ' - Handling setup request');
    const template = fs.readFileSync(__dirname +
      '/templates/setup.xml', 'utf8').toString();
    const data = {
      uuid: node.formatHueBridgeUUID(node.id),
      baseUrl: 'http://' + request.headers['host'],
    };
    const content = Mustache.render(template, data);
    node.setConnectionStatusMsg('green', 'setup requested');
    response.writeHead(200, {
      'Content-Type': 'application/xml; charset=UTF-8',
    });
    response.end(content);
  };

  AlexaHomeController.prototype.handleRegistration = function(id,
      request,
      response) {
    const node = this;

    RED.log.debug(node.name + '/' + id + ' - Handling registration request');
    const template = fs.readFileSync(__dirname +
      '/templates/registration.json', 'utf8').toString();

    let username = request.params.username;
    if (username === undefined || username === null) {
      username = 'c6260f982b43a226b5542b967f612ce';
    }
    const data = {
      username: username,
    };
    const content = Mustache.render(template, data);
    node.setConnectionStatusMsg('green', 'registration succeded');
    response.set({
      'Content-Type': 'application/json',
    });
    response.send(content);
  };

  // max response size of alexa seems at content-length=14173
  AlexaHomeController.prototype.handleItemList = function(id,
      request,
      response) {
    const node = this;

    RED.log.debug(node.name + '/' + id +
      ' - handling api item list request: ' + request.params.itemType);
    if (request.params.itemType !== 'lights') {
      response.status(200).end('{}');
      return;
    }
    const template = fs.readFileSync(__dirname +
      '/templates/items/list.json', 'utf8').toString();
    const data = {
      lights: node.generateAPIDeviceList(id),
      date: new Date().toISOString().split('.').shift(),
    };
    const content = Mustache.render(template, data);
    RED.log.debug(node.name + + '/' + id +
      ' - listing ' + request.params.username +
      ' #' + data.lights.length + ' api information to ' +
      request.connection.remoteAddress);
    node.setConnectionStatusMsg('yellow', request.params.itemType +
      ' list requested: ' + node._commands.size);
    response.set({
      'Content-Type': 'application/json',
    });
    response.send(node.stripSpace(content));
  };

  AlexaHomeController.prototype.handleApiCall = function(id,
      request,
      response) {
    const node = this;

    RED.log.debug(node.name + '/' + id + ' - Hanlding API listing request');
    const responseTemplate = fs.readFileSync(__dirname +
      '/templates/response.json', 'utf8').toString();
    const lights = fs.readFileSync(__dirname +
      '/templates/items/list.json', 'utf8').toString();
    const data = {
      lights: node.generateAPIDeviceList(id),
      address: request.hostname,
      username: request.params.username,
      date: new Date().toISOString().split('.').shift(),
    };
    const content = Mustache.render(responseTemplate, data, {
      itemsTemplate: lights,
    });
    RED.log.debug(node.name + + '/' + id + ' - Sending ' +
      request.params.username + ' #' + data.lights.length +
      ' api information to ' + request.connection.remoteAddress);
    node.setConnectionStatusMsg('yellow', 'api requested');
    response.set({
      'Content-Type': 'application/json',
    });
    response.send(node.stripSpace(content));
  };

  AlexaHomeController.prototype.generateAPIDeviceList = function(id) {
    const deviceList = [];
    const node = this;
    const itemCount = node.maxItems <= 0 ? node._commands.size : node.maxItems;
    const startItem = (id * itemCount) + 1;
    const endItem = ((id + 1) * itemCount) + 1;
    let count = 0;
    RED.log.debug(node.name + '/' + id + ' - starting at ' + (startItem - 1) +
      ' till ' + (endItem - 1) + ' at #' + node._commands.size);
    for (const [uuid, dev] of node._commands) {
      count += 1;
      if (count < startItem) {
        continue;
      }
      if (count >= endItem) {
        break;
      }
      const device = {
        id: uuid,
        name: dev.name,
      };
      const deviceData = node.generateAPIDevice(uuid, dev);
      deviceList.push(Object.assign({}, deviceData, device));
    }
    return deviceList;
  };

  AlexaHomeController.prototype.generateAPIDevice = function(uuid, node) {
    const defaultAttributes = {
      on: node.state,
      bri: node.bri,
      devicetype: node.devicetype,
      x: node.xy[0],
      y: node.xy[1],
      hue: 0,
      sat: 254,
      ct: 199,
      colormode: 'ct',
    };

    return defaultAttributes;
  };

  AlexaHomeController.prototype.controlItem = function(id, request, response) {
    if (request.params.itemType !== 'lights') {
      response.status(200).end('{}');
      return;
    }
    const node = this;

    const template = fs.readFileSync(__dirname +
      '/templates/items/set-state.json', 'utf8').toString();
    const username = request.params.username;
    let uuid = request.params.id;
    uuid = uuid.replace('/', '');
    const targetNode = node.getDevice(uuid);
    if (targetNode === undefined) {
      RED.log.warn('control item - unknown alexa node of type ' +
        request.params.itemType + ' was requested: ' + uuid);

      response.status(502).end();
      return;
    }

    const msg = {
      username: username,
      payload: request.body,
    };

    msg.alexa_ip = request.headers['x-forwarded-for'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      request.connection.socket.remoteAddress;

    if (alexaHome.isDebug) {
      const httpHeader = Object.keys(request.headers);
      httpHeader.forEach(function(key) {
        msg['http_header_' + key] = request.headers[key];
      });
    }
    targetNode.processCommand(msg);

    const data = node.generateAPIDevice(uuid, targetNode);
    const output = Mustache.render(template, data).replace(/\s/g, '');
    response.set({
      'Content-Type': 'application/json',
    });
    response.send(output);
  };

  AlexaHomeController.prototype.getItemInfo = function(id, request, response) {
    if (request.params.itemType !== 'lights') {
      response.status(200).end('{}');
      return;
    }
    const node = this;

    const template = fs.readFileSync(__dirname +
      '/templates/items/get-state.json', 'utf8').toString();

    // const username = request.params.username;
    const uuid = request.params.id;

    const targetNode = node.getDevice(uuid);
    if (targetNode === undefined) {
      RED.log.warn('unknown alexa node of type ' +
        request.params.itemType + ' was requested: ' + uuid);
      response.status(502).end();
      return;
    }
    const data = node.generateAPIDevice(uuid, targetNode);
    data.name = targetNode.name;
    data.date = new Date().toISOString().split('.').shift();
    const output = Mustache.render(template, data).replace(/\s/g, '');
    response.set({
      'Content-Type': 'application/json',
    });
    response.send(output);
  };

  AlexaHomeController.prototype.setConnectionStatusMsg = function(color,
      text,
      shape) {
    shape = shape || 'dot';
    this.status({
      fill: color,
      shape: shape,
      text: text,
    });
  };

  AlexaHomeController.prototype.formatUUID = function(lightId) {
    if (lightId === null || lightId === undefined) {
      return '';
    }

    const string = ('' + lightId);
    return string.replace('.', '').trim();
  };

  AlexaHomeController.prototype.formatHueBridgeUUID = function(lightId) {
    if (lightId === null || lightId === undefined) {
      return '';
    }
    let uuid = alexaHome.prefixUUID;
    uuid += this.formatUUID(lightId);
    return uuid;
  };

  RED.nodes.registerType('alexa-home-controller', AlexaHomeController);
};
