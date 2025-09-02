const request = require("supertest");
const should = require("should");
const helper = require("node-red-node-test-helper");
const controllerNode = require("../alexa/nodes/alexa-home-controller.js");
const alexaNode = require("../alexa/nodes/alexa-lights.js");

let alexaHelper = require("../alexa/alexa-helper.js");
alexaHelper.hubPort = 60000;

function between(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function IsJsonString(str) {
  try {
    var x = JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function isURL(str) {
  const urlRegex =
    "^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$";
  const url = new RegExp(urlRegex, "i");
  return str.length < 2083 && url.test(str);
}

helper.init(require.resolve("node-red"));

describe("alexa-home-controller Node", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  it("should be loaded with correct default params", function (done) {
    hubPort = between(50000, 60000);
    const flow = [
      {
        id: "n1",
        type: "alexa-home-controller",
        controllername: "Test",
        port: hubPort,
        useNode: false,
      },
    ];
    helper.load(controllerNode, flow, function () {
      const n1 = helper.getNode("n1");
      n1.should.have.property("name", "Test");
      n1._hub.should.have.length(1);
      //n1._hub[0].httpServer.should.have.property('_connectionKey', '4:0.0.0.0:60000');
      n1._hub[0].ssdpServer.should.have.property("_started", true);
      n1._hub[0].ssdpServer.should.have.property("_sourcePort", 1900);

      request(n1._hub[0].app)
        .get("/")
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          done();
        });
    });
  });
  it("should respond to setup request", function (done) {
    hubPort = between(50000, 60000);
    const flow = [
      {
        id: "n1",
        type: "alexa-home-controller",
        controllername: "Test",
        port: hubPort,
        useNode: false,
      },
    ];
    helper.load(controllerNode, flow, function () {
      const n1 = helper.getNode("n1");
      n1.should.have.property("name", "Test");
      n1._hub.should.have.length(1);
      request(n1._hub[0].app)
        .get("/alexa-home/setup.xml")
        .expect("Content-Type", /xml/)
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          done();
        });
    });
  });
  it("should respond to config request", function (done) {
    hubPort = between(50000, 60000);
    const flow = [
      {
        id: "n1",
        type: "alexa-home-controller",
        controllername: "Test",
        port: hubPort,
        useNode: false,
      },
    ];
    helper.load(controllerNode, flow, function () {
      const n1 = helper.getNode("n1");
      n1.should.have.property("name", "Test");
      n1._hub.should.have.length(1);
      request(n1._hub[0].app)
        .get("/api/config")
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;

          //let isJson = IsJsonString(res.body)
          //isJson.should.true()

          done();
        });
    });
  });
  it("should respond to lights request", function (done) {
    hubPort = between(50000, 60000);
    const flow = [
      {
        id: "n1",
        type: "alexa-home-controller",
        controllername: "Test",
        port: hubPort,
        useNode: false,
      },
    ];
    helper.load(controllerNode, flow, function () {
      const n1 = helper.getNode("n1");
      n1.should.have.property("name", "Test");
      n1._hub.should.have.length(1);
      request(n1._hub[0].app)
        .get("/api/my-username/lights")
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;

          //var isJson = IsJsonString(res.body)
          //isJson.should.true()

          done();
        });
    });
  });
  it("should respond to registration request", function (done) {
    hubPort = between(50000, 60000);
    const flow = [
      {
        id: "n1",
        type: "alexa-home-controller",
        controllername: "Test",
        port: hubPort,
        useNode: false,
      },
    ];
    helper.load(controllerNode, flow, function () {
      const n1 = helper.getNode("n1");
      n1.should.have.property("name", "Test");
      n1._hub.should.have.length(1);
      request(n1._hub[0].app)
        .post("/api")
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;

          //var isJson = IsJsonString(res.body)
          //isJson.should.true()

          done();
        });
    });
  });
  // it("should respond to single lights request", function (done) {
  //     var flow = [
  //         { id: "n1", type: "alexa-home-controller", controllername: "Test" },
  //         { id: "n2", type: "helper" },
  //         { id: "n3", type: "alexa-home", devicename: "Kitchen Light", wires: [["n2"]] },
  //     ];
  //     helper.load(controllerNode, flow, function () {
  //         var n1 = helper.getNode("n1");
  //         n1.should.have.property('name', 'Test');
  //         n1._hub.should.have.length(1);
  //         request(n1._hub[0].app)
  //             .get("/api/my-username/lights/abc123")
  //             .expect(200)
  //             .expect('Content-Type', /json/)
  //             .end(function (err, res) {
  //                 if (err) throw err;
  //                 done();
  //             });
  //     });
  // });
  // it("should respond to single lights update", function (done) {
  //     var flow = [
  //         { id: "n1", type: "alexa-home-controller", controllername: "Test" }
  //     ];
  //     helper.load(controllerNode, flow, function () {
  //         var n1 = helper.getNode("n1");
  //         n1.should.have.property('name', 'Test');
  //         n1._hub.should.have.length(1);
  //         request(n1._hub[0].app)
  //             .put("/api/my-username/lights/abc123/state")
  //             .expect(200)
  //             .expect('Content-Type', /json/)
  //             .end(function (err, res) {
  //                 if (err) throw err;
  //                 done();
  //             });
  //     });
  // });
});
