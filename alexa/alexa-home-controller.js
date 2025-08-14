/**
 * Modern Node-RED Alexa Home Controller
 * Provides Alexa device integration with improved error handling and maintainability
 */

"use strict";

module.exports = function (RED) {
  const alexaHome = require("./alexa-helper");
  const AlexaHub = require("./alexa-hub");
  const TemplateManager = require("./template-manager");
  const utils = require("./utils");
  const path = require("path");

  // Initialize template manager
  const templateManager = new TemplateManager(
    path.join(__dirname, "templates"),
  );

  /**
   * Enhanced error handling wrapper for route handlers
   * @param {Function} handler - Route handler function
   * @returns {Function} Wrapped handler with error handling
   */
  function withErrorHandling(handler) {
    return (req, res) => {
      try {
        handler(req, res);
      } catch (error) {
        RED.log.error(`Route handler error: ${error.message}`);
        res.status(500).json({ error: "Internal server error" });
      }
    };
  }

  /**
   * Get the ID of the first alexa-home-controller node
   * @returns {string|undefined} Controller node ID or undefined if none found
   */
  function getControllerId() {
    const results = [];
    RED.nodes.eachNode(function (n) {
      if (n.type === "alexa-home-controller") {
        results.push(n);
      }
    });
    return results.length > 0 ? results[0].id : undefined;
  }

  /**
   * Get controller node instance safely
   * @returns {Object|null} Controller node or null if not found
   */
  function getControllerNode() {
    const nodeId = getControllerId();
    return nodeId ? RED.nodes.getNode(nodeId) : null;
  }

  // Enhanced route handlers with better error handling
  RED.httpNode.get(
    "/alexa-home/setup.xml",
    withErrorHandling((req, res) => {
      const node = getControllerNode();
      if (!node) {
        res.status(503).send("Alexa Home Controller not available");
        return;
      }
      node.handleSetup(node.id, req, res);
    }),
  );

  RED.httpNode.post(
    "/api",
    withErrorHandling((req, res) => {
      const node = getControllerNode();
      if (!node) {
        res.status(503).json({ error: "Alexa Home Controller not available" });
        return;
      }
      node.handleRegistration(node.id, req, res);
    }),
  );

  // API route handlers with consistent error handling
  const apiRoutes = [
    { method: "get", path: "/api/", handler: "handleApiCall" },
    { method: "get", path: "/api/config", handler: "handleConfigList" },
    { method: "get", path: "/api/:username", handler: "handleApiCall" },
    {
      method: "get",
      path: "/api/:username/config",
      handler: "handleConfigList",
    },
    {
      method: "get",
      path: "/api/:username/:itemType",
      handler: "handleItemList",
    },
    {
      method: "post",
      path: "/api/:username/:itemType",
      handler: "handleItemList",
    },
    {
      method: "get",
      path: "/api/:username/:itemType/new",
      handler: "handleItemList",
    },
    {
      method: "get",
      path: "/api/:username/:itemType/:id",
      handler: "getItemInfo",
    },
    {
      method: "put",
      path: "/api/:username/:itemType/:id/state",
      handler: "controlItem",
    },
  ];

  apiRoutes.forEach((route) => {
    RED.httpNode[route.method](
      route.path,
      withErrorHandling((req, res) => {
        const node = getControllerNode();
        if (!node) {
          res.status(503).json({ error: "Controller not available" });
          return;
        }
        node[route.handler](node.id, req, res);
      }),
    );
  });

  /**
   * Modern Alexa Home Controller with enhanced features
   * @constructor
   * @param {Object} config - Node-RED configuration
   */
  function AlexaHomeController(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    try {
      // Initialize core properties
      alexaHome.controllerNode = node;
      node.name = config.controllername || "Alexa Home Controller";
      node._commands = new Map();
      node._hub = [];
      node.useNode = config.useNode || false;

      // Validate configuration: useNode and HTTPS are incompatible
      const configuredHttps =
        config.useHttps || process.env.ALEXA_HTTPS === "true" || false;

      if (node.useNode && configuredHttps) {
        node.error(
          "Invalid configuration: HTTPS cannot be used with 'Use Node as Webserver' option. HTTPS will be disabled.",
        );
        node.useHttps = false;
        node.httpsOptions = null;
      } else {
        node.useHttps = configuredHttps;

        // Configure HTTPS settings
        if (node.useHttps) {
          node.httpsOptions = node.configureHttps(config);
        }
      }

      // Configure port with protocol awareness
      node.port = node.configurePortWithProtocol(config.port, node.useHttps);

      // Generate network identifiers
      const mac = utils.generateMacAddress(config.id);
      node.macaddress = mac;
      node.bridgeid = utils.getBridgeIdFromMac(mac);
      node.maxItems = config.maxItems || 0;

      // Initialize template manager for this instance
      node.templateManager = templateManager;

      // Start services
      node.initializeHub();
      node.registerExistingNodes();
      node.setConnectionStatusMsg("green", "Ready");

      RED.log.info(
        `Alexa Home Controller '${node.name}' initialized on ${node.useHttps ? "https" : "http"}://0.0.0.0:${node.port}`,
      );
    } catch (error) {
      RED.log.error(`Failed to initialize controller: ${error.message}`);
      node.setConnectionStatusMsg("red", `Init failed: ${error.message}`);
    }

    // Enhanced cleanup on node close
    node.on("close", function (removed, done) {
      node
        .cleanup()
        .then(() => done())
        .catch((error) => {
          RED.log.warn(`Cleanup error: ${error.message}`);
          done();
        });
    });

    // Set global context
    const globalContext = this.context().global;
    globalContext.alexaHomeController = node;
  }

  /**
   * Configure port with validation and fallback
   * @param {string|number} configPort - Port from configuration
   * @returns {number} Validated port number
   */
  AlexaHomeController.prototype.configurePort = function (configPort) {
    if (configPort !== undefined && configPort !== null && configPort !== "") {
      const port = parseInt(configPort, 10);
      if (utils.isValidPort(port)) {
        return port;
      }
      this.warn(`Invalid port number: ${configPort}. Using default port.`);
    }
    return alexaHome.hubPort;
  };

  /**
   * Initialize hub services
   */
  AlexaHomeController.prototype.initializeHub = function () {
    const hubOptions = {
      useHttps: this.useHttps,
      httpsOptions: this.httpsOptions,
    };
    this._hub.push(new AlexaHub(this, this.port, this._hub.length, hubOptions));
  };

  /**
   * Register existing alexa-home nodes with this controller
   */
  AlexaHomeController.prototype.registerExistingNodes = function () {
    const node = this;
    RED.log.info("Assigning alexa-home nodes to this controller");

    RED.nodes.eachNode(function (n) {
      if (n.type === "alexa-home") {
        const deviceNode = RED.nodes.getNode(n.id);
        if (deviceNode) {
          node.registerCommand(deviceNode);
        }
      }
    });
  };

  /**
   * Configure port with protocol-aware defaults
   * @param {string|number} configPort - Port from configuration
   * @param {boolean} useHttps - Whether HTTPS is enabled
   * @returns {number} Validated port number
   */
  AlexaHomeController.prototype.configurePortWithProtocol = function (
    configPort,
    useHttps,
  ) {
    if (configPort !== undefined && configPort !== null && configPort !== "") {
      const port = parseInt(configPort, 10);
      if (utils.isValidPort(port)) {
        return port;
      }
      this.warn(`Invalid port number: ${configPort}. Using default port.`);
    }
    // Use appropriate default port based on protocol
    return useHttps ? 443 : alexaHome.hubPort;
  };

  /**
   * Configure HTTPS settings from configuration
   * @param {Object} config - Node configuration
   * @returns {Object|null} HTTPS options or null if configuration failed
   */
  AlexaHomeController.prototype.configureHttps = function (config) {
    const fs = require("fs");
    const path = require("path");

    try {
      // Use config values or environment variables
      const certPath = config.certPath || process.env.ALEXA_CERT_PATH;
      const keyPath = config.keyPath || process.env.ALEXA_KEY_PATH;
      const caPath = config.caPath || process.env.ALEXA_CA_PATH;

      if (!certPath || !keyPath) {
        this.error(
          "HTTPS enabled but certificate or key path not provided. Check config or ALEXA_CERT_PATH/ALEXA_KEY_PATH environment variables. Falling back to HTTP.",
        );
        this.useHttps = false;
        return null;
      }

      // Resolve paths and read certificate files
      const resolvedCertPath = path.resolve(certPath);
      const resolvedKeyPath = path.resolve(keyPath);

      if (!fs.existsSync(resolvedCertPath)) {
        this.error(
          `Certificate file not found: ${resolvedCertPath}. Falling back to HTTP.`,
        );
        this.useHttps = false;
        return null;
      }

      if (!fs.existsSync(resolvedKeyPath)) {
        this.error(
          `Private key file not found: ${resolvedKeyPath}. Falling back to HTTP.`,
        );
        this.useHttps = false;
        return null;
      }

      // Read certificate files
      const httpsOptions = {
        cert: fs.readFileSync(resolvedCertPath),
        key: fs.readFileSync(resolvedKeyPath),
      };

      // Add CA bundle if provided
      if (caPath && caPath.trim() !== "") {
        const resolvedCaPath = path.resolve(caPath);
        if (fs.existsSync(resolvedCaPath)) {
          httpsOptions.ca = fs.readFileSync(resolvedCaPath);
          RED.log.info("HTTPS configuration loaded with CA bundle");
        } else {
          this.warn(
            `CA bundle file not found: ${resolvedCaPath}. Continuing without CA bundle.`,
          );
        }
      }

      RED.log.info("HTTPS configuration loaded successfully");
      return httpsOptions;
    } catch (error) {
      this.error(
        `Failed to load HTTPS certificates: ${error.message}. Falling back to HTTP.`,
      );
      this.useHttps = false;
      return null;
    }
  };

  /**
   * Enhanced cleanup method
   * @returns {Promise} Cleanup completion promise
   */
  AlexaHomeController.prototype.cleanup = async function () {
    const node = this;

    try {
      // Stop all hubs
      const hubPromises = node._hub.map((hub) => {
        return new Promise((resolve) => {
          try {
            hub.stopServers(() => resolve());
          } catch (error) {
            RED.log.warn(`Error stopping hub: ${error.message}`);
            resolve();
          }
        });
      });

      await Promise.all(hubPromises);

      // Clear references
      node._hub.length = 0;
      node._commands.clear();
      alexaHome.controllerNode = undefined;

      RED.log.info(`Controller '${node.name}' cleaned up successfully`);
    } catch (error) {
      RED.log.error(`Cleanup failed: ${error.message}`);
      throw error;
    }
  };

  AlexaHomeController.prototype.generateMacAddress = function (id) {
    return utils.generateMacAddress(id);
  };

  AlexaHomeController.prototype.getBridgeIdFromMacAddress = function (mac) {
    return utils.getBridgeIdFromMac(mac);
  };

  AlexaHomeController.prototype.getDevices = function () {
    const node = this;
    return node._commands;
  };

  AlexaHomeController.prototype.getDevice = function (uuid) {
    const node = this;

    if (node._commands.has(uuid)) {
      return node._commands.get(uuid);
    }
    return undefined;
  };

  AlexaHomeController.prototype.getAlexaIPAddress = function (req) {
    return utils.getClientIP(req);
  };

  AlexaHomeController.prototype.registerCommand = function (deviceNode) {
    const node = this;

    deviceNode.updateController(node);
    node._commands.set(node.formatUUID(deviceNode.id), deviceNode);
    const itemCount =
      node.maxItems <= 0 || node.maxItems === undefined
        ? node._commands.size
        : node.maxItems;
    const currentNeed = Math.ceil(node._commands.size / itemCount);

    RED.log.debug(
      "upscaling: " +
        node.maxItems +
        "/" +
        node._commands.size +
        "/" +
        itemCount +
        "/" +
        currentNeed +
        "/" +
        node._hub.length,
    );
    if (currentNeed <= node._hub.length && node._hub.length > 0) {
      return;
    }
    node._hub.push(new AlexaHub(node, node.port, node._hub.length));
  };

  AlexaHomeController.prototype.deregisterCommand = function (deviceNode) {
    const node = this;

    node._commands.delete(node.formatUUID(deviceNode.id));
    if (node._commands.size === 0) {
      return;
    }
    const itemCount = node.maxItems <= 0 ? node._commands.size : node.maxItems;
    const currentNeed = Math.ceil(node._commands.size / itemCount);
    if (currentNeed >= node._hub.length) {
      return;
    }
    RED.log.debug("downscale");
    const hub = node._hub.pop();
    hub.stopServers(function () {});
  };

  AlexaHomeController.prototype.test = function (req, response) {
    let content = "--\n";
    const node = this;
    for (const [, v] of node._hub) {
      content += JSON.stringify(v) + "\n";
    }
    response.type("text").send(content);
  };

  AlexaHomeController.prototype.stripSpace = function (content) {
    return utils.stripWhitespace(content);
  };

  AlexaHomeController.prototype.handleIndex = function (id, request, response) {
    const node = this;

    try {
      RED.log.debug(`${node.name}/${id} - Handling index request`);

      const data = {
        id,
        uuid: utils.formatHueBridgeUUID(node.id, alexaHome.prefixUUID),
        baseUrl: `${node.useHttps ? "https" : "http"}://${request.headers.host}`,
      };

      const content = node.templateManager.render("index.html", data);
      response.type("html").send(Buffer.from(content));
    } catch (error) {
      RED.log.error(`Index handler error: ${error.message}`);
      response.status(500).send("Template rendering failed");
    }
  };

  AlexaHomeController.prototype.handleSetup = function (id, request, response) {
    const node = this;

    try {
      RED.log.debug(`${node.name}/${id} - Handling setup request`);

      const data = {
        uuid: utils.formatHueBridgeUUID(node.id, alexaHome.prefixUUID),
        baseUrl: `${node.useHttps ? "https" : "http"}://${request.headers.host}`,
      };

      const content = node.templateManager.render("setup.xml", data);
      node.setConnectionStatusMsg("green", "setup requested");
      response.type("xml").send(content);
    } catch (error) {
      RED.log.error(`Setup handler error: ${error.message}`);
      response.status(500).send("Setup failed");
    }
  };

  AlexaHomeController.prototype.handleRegistration = function (
    id,
    request,
    response,
  ) {
    const node = this;

    try {
      RED.log.debug(`${node.name}/${id} - Handling registration request`);

      const username =
        request.params.username || "c6260f982b43a226b5542b967f612ce";
      const data = { username };

      const content = node.templateManager.render("registration.json", data);
      response.type("json").send(content);
    } catch (error) {
      RED.log.error(`Registration handler error: ${error.message}`);
      response.status(500).json({ error: "Registration failed" });
    }
  };

  AlexaHomeController.prototype.handleItemList = function (
    id,
    request,
    response,
  ) {
    const node = this;

    try {
      RED.log.debug(
        `${node.name}/${id} - handling api item list request: ${request.params.itemType}`,
      );

      if (request.params.itemType !== "lights") {
        response.status(200).type("json").send("{}");
        return;
      }

      const data = {
        lights: node.generateAPIDeviceList(id),
        date: new Date().toISOString().split(".").shift(),
      };

      const content = node.templateManager.renderJson("list.json", data);

      RED.log.debug(
        `${node.name}/${id} - listing ${request.params.username} #${data.lights.length} api information to ${request.connection.remoteAddress}`,
      );

      node.setConnectionStatusMsg(
        "yellow",
        `${request.params.itemType} list requested: ${node._commands.size}`,
      );
      response.type("json").send(this.stripSpace(content));
    } catch (error) {
      RED.log.error(`Item list handler error: ${error.message}`);
      response.status(500).json({ error: "Failed to list items" });
    }
  };

  AlexaHomeController.prototype.handleConfigList = function (
    id,
    request,
    response,
  ) {
    const node = this;

    try {
      RED.log.debug(`${node.name}/${id} - Handling Config listing request`);

      const data = {
        address: request.hostname,
        username: request.params.username,
        date: new Date().toISOString().split(".").shift(),
        bridgeid: node.bridgeid,
        macaddress: node.macaddress,
      };

      const content = node.templateManager.render("config.json", data);

      RED.log.debug(
        `${node.name}/${id} - Sending ${request.params.username ? "full " : ""}config information to ${request.connection.remoteAddress}`,
      );

      node.setConnectionStatusMsg("yellow", "config requested");
      response.type("json").send(this.stripSpace(content));
    } catch (error) {
      RED.log.error(`Config list handler error: ${error.message}`);
      response.status(500).json({ error: "Failed to get config" });
    }
  };

  AlexaHomeController.prototype.handleApiCall = function (
    id,
    request,
    response,
  ) {
    const node = this;

    try {
      RED.log.debug(`${node.name}/${id} - Handling API listing request`);

      const data = {
        lights: node.generateAPIDeviceList(id),
        address: request.hostname,
        username: request.params.username,
        date: new Date().toISOString().split(".").shift(),
        bridgeid: node.bridgeid,
        macaddress: node.macaddress,
      };

      // Use template manager with partials support
      const partials = {
        itemsTemplate: node.templateManager.getTemplate("list.json"),
        configTemplate: node.templateManager.getTemplate("config.json"),
      };

      const content = node.templateManager.render(
        "response.json",
        data,
        partials,
      );

      RED.log.debug(
        `${node.name}/${id} - Sending ${request.params.username} #${data.lights.length} api information to ${request.connection.remoteAddress}`,
      );

      node.setConnectionStatusMsg("yellow", "api requested");
      response.type("json").send(this.stripSpace(content));
    } catch (error) {
      RED.log.error(`API call handler error: ${error.message}`);
      response.status(500).json({ error: "Failed to handle API call" });
    }
  };

  AlexaHomeController.prototype.generateAPIDeviceList = function (id) {
    const deviceList = [];
    const node = this;
    const itemCount =
      node.maxItems <= 0 || node.maxItems === undefined
        ? node._commands.size
        : node.maxItems;
    const startItem = id * itemCount + 1;
    const endItem = (id + 1) * itemCount + 1;
    let count = 0;
    RED.log.debug(
      node.name +
        "/" +
        id +
        " - starting at " +
        (startItem - 1) +
        " till " +
        (endItem - 1) +
        " at #" +
        node._commands.size,
    );
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

  AlexaHomeController.prototype.generateAPIDevice = function (uuid, node) {
    const defaultAttributes = {
      on: node.state || false,
      bri: node.bri,
      devicetype: node.devicetype,
      x: node.xy[0],
      y: node.xy[1],
      hue: 0,
      sat: 254,
      ct: 199,
      colormode: "ct",
      uniqueid: node.uniqueid,
    };

    return defaultAttributes;
  };

  AlexaHomeController.prototype.controlItem = function (id, request, response) {
    const node = this;

    try {
      if (request.params.itemType !== "lights") {
        response.status(200).send("{}");
        return;
      }

      const username = request.params.username;
      const uuid = request.params.id.replace("/", "");
      const targetNode = node.getDevice(uuid);

      if (!targetNode) {
        RED.log.warn(
          `Control item - unknown alexa node of type ${request.params.itemType} was requested: ${uuid}`,
        );
        response.status(502).type("json").send("{}");
        return;
      }

      const msg = {
        username,
        payload: request.body,
        alexa_ip: node.getAlexaIPAddress(request),
      };

      // Add debug headers if enabled
      if (alexaHome.isDebug) {
        Object.keys(request.headers).forEach((key) => {
          msg[`http_header_${key}`] = request.headers[key];
        });
      }

      targetNode.processCommand(msg);

      const data = node.generateAPIDevice(uuid, targetNode);
      const content = node.templateManager.render("set-state.json", data);
      const output = content.replace(/\s/g, "");

      response.type("json").send(this.stripSpace(output));
    } catch (error) {
      RED.log.error(`Control item error: ${error.message}`);
      response.status(500).json({ error: "Control failed" });
    }
  };

  AlexaHomeController.prototype.getItemInfo = function (id, request, response) {
    const node = this;

    try {
      if (request.params.itemType !== "lights") {
        response.status(200).end("{}");
        return;
      }

      const uuid = request.params.id;
      const targetNode = node.getDevice(uuid);

      if (!targetNode) {
        RED.log.warn(
          `Unknown alexa node of type ${request.params.itemType} was requested: ${uuid}`,
        );
        response.status(502).type("json").send("{}");
        return;
      }

      const data = node.generateAPIDevice(uuid, targetNode);
      data.name = targetNode.name;
      data.date = new Date().toISOString().split(".").shift();

      const content = node.templateManager.render("get-state.json", data);
      const output = content.replace(/\s/g, "");

      response.type("json").send(this.stripSpace(output));
    } catch (error) {
      RED.log.error(`Get item info error: ${error.message}`);
      response.status(500).json({ error: "Failed to get item info" });
    }
  };

  AlexaHomeController.prototype.setConnectionStatusMsg = function (
    color,
    text,
    shape,
  ) {
    shape = shape || "dot";
    this.status({
      fill: color,
      shape,
      text,
    });
  };

  AlexaHomeController.prototype.formatUUID = function (lightId) {
    return utils.formatUUID(lightId);
  };

  AlexaHomeController.prototype.formatHueBridgeUUID = function (lightId) {
    return utils.formatHueBridgeUUID(lightId, alexaHome.prefixUUID);
  };

  RED.nodes.registerType("alexa-home-controller", AlexaHomeController);
};
