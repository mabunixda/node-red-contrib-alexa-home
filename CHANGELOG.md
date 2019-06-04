### 1.0.0
Breaking Changes: 
* new node introduced to enable detection of alexa controlable nodes 
* payload object is now inheriting the input data of alexa
* debug() is implemented by DEBUG=alexa-home:* to enhance logging
* no extra port is needed because communication with alexa is done via node-red webserver
* no limit of nodes anymore
* no persisting storage needed  $userDir/alexa-home is obsolet and can be deleted

### 0.2.0
Adding environment variables to configure port and default brightness
Just set PORT and BRI_DEFAULT environment variables

### 0.1.0
Basic rewrite of node-contrib-alexa-local to fill controller with maximum of 25 nodes
and use a defined port range ( port 60000++ )