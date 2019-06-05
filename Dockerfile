FROM nodered/node-red-docker:slim-v8

COPY docker-package.json /usr/src/node-red/package.json
COPY ./ /usr/src/alexa-node

USER root

RUN npm install \
  && npm link /usr/src/alexa-node/

USER node-red

