#!/bin/sh

NODE_MAJOR=$(node --version | awk -F '.' '{print $1}')
if [ "$NODE_MAJOR" = "v7" ] || [ "$NODE_MAJOR" = "v6" ]; then
    exit 0
fi

./node_modules/eslint/bin/eslint.js "$1" alexa/*.js
