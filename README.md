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
They do rely that all communication is done on port 80! To estatlish this you got 2 different ways to go.

### ALEXA_PORT and running as root

You must define an environment variable **ALEXA_PORT** and set its value to 80. When running node-red as systemd unit as

`
Environment=ALEXA_PORT=80
`

To test the change you can also start node-red manually with following:

`
ALEXA_PORT=80 node-red start
`

### using iptables and port forwarding

You can leave everything as it is and just define port forwarding using iptables

`
sudo iptables -t nat -I PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 60000
`

Please consider that any changes to iptables are not presistent, after reboot you have to forward the port again, or use iptables-save as described [here](https://www.poftut.com/how-to-save-and-restore-iptables-rules-permanently-in-ubuntu-centos-fedora-debian-kali-mint/)

## Message Object Properties
the follow *msg* properties are generated within this node

**payload.on:** true|false

**payload.bri:** brightness 0-255

**payload.xy** Color XY object

**alexa_ip:** \<ip of alexa device interacting with node-red\>

With version 1.x now also the input is processed within the node and updates the data to alexa. Within the alexa app you are now able to get the current state of your nodes.


### Message input to the nodes

At the moment you can input as payload objects:
* [brightness](https://github.com/mabunixda/node-red-contrib-alexa-home/blob/master/alexa/alexa-home.js#L85)
* [color](https://github.com/mabunixda/node-red-contrib-alexa-home/blob/master/alexa/alexa-home.js#L79)
* [on/off](https://github.com/mabunixda/node-red-contrib-alexa-home/blob/master/alexa/alexa-home.js#L95)

Normal an input is not routed as output because this would possibly cause endless update loops. But if you want this and know what you are doing, you can set the [output param on the msg](https://github.com/mabunixda/node-red-contrib-alexa-home/blob/master/alexa/alexa-home.js#L133) to let the input passthrough.
