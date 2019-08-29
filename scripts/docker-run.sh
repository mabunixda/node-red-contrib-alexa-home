#!/bin/sh

cd /src
npm install

npm install -g npm-check
npm install -g mocha
npm install -g eslint

cd /usr/src/node-red
npm link /src

/bin/sh