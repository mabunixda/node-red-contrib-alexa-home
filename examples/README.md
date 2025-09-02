# Node-RED Alexa Home Examples

This directory contains example flows demonstrating various use cases for the `node-red-contrib-alexa-home` package. These examples showcase different device types, advanced color control, multi-device integration, and the latest window covering and temperature sensor support.

## 📁 Available Examples

### 1. **basic-smart-lighting.json**
**Beginner-friendly lighting control**

- **Purpose**: Demonstrates basic smart lighting control with different light types
- **Devices**: Extended color light, Dimmable light, Color light
- **Features**:
  - Simple on/off control
  - Brightness adjustment (dimming)
  - Basic color control with XY coordinates
  - MQTT integration for physical device control
  - Debug outputs for command monitoring

**Voice Commands**:
- "Alexa, turn on the living room light"
- "Alexa, set the kitchen light to 50 percent"
- "Alexa, turn the bedroom light red"

### 2. **advanced-color-scenes.json**
**Professional color control and scene management**

- **Purpose**: Advanced color processing with CIE XY coordinates and scene automation
- **Devices**: RGB strips, Color lights, Scene controllers
- **Features**:
  - CIE XY color space validation and conversion
  - RGB output with hex color codes
  - Predefined color presets (red, blue, green, etc.)
  - Scene-based lighting (movie, party, relax, work)
  - Color temperature handling
  - Multi-device scene coordination

**Voice Commands**:
- "Alexa, set RGB strip to red"
- "Alexa, activate movie scene"
- "Alexa, turn on party scene"

**Supported Scenes**:
- **Movie**: Warm dim lighting for cinema experience
- **Party**: Bright colorful RGB rotation
- **Relax**: Soft pink/purple ambient lighting
- **Work**: Bright cool white for productivity

### 3. **multi-device-integration.json**
**Comprehensive smart home ecosystem**

- **Purpose**: Complete smart home integration with multiple device types
- **Devices**: Lights, fans, locks, sensors, thermostats, blinds, garage doors
- **Features**:
  - Central device router with state management
  - Device categorization and specialized handling
  - Security event logging
  - Basic automation engine
  - Global state persistence
  - MQTT integration with organized topics
  - Real-time system monitoring

**Voice Commands**:
- "Alexa, turn on the living room light"
- "Alexa, set the kitchen fan to medium speed"
- "Alexa, lock the front door"
- "Alexa, set the thermostat to 72 degrees"
- "Alexa, open the living room blinds"

**Automation Features**:
- Motion detection triggers automatic lighting
- Door sensor activates security lighting
- Comprehensive security event logging

### 4. **blinds-and-temperature-sensors.json**
**Window coverings and environmental monitoring**

- **Purpose**: Advanced blind control and temperature monitoring with intelligent automation
- **Devices**: Window coverings (blinds), Temperature sensors (indoor/outdoor)
- **Features**:
  - Position-based blind control (0-100% open)
  - Direct open/close commands
  - Temperature monitoring with multiple scales (Celsius/Fahrenheit)
  - Intelligent automation combining temperature and blind position
  - Comfort level assessment and HVAC suggestions
  - Weather context for outdoor sensors
  - Smart home automation rules

**Voice Commands**:
- "Alexa, set living room blinds to 75 percent"
- "Alexa, open the bedroom blinds"
- "Alexa, close all blinds"
- "Alexa, what's the living room temperature?"
- "Alexa, what's the outdoor temperature?"

**Automation Features**:
- Morning natural light optimization
- Afternoon heat protection
- Evening privacy mode
- Solar heating assistance
- Temperature-based blind positioning

## 🚀 Getting Started

### Prerequisites

1. **Node-RED**: Version 4.0.0 or higher
2. **Node.js**: Version 18.5.0 or higher
3. **Alexa Device**: Echo, Echo Dot, or Alexa app
4. **MQTT Broker** (optional but recommended): Mosquitto, HiveMQ, or similar

### Installation Steps

1. **Install the Node Package**:
   ```bash
   npm install node-red-contrib-alexa-home
   ```

2. **Import Example Flow**:
   - Open Node-RED editor
   - Go to Menu → Import
   - Select the JSON file you want to try
   - Click "Import"

3. **Configure MQTT Brokers** (if using MQTT outputs):
   - Double-click any MQTT output node
   - Configure your MQTT broker connection
   - Apply the same broker to all MQTT nodes

4. **Deploy the Flow**:
   - Click the "Deploy" button in Node-RED
   - Wait for successful deployment

5. **Discover Devices with Alexa**:
   - Say "Alexa, discover devices"
   - Or use the Alexa app: More → Add Device → Other

## 🎯 Usage Examples

### Basic Light Control
```javascript
// Manual injection for testing
{
  "on": true,           // Power state
  "bri": 127,          // Brightness (0-254)
  "xy": [0.675, 0.322] // Color (CIE XY coordinates)
}
```

### Scene Activation
```javascript
// Scene controller payload
{
  "on": true  // Activates the scene
}
```

### Fan Speed Control
```javascript
// Fan control via brightness
{
  "on": true,
  "bri_normalized": 66  // 66% = Medium speed
}
```

## 🔧 Customization

### Modifying Device Names
1. Double-click the Alexa Home node
2. Change the "Device Name" field
3. Redeploy and ask Alexa to discover devices

### Adding New Devices
1. Drag a new "alexa-home" node from the palette
2. Configure device name and type
3. Connect to appropriate processing functions
4. Deploy and discover

### MQTT Topic Structure
```
lights/device_name          # Lighting controls
switches/device_name        # Switch and fan controls
security/device_name        # Locks and garage doors
climate/device_name         # Thermostat controls
sensors/device_name         # Sensor readings
scene/control              # Scene coordination
automation/actions         # Automation triggers
```

## 🐛 Troubleshooting

### Device Not Discovered
- Check Node-RED is running and accessible
- Ensure the Alexa Home Controller is configured correctly
- Verify network connectivity between Alexa and Node-RED
- Try saying "Alexa, forget all devices" then rediscover

### Commands Not Working
- Check debug output for error messages
- Verify device names match exactly (case-sensitive)
- Ensure flows are deployed successfully
- Test with manual injection nodes first

### Color Commands Issues
- Verify XY coordinates are in valid range (0.0-1.0)
- Check that device type supports color (Color light, Extended color light)
- Use the provided color presets for testing

### MQTT Connection Problems
- Verify MQTT broker is running and accessible
- Check broker configuration in MQTT nodes
- Test MQTT connection with a simple MQTT client
- Ensure topics don't conflict with existing devices

## 📖 Technical Details

### Color Processing
The examples use CIE 1931 XY color space for accurate color representation:
- **X coordinate**: 0.0 to 1.0 (red-green axis)
- **Y coordinate**: 0.0 to 1.0 (luminance axis)
- **Conversion**: XY → RGB → Hex for device compatibility

### State Management
Device states are stored in Node-RED's global context:
```javascript
// Access device states
const deviceStates = global.get('deviceStates');

// Update device state
deviceStates[deviceName] = {
  power: true,
  brightness: 80,
  lastUpdate: new Date().toISOString()
};
global.set('deviceStates', deviceStates);
```

### Security Logging
Security events are logged with detailed information:
```javascript
{
  timestamp: "2024-01-15T10:30:00Z",
  event: {
    type: "lock_operation",
    action: "unlock",
    device: "Front Door Lock",
    source: "alexa_voice_command"
  }
}
```

## 🤝 Contributing

Found an issue or want to improve these examples?

1. Check the [main repository](https://github.com/mabunixda/node-red-contrib-alexa-home)
2. Open an issue or submit a pull request
3. Include example flows that demonstrate the issue/improvement

## 📄 License

These examples are provided under the same license as the main package. See the main repository for license details.

---

**Need help?** Check the main [README.md](../README.md) or open an issue on GitHub.
