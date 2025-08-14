/**
 * Test suite for utility modules - Template Engine and Utils
 * Validates the modernized functionality
 */

"use strict";

const should = require("should");
const {
  renderTemplate,
  getNestedProperty,
} = require("../alexa/template-engine");
const utils = require("../alexa/utils");
const TemplateManager = require("../alexa/template-manager");

describe("Utility Modules", function () {
  describe("Template Engine", function () {
    it("should render simple variables", function () {
      const template = "Hello {{name}}!";
      const data = { name: "World" };
      const result = renderTemplate(template, data);
      result.should.equal("Hello World!");
    });

    it("should handle nested properties", function () {
      const template = "User: {{user.name}}, Age: {{user.age}}";
      const data = { user: { name: "John", age: 30 } };
      const result = renderTemplate(template, data);
      result.should.equal("User: John, Age: 30");
    });

    it("should render arrays with loops", function () {
      const template = "Items: {{#items}}{{name}}, {{/items}}";
      const data = { items: [{ name: "Apple" }, { name: "Banana" }] };
      const result = renderTemplate(template, data);
      result.should.equal("Items: Apple, Banana, ");
    });

    it("should handle missing variables gracefully", function () {
      const template = "Hello {{missing}}!";
      const data = {};
      const result = renderTemplate(template, data);
      result.should.equal("Hello !");
    });
  });

  describe("Utils Module", function () {
    it("should validate ports correctly", function () {
      utils.isValidPort(8080).should.be.true();
      utils.isValidPort("3000").should.be.true();
      utils.isValidPort(0).should.be.false();
      utils.isValidPort(65536).should.be.false();
      utils.isValidPort("invalid").should.be.false();
    });

    it("should generate MAC addresses", function () {
      const mac = utils.generateMacAddress("test-id");
      mac.should.match(
        /^[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/,
      );
    });

    it("should format UUIDs correctly", function () {
      utils.formatUUID("test.id.123").should.equal("testid123");
      utils.formatUUID(null).should.equal("");
      utils.formatUUID(undefined).should.equal("");
    });

    it("should strip whitespace correctly", function () {
      const content = "Line  1\n  Line   2\r\n   Line 3  ";
      const result = utils.stripWhitespace(content);
      result.should.equal("Line 1 Line 2 Line 3");
    });

    it("should parse JSON safely", function () {
      utils.safeJsonParse('{"test": true}').should.eql({ test: true });
      utils.safeJsonParse("invalid json", "default").should.equal("default");
      should(utils.safeJsonParse("invalid json")).be.null();
    });
  });

  describe("Template Manager", function () {
    it("should create template manager instance", function () {
      const tm = new TemplateManager();
      tm.should.be.instanceOf(TemplateManager);
      tm.getStats().should.have.property("templatesLoaded");
    });

    it("should validate template data", function () {
      const tm = new TemplateManager();
      tm.validateData({ name: "test", age: 30 }, ["name"]).should.be.true();
      tm.validateData({ age: 30 }, ["name"]).should.be.false();
      tm.validateData(null, ["name"]).should.be.false();
    });
  });
});
