#!/bin/bash

docker run -u root --rm -it \
        --network host \
        -v "$PWD:/src" \
        --entrypoint /bin/sh \
        nodered/node-red:latest-minimal \
        /src/scripts/docker-run.sh
