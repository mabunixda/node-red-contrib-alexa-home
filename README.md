# node-red-contrib-alexa-home

[![CI](https://github.com/mabunixda/node-red-contrib-alexa-home/actions/workflows/ci.yml/badge.svg)](https://github.com/mabunixda/node-red-contrib-alexa-home/actions/workflows/ci.yml)

[![Known Vulnerabilities](https://snyk.io/test/github/mabunixda/node-red-contrib-alexa-home/badge.svg)](https://snyk.io/test/github/mabunixda/node-red-contrib-alexa-home)

[npmjs package registry](https://www.npmjs.com/package/node-red-contrib-alexa-home)

The node just works wihtin your local network - no extra cloud stuff is required.

## Installation

Install directory from your Node-RED Settings Pallete

or

Install using npm

    $ npm install node-red-contrib-alexa-home

## Alexa Generation 3 devices

Alexa devices of generation #3 are not using the information used within the detection process.
They do rely that all communication is done on port 80 for HTTP or port 443 for HTTPS! To establish this you have 3 different ways to go.

### ALEXA_PORT and running as root

You must define an environment variable **ALEXA_PORT** and set its value to 80. When running node-red as systemd unit as

`Environment=ALEXA_PORT=80`

To test the change you can also start node-red manually with following:

`ALEXA_PORT=80 node-red start`

### Using HTTPS/TLS Configuration

You can configure HTTPS support to run on port 443 (the standard HTTPS port) which Alexa also supports. This provides secure communication and avoids conflicts with other services using port 80.

Set environment variables:

```bash
ALEXA_HTTPS=true
ALEXA_PORT=443
ALEXA_CERT_PATH=/path/to/your/cert.pem
ALEXA_KEY_PATH=/path/to/your/private.key
ALEXA_CA_PATH=/path/to/ca-bundle.pem  # optional
```

Or configure HTTPS through the Node-RED configuration interface by checking "Use HTTPS" and providing certificate file paths.

**Note:** Running on port 443 may also require root privileges or proper port permissions.

### Using iptables and port forwarding

You can leave everything as it is and just define port forwarding using iptables

`sudo iptables -t nat -I PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 60000`

For HTTPS:

`sudo iptables -t nat -I PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 60000`

Please consider that any changes to iptables are not persistent, after reboot you have to forward the port again, or use iptables-save as described [here](https://www.poftut.com/how-to-save-and-restore-iptables-rules-permanently-in-ubuntu-centos-fedora-debian-kali-mint/)

## Configuration Options

### Environment Variables

The following environment variables can be used to configure the Alexa Home Controller:

- **ALEXA_PORT**: Port number for the web server (default: 60000)
- **ALEXA_HTTPS**: Enable HTTPS mode (`true` or `false`)
- **ALEXA_CERT_PATH**: Path to SSL certificate file (required for HTTPS)
- **ALEXA_KEY_PATH**: Path to SSL private key file (required for HTTPS)
- **ALEXA_CA_PATH**: Path to Certificate Authority bundle file (optional for HTTPS)

### Node Configuration

Through the Node-RED configuration interface, you can:

- **Name**: Set a custom name for the controller node
- **Port**: Configure the web server port (overrides ALEXA_PORT environment variable)
- **Use Node-RED server**: Use Node-RED's built-in web server instead of starting a separate one
- **HTTPS Configuration**: Enable secure communication with certificate and key file paths

### Configuration Restrictions

**Important:** The "Use Node-RED server" option and "HTTPS Configuration" are mutually exclusive and cannot be used together.

- When using Node-RED's built-in web server, HTTPS must be configured at the Node-RED application level
- When using the standalone web server mode, HTTPS can be configured directly in this node
- If both options are enabled, HTTPS will be automatically disabled with an error message

## Message Object Properties

the follow _msg_ properties are generated within this node

**payload.on:** true|false

**payload.bri:** brightness 0-255

**payload.xy** Color XY object

**alexa_ip:** \<ip of alexa device interacting with node-red\>

With version 1.x now also the input is processed within the node and updates the data to alexa. Within the alexa app you are now able to get the current state of your nodes.

### Message input to the nodes

At the moment you can input as payload objects:

- [brightness](https://github.com/mabunixda/node-red-contrib-alexa-home/blob/master/alexa/alexa-home.js#L85)
- [color](https://github.com/mabunixda/node-red-contrib-alexa-home/blob/master/alexa/alexa-home.js#L79)
- [on/off](https://github.com/mabunixda/node-red-contrib-alexa-home/blob/master/alexa/alexa-home.js#L95)

Normal an input is not routed as output because this would possibly cause endless update loops. But if you want this and know what you are doing, you can set the [output param on the msg](https://github.com/mabunixda/node-red-contrib-alexa-home/blob/master/alexa/alexa-home.js#L133) to let the input passthrough.
