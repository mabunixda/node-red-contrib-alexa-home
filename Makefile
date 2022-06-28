

docker:
	docker build --no-cache --rm -t registry.home.nitram.at/node-red/alexa-dev .
	docker push registry.home.nitram.at/node-red/alexa-dev
