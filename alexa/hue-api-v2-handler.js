/**
 * Philips Hue API v2 Handler
 * Implements the new resource-based API architecture for better Alexa compatibility
 */

"use strict";

const { v4: uuidv4 } = require("uuid");

class HueApiV2Handler {
  constructor(controller, templateManager) {
    this.controller = controller;
    this.templateManager = templateManager;
    this.eventClients = new Set();
    this.resourceCache = new Map();

    // v2 API version and compatibility
    this.apiVersion = "1.56.0";
    this.swVersion = "1950074020";
    this.datastoreVersion = "126";
  }

  /**
   * Handle v2 resource requests
   * @param {number} hubId - Hub identifier
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  handleResourceRequest(hubId, req, res) {
    try {
      const { resourceType } = req.params;
      const method = req.method.toLowerCase();

      // Handle different resource types
      switch (resourceType) {
        case "light":
          this.handleLightResource(hubId, req, res, method);
          break;
        case "device":
          this.handleDeviceResource(hubId, req, res, method);
          break;
        case "room":
          this.handleRoomResource(hubId, req, res, method);
          break;
        case "zone":
          this.handleZoneResource(hubId, req, res, method);
          break;
        case "scene":
          this.handleSceneResource(hubId, req, res, method);
          break;
        case "bridge":
          this.handleBridgeResource(hubId, req, res, method);
          break;
        case "bridge_home":
          this.handleBridgeHomeResource(hubId, req, res, method);
          break;
        default:
          this.sendV2ErrorResponse(
            res,
            3,
            `/clip/v2/resource/${resourceType}`,
            "resource not available",
          );
          return;
      }
    } catch (error) {
      this.controller.error(`v2 Resource request error: ${error.message}`);
      this.sendV2ErrorResponse(res, 1, req.url, "internal error");
    }
  }

  /**
   * Handle light resource operations (v2)
   */
  handleLightResource(hubId, req, res, method) {
    if (method === "get") {
      const lightId = req.params.id;

      if (lightId) {
        // Get specific light
        this.getLightResource(hubId, lightId, req, res);
      } else {
        // Get all lights
        this.getAllLightResources(hubId, req, res);
      }
    } else if (method === "put") {
      // Update light state
      this.updateLightResource(hubId, req, res);
    }
  }

  /**
   * Get all light resources in v2 format
   */
  getAllLightResources(hubId, req, res) {
    const lights = [];

    this.controller._commands.forEach((deviceNode, uuid) => {
      const lightData = this.generateV2LightData(uuid, deviceNode);
      lights.push(lightData);
    });

    const response = {
      errors: [],
      data: lights,
    };

    res.type("application/json").send(JSON.stringify(response, null, 2));
  }

  /**
   * Get specific light resource in v2 format
   */
  getLightResource(hubId, lightId, req, res) {
    const deviceNode = this.controller._commands.get(lightId);

    if (!deviceNode) {
      this.sendV2ErrorResponse(
        res,
        3,
        `/clip/v2/resource/light/${lightId}`,
        "resource not available",
      );
      return;
    }

    const lightData = this.generateV2LightData(lightId, deviceNode);

    const response = {
      errors: [],
      data: [lightData],
    };

    res.type("application/json").send(JSON.stringify(response, null, 2));
  }

  /**
   * Update light resource state (v2)
   */
  updateLightResource(hubId, req, res) {
    const lightId = req.params.id;
    const deviceNode = this.controller._commands.get(lightId);

    if (!deviceNode) {
      this.sendV2ErrorResponse(
        res,
        3,
        `/clip/v2/resource/light/${lightId}`,
        "resource not available",
      );
      return;
    }

    const updateData = req.body;
    const responses = [];

    // Handle v2 API structure updates
    if (updateData.on !== undefined) {
      deviceNode.receive({ payload: { on: updateData.on.on }, output: false });
      responses.push({
        success: {
          rid: lightId,
          rtype: "light",
        },
      });
    }

    if (updateData.dimming !== undefined) {
      // Convert v2 brightness (0-100) to v1 brightness (0-254)
      const v1Brightness = Math.round(
        (updateData.dimming.brightness / 100) * 254,
      );
      deviceNode.receive({ payload: { bri: v1Brightness }, output: false });
      responses.push({
        success: {
          rid: lightId,
          rtype: "light",
        },
      });
    }

    if (updateData.color !== undefined) {
      const payload = {};
      if (updateData.color.xy) {
        payload.x = updateData.color.xy.x;
        payload.y = updateData.color.xy.y;
      }
      deviceNode.receive({ payload, output: false });
      responses.push({
        success: {
          rid: lightId,
          rtype: "light",
        },
      });
    }

    if (updateData.color_temperature !== undefined) {
      deviceNode.receive({
        payload: { ct: updateData.color_temperature.mirek },
        output: false,
      });
      responses.push({
        success: {
          rid: lightId,
          rtype: "light",
        },
      });
    }

    // Send v2 response format
    const response = {
      errors: [],
      data: responses,
    };

    res.type("application/json").send(JSON.stringify(response, null, 2));

    // Emit event for SSE clients
    this.emitResourceUpdate("light", lightId, updateData);
  }

  /**
   * Generate v2 light data structure
   */
  generateV2LightData(lightId, deviceNode) {
    const state = deviceNode.state || {};
    const brightness = Math.round(((state.bri || 0) / 254) * 100);

    const lightData = {
      id: lightId,
      id_v1: `/lights/${lightId}`,
      type: "light",
      metadata: {
        name: deviceNode.name || deviceNode.devicename || "Light",
        archetype: this.mapDeviceTypeToArchetype(deviceNode.devicetype),
      },
      service_id: 0,
      on: {
        on: state.on || false,
      },
      dimming: {
        brightness: brightness,
        min_dim_level: 0.2,
      },
      dynamics: {
        status: "none",
        status_values: ["none", "dynamic_palette"],
        speed: 0.0,
        speed_valid: false,
      },
      alert: {
        action_values: ["breathe"],
      },
      signaling: {
        signal_values: ["no_signal", "on_off"],
      },
      mode: "normal",
      effects: {
        status_values: ["no_effect", "candle", "fire"],
        status: "no_effect",
        effect_values: ["no_effect", "candle", "fire"],
      },
      owner: {
        rid: this.controller.formatUUID(deviceNode.id),
        rtype: "device",
      },
    };

    // Add color capabilities if supported
    if (this.supportsColor(deviceNode.devicetype)) {
      lightData.color = {
        xy: {
          x: state.x || 0.3127,
          y: state.y || 0.329,
        },
        gamut: {
          red: [0.6915, 0.3083],
          green: [0.17, 0.7],
          blue: [0.1532, 0.0475],
        },
        gamut_type: "C",
      };
    }

    // Add color temperature if supported
    if (this.supportsColorTemperature(deviceNode.devicetype)) {
      lightData.color_temperature = {
        mirek: state.ct || 366,
        mirek_valid: true,
        mirek_schema: {
          mirek_minimum: 153,
          mirek_maximum: 500,
        },
      };
    }

    return lightData;
  }

  /**
   * Handle device resource operations (v2)
   */
  handleDeviceResource(hubId, req, res) {
    const devices = [];

    this.controller._commands.forEach((deviceNode, uuid) => {
      const deviceData = {
        id: this.controller.formatUUID(deviceNode.id),
        id_v1: `/lights/${uuid}`,
        type: "device",
        metadata: {
          name: deviceNode.name || deviceNode.devicename || "Device",
          archetype: this.mapDeviceTypeToArchetype(deviceNode.devicetype),
        },
        services: [
          {
            rid: uuid,
            rtype: "light",
          },
        ],
        product_data: {
          model_id: this.getModelId(deviceNode.devicetype),
          manufacturer_name: "Philips",
          product_name: this.getProductName(deviceNode.devicetype),
          product_archetype: this.mapDeviceTypeToArchetype(
            deviceNode.devicetype,
          ),
          certified: true,
          software_version: "1.88.1",
          hardware_platform_type: "100b-103",
        },
      };
      devices.push(deviceData);
    });

    const response = {
      errors: [],
      data: devices,
    };

    res.type("application/json").send(JSON.stringify(response, null, 2));
  }

  /**
   * Handle bridge resource (v2 config equivalent)
   */
  handleBridgeResource(hubId, req, res) {
    try {
      const bridgeId = this.controller.getBridgeIdFromMacAddress
        ? this.controller.getBridgeIdFromMacAddress(
            this.controller.bridgeId || "00:11:22:33:44:55",
          )
        : "001122FFFE334455";

      const bridgeData = {
        name: "Philips hue",
        datastoreversion: this.datastoreVersion,
        swversion: this.swVersion,
        apiversion: this.apiVersion,
        mac: this.controller.bridgeId || "00:11:22:33:44:55",
        bridgeid: bridgeId,
        factorynew: false,
        replacesbridgeid: null,
        modelid: "BSB002",
        starterkitid: "",
        linkbutton: false,
        ipaddress: this.controller.address || "192.168.1.100",
        netmask: "255.255.255.0",
        gateway: this.controller.gateway || "192.168.1.1",
        dhcp: true,
        portalservices: false,
        UTC: new Date().toISOString().split(".").shift(),
        localtime: new Date().toISOString().split(".").shift(),
        timezone: "UTC",
        zigbeechannel: 25,
      };

      // Add username specific data if present
      if (req.params.username) {
        bridgeData.whitelist = {};
        bridgeData.whitelist[req.params.username] = {
          "last use date": new Date().toISOString().split(".").shift(),
          "create date": new Date().toISOString().split(".").shift(),
          name: "Alexa#Echo",
        };
      }

      res.type("application/json").send(JSON.stringify(bridgeData, null, 2));
    } catch (error) {
      this.controller.error(`Bridge resource error: ${error.message}`);
      this.sendV2ErrorResponse(res, 1, req.url, "internal error");
    }
  }

  /**
   * Handle Server-Sent Events for real-time updates
   */
  handleEventStream(hubId, req, res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    const clientId = uuidv4();
    const client = { id: clientId, res };
    this.eventClients.add(client);

    // Send initial data
    res.write(
      `data: ${JSON.stringify([
        {
          type: "add",
          id: clientId,
          data: [],
        },
      ])}\n\n`,
    );

    // Handle client disconnect
    req.on("close", () => {
      this.eventClients.delete(client);
    });

    req.on("error", () => {
      this.eventClients.delete(client);
    });
  }

  /**
   * Emit resource update to SSE clients
   */
  emitResourceUpdate(resourceType, resourceId, updateData) {
    const event = {
      type: "update",
      id: resourceId,
      data: [
        {
          id: resourceId,
          type: resourceType,
          ...updateData,
        },
      ],
    };

    this.eventClients.forEach((client) => {
      try {
        client.res.write(`data: ${JSON.stringify([event])}\n\n`);
      } catch (error) {
        this.eventClients.delete(client);
      }
    });
  }

  /**
   * Send v2 API error response
   */
  sendV2ErrorResponse(res, type, address, description) {
    const response = {
      errors: [
        {
          type,
          address,
          description,
        },
      ],
      data: [],
    };

    res
      .status(type === 3 ? 404 : 400)
      .type("application/json")
      .send(JSON.stringify(response, null, 2));
  }

  /**
   * Map v1 device types to v2 archetypes
   */
  mapDeviceTypeToArchetype(deviceType) {
    const mapping = {
      "Dimmable light": "sultan_bulb",
      "Color light": "hue_bulb",
      "Extended color light": "hue_bulb",
      "Color temperature light": "white_and_color_ambiance_bulb",
    };
    return mapping[deviceType] || "sultan_bulb";
  }

  /**
   * Get model ID based on device type
   */
  getModelId(deviceType) {
    const mapping = {
      "Dimmable light": "LTW011",
      "Color light": "LCT015",
      "Extended color light": "LCT015",
      "Color temperature light": "LTW011",
    };
    return mapping[deviceType] || "LTW011";
  }

  /**
   * Get product name based on device type
   */
  getProductName(deviceType) {
    const mapping = {
      "Dimmable light": "Hue white lamp",
      "Color light": "Hue color lamp",
      "Extended color light": "Hue color lamp",
      "Color temperature light": "Hue white ambiance lamp",
    };
    return mapping[deviceType] || "Hue white lamp";
  }

  /**
   * Check if device supports color
   */
  supportsColor(deviceType) {
    return (
      deviceType === "Color light" || deviceType === "Extended color light"
    );
  }

  /**
   * Check if device supports color temperature
   */
  supportsColorTemperature(deviceType) {
    return (
      deviceType === "Color temperature light" ||
      deviceType === "Extended color light"
    );
  }

  /**
   * Handle room resource (placeholder for future implementation)
   */
  handleRoomResource(hubId, req, res) {
    const response = {
      errors: [],
      data: [],
    };
    res.type("application/json").send(JSON.stringify(response, null, 2));
  }

  /**
   * Handle zone resource (placeholder for future implementation)
   */
  handleZoneResource(hubId, req, res) {
    const response = {
      errors: [],
      data: [],
    };
    res.type("application/json").send(JSON.stringify(response, null, 2));
  }

  /**
   * Handle scene resource (placeholder for future implementation)
   */
  handleSceneResource(hubId, req, res) {
    const response = {
      errors: [],
      data: [],
    };
    res.type("application/json").send(JSON.stringify(response, null, 2));
  }

  /**
   * Handle bridge home resource (placeholder for future implementation)
   */
  handleBridgeHomeResource(hubId, req, res) {
    const response = {
      errors: [],
      data: [],
    };
    res.type("application/json").send(JSON.stringify(response, null, 2));
  }
}

module.exports = HueApiV2Handler;
