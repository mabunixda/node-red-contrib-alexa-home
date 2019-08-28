#!/bin/bash

IMAGE="nodered/node-red-docker:slim-v10"
if [ ! -z "$1" ]; then
    IMAGE="$1"
    shift
fi

docker run -u root --rm -it --network host -v $PWD:/src $IMAGE /src/docker-run.sh
