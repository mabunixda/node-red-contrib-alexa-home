const should = require("should");
const helper = require("node-red-node-test-helper");
const alexaNode = require("../alexa/alexa-home.js");

helper.init(require.resolve("node-red"));

describe("alexa-home Node", function() {
  beforeEach(function(done) {
    helper.startServer(done);
  });

  afterEach(function(done) {
    helper.unload();
    helper.stopServer(done);
  });

  it("should be loaded with correct default params", function(done) {
    const flow = [
      { id: "n1", type: "alexa-home", devicename: "Kitchen Light" }
    ];
    helper.load(alexaNode, flow, function() {
      const n1 = helper.getNode("n1");
      n1.should.have.property("name", "Kitchen Light");
      n1.should.have.property("devicetype", "Extended color light");
      done();
    });
  });
  it("should round bri 127 to 50% normalized", function(done) {
    const flow = [
      {
        id: "n1",
        type: "alexa-home",
        devicename: "Kitchen Light",
        wires: [["n2"]]
      },
      { id: "n2", type: "helper" }
    ];
    helper.load(alexaNode, flow, function() {
      const n2 = helper.getNode("n2");
      const n1 = helper.getNode("n1");
      n1.controller = n2;
      n2.on("input", function(msg) {
        msg.payload.should.have.property("on", true);
        msg.payload.should.have.property("bri", 127);
        msg.payload.should.have.property("bri_normalized", 50);
        done();
      });
      n1.receive({ payload: { bri: 127 }, output: true });
    });
  });
  it("should switch to on", function(done) {
    const flow = [
      {
        id: "n1",
        type: "alexa-home",
        devicename: "Kitchen Light",
        wires: [["n2"]]
      },
      { id: "n2", type: "helper" }
    ];
    helper.load(alexaNode, flow, function() {
      const n2 = helper.getNode("n2");
      const n1 = helper.getNode("n1");
      n1.controller = n2;

      n2.on("input", function(msg) {
        msg.payload.should.have.property("on", true);
        msg.payload.should.have.property("bri", 254);
        msg.payload.should.have.property("bri_normalized", 100);
        done();
      });
      n1.receive({ payload: { on: true }, output: true });
    });
  });
  it("should set color to defined", function(done) {
    const flow = [
      {
        id: "n1",
        type: "alexa-home",
        devicename: "Kitchen Light",
        wires: [["n2"]]
      },
      { id: "n2", type: "helper" }
    ];
    helper.load(alexaNode, flow, function() {
      const n2 = helper.getNode("n2");
      const n1 = helper.getNode("n1");
      n1.controller = n2;

      n2.on("input", function(msg) {
        msg.payload.should.have.property("on", true);
        msg.payload.should.have.property("bri_normalized", 100);
        msg.payload.should.have.property("xy", [0.3, 0.3]);
        done();
      });
      n1.receive({ payload: { on: true, xy: [0.3, 0.3] }, output: true });
    });
  });
});
