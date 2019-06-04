# node-red-contrib-alexa-home

[![Greenkeeper badge](https://badges.greenkeeper.io/mabunixda/node-red-contrib-alexa-home.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/mabunixda/node-red-contrib-alexa-home.svg?branch=master)](https://travis-ci.org/mabunixda/node-red-contrib-alexa-home)

Rewrite of [node-red-contrib-alexa-local](https://github.com/originallyus/node-red-contrib-alexa-local) to use a defined port range and also minimize the number of open ports - just 1 bridge is used for every 25 devices

**No Alexa skill required**

**No cloud dependencies**

Just works wihtin your local network!

## Installation
Install directory from your Node-RED Settings Pallete

or

Install using npm

    $ npm install node-red-contrib-alexa-home


## Message Object Properties
the follow *msg* properties are generated within this node

**payload.on:** true|false

**payload.bri:** brightness 0-255

**alexa_ip:** \<ip of alexa device interacting with node-red\>


With version 1.x now also the input is processed within the node and updates the data to alexa. Within the alexa app you are now able to get the current state of your nodes.