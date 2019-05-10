#!/bin/bash

docker run -u root --rm -it --network host -v $PWD:/src nodered/node-red-docker /bin/bash
