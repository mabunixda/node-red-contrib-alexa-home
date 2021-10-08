#!/bin/bash

cmd="podman"
has_podman=$(hash docker 2> /dev/null)
if [ "$?" == "0" ]; then
    cmd="docker"
fi

$cmd run \
    -u root \
    --rm -it \
    --network host \
    --entrypoint /src/scripts/docker-run.sh \
    -v "$PWD/:/src" \
    docker.io/nodered/node-red:latest-minimal
