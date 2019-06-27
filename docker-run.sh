#!/bin/sh

npm link /src


cd /src
npm install
npm install -g npm-check
npm install -g mocha

cd /usr/src/node-red

/bin/sh
