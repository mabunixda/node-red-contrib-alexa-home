#!/bin/bash

cmd="podman"
if hash docker ; then
    cmd="docker"
fi

$cmd pull docker.io/nodered/node-red:latest-minimal

$cmd run \
    -u root \
    --rm -it \
    --network host \
    --entrypoint /src/scripts/docker-run.sh \
    -v "$PWD/:/src" \
    docker.io/nodered/node-red:latest-minimal
