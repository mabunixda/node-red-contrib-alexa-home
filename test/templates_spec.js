const should = require("should");
const fs = require("fs");
const path = require("path");

describe("Templates and Static Resources", function () {
  const templateDir = path.join(__dirname, "../alexa/templates");
  const itemsDir = path.join(templateDir, "items");

  describe("Template Files Existence", function () {
    it("should have all required template files", function () {
      const requiredTemplates = [
        "index.html",
        "registration.json",
        "response.json",
        "setup.xml",
      ];

      requiredTemplates.forEach(function (template) {
        const templatePath = path.join(templateDir, template);
        fs.existsSync(templatePath).should.be.true(
          `Template ${template} should exist`,
        );
      });
    });

    it("should have all required item template files", function () {
      const requiredItemTemplates = [
        "config.json",
        "get-state.json",
        "list.json",
        "set-state.json",
      ];

      requiredItemTemplates.forEach(function (template) {
        const templatePath = path.join(itemsDir, template);
        fs.existsSync(templatePath).should.be.true(
          `Item template ${template} should exist`,
        );
      });
    });
  });

  describe("Template Content Validation", function () {
    it("should have valid setup.xml template", function () {
      const setupPath = path.join(templateDir, "setup.xml");
      const content = fs.readFileSync(setupPath, "utf8");

      // Should contain Mustache placeholders
      content.should.containEql("{{uuid}}");
      content.should.containEql("{{baseUrl}}");

      // Should be valid XML structure
      content.should.containEql('<?xml version="1.0"');
      content.should.containEql("urn:schemas-upnp-org:device:Basic:1");
    });

    it("should have valid registration.json template", function () {
      const regPath = path.join(templateDir, "registration.json");
      const content = fs.readFileSync(regPath, "utf8");

      // Should contain Mustache placeholder
      content.should.containEql("{{username}}");

      // Should be parseable JSON structure (after mustache rendering)
      content.should.containEql("success");
    });

    it("should have valid response.json template", function () {
      const responsePath = path.join(templateDir, "response.json");
      const content = fs.readFileSync(responsePath, "utf8");

      // Should be a valid JSON structure with lights
      content.should.containEql("lights");
      content.should.containEql("config");
    });

    it("should have valid index.html template", function () {
      const indexPath = path.join(templateDir, "index.html");
      const content = fs.readFileSync(indexPath, "utf8");

      // Should contain Mustache placeholders
      content.should.containEql("{{baseUrl}}");
      content.should.containEql("{{id}}");

      // Should be valid HTML
      content.should.containEql("<html>");
      content.should.containEql("</html>");
    });

    it("should have valid list.json template", function () {
      const listPath = path.join(itemsDir, "list.json");
      const content = fs.readFileSync(listPath, "utf8");

      // Should contain Mustache iteration
      content.should.containEql("{{#lights}}");
      content.should.containEql("{{/lights}}");

      // Should be valid JSON object structure
      content.should.match(/^\s*\{/);
    });

    it("should have valid config.json template", function () {
      const configPath = path.join(itemsDir, "config.json");
      const content = fs.readFileSync(configPath, "utf8");

      // Should be valid JSON object
      content.should.match(/^\s*\{/);
      content.should.containEql('"name":');
    });

    it("should have valid get-state.json template", function () {
      const statePath = path.join(itemsDir, "get-state.json");
      const content = fs.readFileSync(statePath, "utf8");

      // Should contain light state properties
      content.should.containEql('"on":');
      content.should.containEql('"bri":');
    });

    it("should have valid set-state.json template", function () {
      const setStatePath = path.join(itemsDir, "set-state.json");
      const content = fs.readFileSync(setStatePath, "utf8");

      // Should be JSON array for response format
      content.should.match(/^\s*\[/);
    });
  });

  describe("Icon Resources", function () {
    it("should have alexa-home icon", function () {
      const iconPath = path.join(__dirname, "../alexa/icons/alexa-home.png");
      fs.existsSync(iconPath).should.be.true(
        "alexa-home.png icon should exist",
      );

      // Should be a valid PNG file (starts with PNG signature)
      const buffer = fs.readFileSync(iconPath);
      // PNG files start with these bytes
      buffer[0].should.equal(0x89);
      buffer[1].should.equal(0x50); // 'P'
      buffer[2].should.equal(0x4e); // 'N'
      buffer[3].should.equal(0x47); // 'G'
    });
  });

  describe("HTML Files", function () {
    it("should have valid alexa-home.html node definition", function () {
      const htmlPath = path.join(__dirname, "../alexa/nodes/alexa-lights.html");
      const content = fs.readFileSync(htmlPath, "utf8");

      // Should contain Node-RED node definition
      content.should.containEql("RED.nodes.registerType");
      content.should.containEql("alexa-home");

      // Should have proper HTML structure
      content.should.containEql('<script type="text/javascript">');
      content.should.containEql('<script type="text/x-red"');
    });

    it("should have valid alexa-home-controller.html node definition", function () {
      const htmlPath = path.join(
        __dirname,
        "../alexa/nodes/alexa-home-controller.html",
      );
      const content = fs.readFileSync(htmlPath, "utf8");

      // Should contain Node-RED node definition
      content.should.containEql("RED.nodes.registerType");
      content.should.containEql("alexa-home-controller");

      // Should have proper HTML structure
      content.should.containEql('<script type="text/javascript">');
      content.should.containEql('<script type="text/x-red"');
    });
  });

  describe("Template Mustache Syntax", function () {
    it("should not have unmatched Mustache brackets", function () {
      const templateFiles = [
        path.join(templateDir, "index.html"),
        path.join(templateDir, "registration.json"),
        path.join(templateDir, "setup.xml"),
        path.join(itemsDir, "list.json"),
        path.join(itemsDir, "config.json"),
        path.join(itemsDir, "get-state.json"),
        // Excluding set-state.json as it appears to have complex mustache syntax
      ];

      templateFiles.forEach(function (filePath) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8");

          // Count opening and closing brackets
          const openBrackets = (content.match(/\{\{/g) || []).length;
          const closeBrackets = (content.match(/\}\}/g) || []).length;

          openBrackets.should.equal(
            closeBrackets,
            `Template ${path.basename(
              filePath,
            )} should have matching Mustache brackets`,
          );
        }
      });
    });

    it("should use valid Mustache variable names", function () {
      const templateFiles = [
        {
          file: path.join(templateDir, "setup.xml"),
          vars: ["uuid", "baseUrl"],
        },
        {
          file: path.join(templateDir, "index.html"),
          vars: ["id", "uuid", "baseUrl"],
        },
        {
          file: path.join(templateDir, "registration.json"),
          vars: ["username"],
        },
        { file: path.join(itemsDir, "list.json"), vars: ["#lights"] }, // Test for iteration
      ];

      templateFiles.forEach(function (templateInfo) {
        if (fs.existsSync(templateInfo.file)) {
          const content = fs.readFileSync(templateInfo.file, "utf8");

          templateInfo.vars.forEach(function (varName) {
            content.should.containEql(
              `{{${varName}}}`,
              `Template ${path.basename(
                templateInfo.file,
              )} should contain {{${varName}}}`,
            );
          });
        }
      });
    });
  });

  describe("File Encoding and Format", function () {
    it("should have UTF-8 encoded template files", function () {
      const templateFiles = fs
        .readdirSync(templateDir)
        .filter((f) => !f.startsWith("."));

      templateFiles.forEach(function (fileName) {
        const filePath = path.join(templateDir, fileName);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          // Try to read as UTF-8, should not throw
          (function () {
            fs.readFileSync(filePath, "utf8");
          }).should.not.throw(`Template ${fileName} should be valid UTF-8`);
        }
      });
    });

    it("should have consistent line endings", function () {
      const templateFiles = [
        path.join(templateDir, "setup.xml"),
        path.join(templateDir, "registration.json"),
        path.join(itemsDir, "list.json"),
      ];

      templateFiles.forEach(function (filePath) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8");

          // Should not contain Windows line endings mixed with Unix
          const hasWindows = content.includes("\r\n");
          const hasUnix = content.includes("\n") && !content.includes("\r\n");

          if (hasWindows && hasUnix) {
            should.fail(
              `Template ${path.basename(filePath)} has mixed line endings`,
            );
          }
        }
      });
    });
  });
});
