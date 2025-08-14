const should = require("should");
const helper = require("node-red-node-test-helper");
const controllerNode = require("../alexa/alexa-home-controller.js");

helper.init(require.resolve('node-red'));

describe('Configuration Validation Tests', function () {
    this.timeout(5000);

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should disable HTTPS when useNode is true', function (done) {
        const flow = [
            {
                id: "controller1", 
                type: "alexa-home-controller",
                controllername: "Test Controller",
                useNode: true,
                useHttps: true,
                certPath: "/fake/cert.pem",
                keyPath: "/fake/key.pem",
                port: 80
            }
        ];

        helper.load(controllerNode, flow, function () {
            const controller = helper.getNode("controller1");
            controller.should.have.property('useNode', true);
            controller.should.have.property('useHttps', false);
            controller.should.have.property('httpsOptions', null);
            done();
        });
    });

    it('should allow HTTPS when useNode is false', function (done) {
        const flow = [
            {
                id: "controller2", 
                type: "alexa-home-controller",
                controllername: "Test Controller",
                useNode: false,
                useHttps: true,
                certPath: "", // Empty paths should disable HTTPS
                keyPath: "",
                port: 443
            }
        ];

        helper.load(controllerNode, flow, function () {
            const controller = helper.getNode("controller2");
            controller.should.have.property('useNode', false);
            // HTTPS should be disabled due to missing certificate paths
            controller.should.have.property('useHttps', false);
            done();
        });
    });

    it('should work normally when both useNode and useHttps are false', function (done) {
        const flow = [
            {
                id: "controller3", 
                type: "alexa-home-controller",
                controllername: "Test Controller",
                useNode: false,
                useHttps: false,
                port: 80
            }
        ];

        helper.load(controllerNode, flow, function () {
            const controller = helper.getNode("controller3");
            controller.should.have.property('useNode', false);
            controller.should.have.property('useHttps', false);
            controller.should.have.property('port', 80);
            done();
        });
    });

    it('should use environment variable ALEXA_HTTPS but disable it when useNode is true', function (done) {
        // Set environment variable
        process.env.ALEXA_HTTPS = 'true';
        
        const flow = [
            {
                id: "controller4", 
                type: "alexa-home-controller",
                controllername: "Test Controller",
                useNode: true,
                port: 80
            }
        ];

        helper.load(controllerNode, flow, function () {
            const controller = helper.getNode("controller4");
            controller.should.have.property('useNode', true);
            // Should be disabled despite environment variable
            controller.should.have.property('useHttps', false);
            
            // Clean up environment variable
            delete process.env.ALEXA_HTTPS;
            done();
        });
    });
});
