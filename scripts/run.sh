#!/bin/bash

docker run -u root --rm -it --network host -v "$PWD:/src" nodered/node-red-docker:slim-v10 /src/scripts/docker-run.sh
