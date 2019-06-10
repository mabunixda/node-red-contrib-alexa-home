var should = require("should");
var helper = require("node-red-node-test-helper");
var lowerNode = require("../alexa/alexa-home.js");

helper.init(require.resolve('node-red'));

describe('alexa-home Node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded with correct default params', function (done) {
        var flow = [{ id: "n1", type: "alexa-home", devicename: "Kitchen Light" }];
        helper.load(lowerNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'Kitchen Light');
            n1.should.have.property('devicetype', 'Extended color light');
            done();
        });
    });
});