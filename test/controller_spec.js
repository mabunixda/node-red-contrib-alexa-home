var should = require("should");
var helper = require("node-red-node-test-helper");
var controllerNode = require("../alexa/alexa-home-controller.js");

const nmap = require('node-libnmap');

const opts = {
    udp: true,
    ports: '1900'
};


function isURL(str) {
    var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
    var url = new RegExp(urlRegex, 'i');
    return str.length < 2083 && url.test(str);
}

helper.init(require.resolve('node-red'));

describe('alexa-home-controller Node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded with correct default params', function (done) {
        var flow = [{ id: "n1", type: "alexa-home-controller", controllername: "Test" }];
        helper.load(controllerNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'Test');
            n1.should.have.property('uiPort', 1880);
            n1.server.should.have.property("_started", true);
            n1.server.should.have.property("_sourcePort", 1900);

            done();
        });
    });
    it("should use env-variable node-red port", function(done) {
        process.env.ALEXA_IP="127.0.0.1:12345";
        var flow = [{ id: "n1", type: "alexa-home-controller", controllername: "Test" }];
        helper.load(controllerNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'Test');
            n1.should.have.property('uiPort', 12345);

            done();
        });
    });
});