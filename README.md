# node-red-contrib-alexa-home

[![CI](https://github.com/mabunixda/node-red-contrib-alexa-home/actions/workflows/ci.yml/badge.svg)](https://github.com/mabunixda/node-red-contrib-alexa-home/actions/workflows/ci.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/mabunixda/node-red-contrib-alexa-home/badge.svg)](https://snyk.io/test/github/mabunixda/node-red-contrib-alexa-home)
[![npm version](https://img.shields.io/npm/v/node-red-contrib-alexa-home.svg)](https://www.npmjs.com/package/node-red-contrib-alexa-home)
[![npm downloads](https://img.shields.io/npm/dm/node-red-contrib-alexa-home.svg)](https://www.npmjs.com/package/node-red-contrib-alexa-home)

**Transform your Node-RED flows into Alexa-compatible smart home devices** - No cloud services required!

This Node-RED package creates a local Philips Hue bridge emulation that allows Amazon Alexa devices to discover and control your Node-RED flows directly within your local network. Perfect for home automation, IoT projects, and custom smart home solutions.

## ✨ Key Features

- 🏠 **Local Network Only** - No cloud dependencies or external services
- 🔍 **Auto-Discovery** - Alexa automatically finds your devices via SSDP
- 🎨 **Full Color Control** - RGB, brightness, and color temperature support
- 🔒 **HTTPS/TLS Support** - Secure communication with SSL/TLS encryption
- 📱 **Multiple Device Types** - Lights, switches, dimmers, and color bulbs
- 🌐 **Philips Hue API v1/v2** - Compatible with modern Alexa requirements
- 🔧 **Enhanced Validation** - Robust error handling and input validation
- 📊 **Comprehensive Examples** - Ready-to-use flows for common scenarios

## 🚀 Quick Start

### Installation

**Option 1: Node-RED Palette Manager**
1. Open Node-RED editor
2. Go to Menu → Manage Palette → Install
3. Search for `node-red-contrib-alexa-home`
4. Click Install

**Option 2: npm Command Line**
```bash
npm install node-red-contrib-alexa-home
```

### Basic Setup

1. **Add Controller Node**: Drag the `alexa-home-controller` node to your flow
2. **Configure Port**: Set port to 80 (HTTP) or 443 (HTTPS) for Alexa compatibility
3. **Add Device Nodes**: Add `alexa-home` nodes for each device you want to control
4. **Deploy Flow**: Deploy your flow and wait for Alexa to discover devices
5. **Discover Devices**: Say "Alexa, discover devices" or use the Alexa app

### Example Flow
```json
[{"id":"controller1","type":"alexa-home-controller","name":"Alexa Hub","port":"80"},
 {"id":"light1","type":"alexa-home","controller":"controller1","devicename":"Living Room Light","devicetype":"Extended color light"}]
```

## ⚙️ Configuration

### Alexa Generation 3+ Compatibility

Modern Alexa devices require communication on standard ports:
- **Port 80** for HTTP communication
- **Port 443** for HTTPS communication

Choose one of these setup methods:

#### Method 1: Environment Variables (Recommended)
Set the `ALEXA_PORT` environment variable and run Node-RED with appropriate privileges:

```bash
# For systemd service
Environment=ALEXA_PORT=80

# Manual start
ALEXA_PORT=80 sudo node-red
```

#### Method 2: HTTPS/TLS Configuration (Secure)
Configure HTTPS to run on port 443 for secure communication:

**Environment Variables:**
```bash
export ALEXA_HTTPS=true
export ALEXA_PORT=443
export ALEXA_CERT_PATH=/path/to/your/cert.pem
export ALEXA_KEY_PATH=/path/to/your/private.key
export ALEXA_CA_PATH=/path/to/ca-bundle.pem  # Optional
```

**Node Configuration:**
- Check "Use HTTPS" in the controller node
- Provide certificate and key file paths
- Ensure proper file permissions for certificate files

#### Method 3: Port Forwarding with iptables
Redirect traffic from standard ports to your chosen port:

```bash
# HTTP forwarding
sudo iptables -t nat -I PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 60000

# HTTPS forwarding
sudo iptables -t nat -I PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 60000

# Make persistent (Ubuntu/Debian)
sudo iptables-save > /etc/iptables/rules.v4
```

### Controller Configuration Options

#### Environment Variables
| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ALEXA_PORT` | Web server port | `60000` | `80` |
| `ALEXA_HTTPS` | Enable HTTPS mode | `false` | `true` |
| `ALEXA_CERT_PATH` | SSL certificate file path | - | `/etc/ssl/cert.pem` |
| `ALEXA_KEY_PATH` | SSL private key file path | - | `/etc/ssl/private.key` |
| `ALEXA_CA_PATH` | Certificate Authority bundle | - | `/etc/ssl/ca-bundle.pem` |

#### Node Configuration
**alexa-home-controller settings:**
- **Name**: Custom name for the controller
- **Port**: Web server port (overrides `ALEXA_PORT`)
- **Max Items**: Maximum devices to expose to Alexa
- **Use Node-RED Server**: Use Node-RED's built-in web server
- **HTTPS Configuration**: Enable secure communication

**alexa-home device settings:**
- **Device Name**: Name Alexa will recognize
- **Device Type**: Light type (Extended color, Dimmer, Switch, Color)
- **Input Trigger**: Allow input messages to trigger output

#### Configuration Restrictions
⚠️ **Important**: "Use Node-RED server" and "HTTPS Configuration" cannot be used together.
- Node-RED server mode: Configure HTTPS at Node-RED application level
- Standalone server mode: Configure HTTPS directly in this node

## 📡 Message API

### Output Message Properties

When Alexa interacts with your devices, the following message properties are generated:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `msg.payload.on` | `boolean` | Device on/off state | `true` / `false` |
| `msg.payload.bri` | `number` | Brightness level (0-254) | `128` |
| `msg.payload.bri_normalized` | `number` | Brightness percentage (0-100) | `50` |
| `msg.payload.xy` | `array` | CIE XY color coordinates | `[0.3127, 0.329]` |
| `msg.payload.command` | `string` | Command type | `"switch"` / `"dim"` / `"color"` |
| `msg.device_name` | `string` | Device name from configuration | `"Living Room Light"` |
| `msg.light_id` | `string` | Unique device identifier | `"light_001"` |
| `msg.alexa_ip` | `string` | IP address of requesting Alexa device | `"192.168.1.100"` |
| `msg.change_direction` | `number` | Brightness change direction | `-1` / `0` / `1` |

### Input Message Format

Send commands to your devices using these payload formats:

#### On/Off Control
```javascript
msg.payload = { on: true };  // Turn on
msg.payload = { on: false }; // Turn off
// Or simple values
msg.payload = "on";   // Turn on
msg.payload = "off";  // Turn off
msg.payload = 1;      // Turn on
msg.payload = 0;      // Turn off
```

#### Brightness Control
```javascript
msg.payload = { bri: 128 };     // Set brightness (0-254)
msg.payload = { bri: 254, on: true }; // Full brightness and on
```

#### Color Control
```javascript
msg.payload = { xy: [0.675, 0.322] };  // Set color (CIE XY coordinates)
msg.payload = {
  xy: [0.675, 0.322],
  bri: 200,
  on: true
}; // Color with brightness
```

#### Combined Commands
```javascript
msg.payload = {
  on: true,
  bri: 180,
  xy: [0.4, 0.5]
}; // Turn on with specific brightness and color
```

### Advanced Features

#### Input Passthrough
By default, input messages don't generate output to prevent feedback loops. To enable passthrough:
```javascript
msg.output = true; // Allow input to pass through as output
```

## 📚 Examples

The `examples/` directory contains ready-to-use flows demonstrating various use cases:

### 🔸 Basic Smart Lighting (`basic-smart-lighting.json`)
Perfect for beginners - demonstrates:
- Simple on/off control
- Brightness adjustment
- Basic color control
- MQTT integration

**Voice Commands:**
- "Alexa, turn on the living room light"
- "Alexa, set the kitchen light to 50 percent"
- "Alexa, turn the bedroom light red"

### 🔸 Advanced Color Scenes (`advanced-color-scenes.json`)
Professional color control featuring:
- CIE XY color space validation
- RGB hex color output
- Predefined color presets
- Scene-based lighting (movie, party, relax, work)

**Voice Commands:**
- "Alexa, set RGB strip to red"
- "Alexa, activate movie scene"
- "Alexa, turn on party scene"

### 🔸 Multi-Device Integration (`multi-device-integration.json`)
Comprehensive smart home ecosystem with:
- Multiple device types
- Scene coordination
- Advanced automation
- MQTT and HTTP integration

## 🔧 Troubleshooting

### Common Issues

#### Alexa Can't Discover Devices
1. **Check Port Configuration**: Ensure you're using port 80 (HTTP) or 443 (HTTPS)
2. **Verify Network**: Alexa and Node-RED must be on the same network
3. **Firewall Settings**: Allow traffic on the configured port
4. **SSDP Service**: Ensure SSDP is running (automatic with controller node)
5. **Device Limits**: Check if you've exceeded the maximum devices limit

#### Devices Not Responding
1. **Controller Status**: Verify the controller node shows "Connected"
2. **Device Registration**: Ensure devices are properly registered with controller
3. **Message Flow**: Check debug nodes for incoming/outgoing messages
4. **Error Logs**: Monitor Node-RED logs for error messages

#### HTTPS/TLS Issues
1. **Certificate Validity**: Ensure SSL certificates are valid and readable
2. **File Permissions**: Verify Node-RED can read certificate files
3. **Path Configuration**: Double-check certificate and key file paths
4. **Port Privileges**: Running on port 443 may require elevated privileges

### Debug Tips

1. **Enable Debug Nodes**: Add debug nodes to monitor message flow
2. **Check Controller Logs**: Monitor Node-RED logs for detailed error information
3. **Network Analysis**: Use tools like Wireshark to analyze SSDP traffic
4. **Alexa App**: Check device status in the Alexa mobile app

### Performance Optimization

- **Device Limits**: Keep device count reasonable (recommended: <50 devices)
- **Response Time**: Ensure fast response times for better Alexa experience
- **Resource Usage**: Monitor Node-RED memory and CPU usage
- **Network Latency**: Minimize network delays for responsive control

## 🏗️ Technical Details

### Architecture
- **SSDP Discovery**: Uses Simple Service Discovery Protocol for device discovery
- **Hue API Emulation**: Emulates Philips Hue Bridge API v1 and v2
- **Express.js Server**: Built-in web server for handling Alexa requests
- **Template Engine**: Flexible template system for API responses

### Supported Alexa Features
- ✅ Device discovery via "discover devices" command
- ✅ On/off control
- ✅ Brightness/dimming control
- ✅ Color control (RGB, XY coordinates)
- ✅ Device state synchronization
- ✅ Multiple device types
- ✅ Scene support (through device grouping)

### Network Requirements
- **Same Network**: Alexa and Node-RED must be on the same local network
- **Multicast Support**: Network must support multicast for SSDP discovery
- **Port Access**: HTTP (80) or HTTPS (443) port access required
- **IPv4**: Currently supports IPv4 networks only

### API Compatibility
- **Philips Hue API v1**: Full compatibility for legacy Alexa devices
- **Philips Hue API v2**: Modern API support for newer Alexa devices
- **Auto-Detection**: Automatically serves appropriate API version

## 📋 Requirements

- **Node.js**: >= 18.5.0
- **Node-RED**: >= 4.0.0
- **Network**: Local network with multicast support
- **Alexa Device**: Amazon Echo, Echo Dot, Echo Show, or Alexa-enabled device

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [npm Package](https://www.npmjs.com/package/node-red-contrib-alexa-home)
- [GitHub Repository](https://github.com/mabunixda/node-red-contrib-alexa-home)
- [Node-RED Community](https://discourse.nodered.org/)
- [Issue Tracker](https://github.com/mabunixda/node-red-contrib-alexa-home/issues)
