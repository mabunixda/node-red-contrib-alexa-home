#!/bin/bash

docker run -u root --rm -it --network host -v $PWD:/src mabunixda/node-red /bin/sh
# -p 1880:1880/tcp -p 1900:1900/udp -p 60000:60000/tcp 
## /bin/bash -c "trap : TERM INT; sleep infinity & wait" ##