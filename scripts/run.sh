#!/bin/bash

set -ex
cmd="podman"
if hash docker ; then
    cmd="docker"
fi
BASEIMG=$(grep FROM Dockerfile  | sed 's/FROM //')
$cmd pull "${BASEIMG}"

cid=$($cmd run \
            -u root --rm -d \
            --entrypoint "" \
            "${BASEIMG}" \
            /bin/bash -c 'trap exit INT TERM; while true; do echo waiting..; sleep 10; done;')

docker cp "${PWD}/" "${cid}:/src/"

docker exec -it -w "/src/" "${cid}" /bin/bash
