FROM nodered/node-red-docker:slim-v10

COPY docker-package.json /usr/src/node-red/package.json
COPY ./ /usr/src/alexa-node

USER root

## install custom deps
RUN npm install 

## link dev code
RUN npm link /usr/src/alexa-node/

# USER node-red

