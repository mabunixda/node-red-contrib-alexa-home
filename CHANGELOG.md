<a name="v1.3.2"></a>
# [v1.3.2](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/v1.3.2) - 04 Mar 2021

## 1.3.2 (2021-03-04)

#### Bug Fixes

* valid gh actions def (3dfbb696)

#### Code Refactoring

* github actions magic (0eb4824c)
* github actions split (edd78182)



[Changes][v1.3.2]


<a name="v1.3.1"></a>
# [v1.3.1](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/v1.3.1) - 04 Mar 2021

## 1.3.1 (2021-03-04)

#### Bug Fixes

* cicd changelog automation (921a6861)



[Changes][v1.3.1]


<a name="v1.3.0"></a>
# [v1.3.0](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/v1.3.0) - 04 Mar 2021

## 1.3.0 (2021-03-04)

#### 🎁 Feature

* update to semantic versioning (96a3b9fd)

#### 🐞 Bug Fixes

* merge artifacts... (efeb9044)
* missing supertest dependency... (91d5b8d2)
* updates from master (73d9dc7e)
* revert linting script (be247603)
* ci gh action (c3dce598)
* allow linting bypass argument 1 (a51a240b)
* upgrade mustache from 4.0.1 to 4.1.0 (#85) (65c476db)
* upgrade mustache from 4.0.1 to 4.1.0 (#85) (279d50f7)



[Changes][v1.3.0]


<a name="1.1.3"></a>
# [Fix detection of gen3 devices (1.1.3)](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/1.1.3) - 02 Sep 2019

Thanks to @nepee for the input to fix some json stuff within the detection process. 


[Changes][1.1.3]


<a name="1.1.2"></a>
# [Codecleanup + Registration fix for gen3 devices (1.1.2)](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/1.1.2) - 29 Aug 2019

Internal Code cleanup because of introduction of linting the Code... but 

Also take fix from [derSebbl](https://github.com/mabunixda/node-red-contrib-alexa-home/issues/16#issuecomment-526085758) to get Alexa Gen3 devices to work and hopefully fix #16 

The change of the port is not made per default, because i expect not everybody to have port 80 open and available. It might also cause permissions problems, because that port might not be used by a default linux user e.g.


[Changes][1.1.2]


<a name="1.1.1"></a>
# [fix http/https configuration setup (1.1.1)](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/1.1.1) - 28 Aug 2019

http/https setup was incorrect routed through the node to reflect http/https setup of node-red

[Changes][1.1.1]


<a name="1.1.0"></a>
# [Start webserver for item information (1.1.0)](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/1.1.0) - 28 Aug 2019

SSDP and HTTP Server are now seperate components to provide information about items.


[Changes][1.1.0]


<a name="1.0.4"></a>
# [multiple fixxes (1.0.4)](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/1.0.4) - 10 Jun 2019

Fixing #21 to get on/off command back - this is now
msg.payload.command = "switch|bri|color"
and also round normalized bri to integer values

With this pull request also colors can be set as quested in #19 ..

the broadcast bug of #16 should now be solved because node-ssdp is listening on all available interfaces already. The setup.xml generation already used the host http header to reflect the incoming request to the setup output.
Also a finding was that alexa does not support endless response bodies. To get around this i stripped all spaces and unused settings from the json files. Hopefully this will solve the update problems #16

[Changes][1.0.4]


<a name="1.0.3"></a>
# [fix ssdp location announcement (1.0.3)](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/1.0.3) - 10 Jun 2019

fix #16 

[Changes][1.0.3]


<a name="1.0.2"></a>
# [Remove debug() dependency to cleanup logging (1.0.2)](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/1.0.2) - 07 Jun 2019

Logging is now done entirely via node-red routines

[Changes][1.0.2]


<a name="1.0.1"></a>
# [add error logging for missing node (1.0.1)](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/1.0.1) - 05 Jun 2019

#16 displayed the need that also error logs must be written when no controller node is available - even when this spams the logs when multiple alexa nodes are already present

[Changes][1.0.1]


<a name="1.0.0"></a>
# [1.0.0](https://github.com/mabunixda/node-red-contrib-alexa-home/releases/tag/1.0.0) - 05 Jun 2019

Relase of rewritten node implementation

[Changes][1.0.0]


[v1.3.2]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/v1.3.1...v1.3.2
[v1.3.1]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/v1.3.0...v1.3.1
[v1.3.0]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/1.1.3...v1.3.0
[1.1.3]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/1.1.2...1.1.3
[1.1.2]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/1.1.1...1.1.2
[1.1.1]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/1.0.4...1.1.0
[1.0.4]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/1.0.3...1.0.4
[1.0.3]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/1.0.2...1.0.3
[1.0.2]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/mabunixda/node-red-contrib-alexa-home/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/mabunixda/node-red-contrib-alexa-home/tree/1.0.0

 <!-- Generated by changelog-from-release -->
