#!/bin/sh

# cd /src || exit 1

MODDIR=${PWD}
echo "install /src dependencies..."
npm install



echo "install gh-actions dependencies..."
npm install -g npm-check
npm install -g mocha
npm install -g eslint

echo "linking /src to node-red..."
cd /usr/src/node-red || exit 2
npm link ${MODDIR}
