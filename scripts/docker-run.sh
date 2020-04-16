#!/bin/sh

cd /src || exit 1
npm install

npm install -g npm-check
npm install -g mocha
npm install -g eslint

cd /usr/src/node-red || exit 2
npm link /src

/bin/sh
