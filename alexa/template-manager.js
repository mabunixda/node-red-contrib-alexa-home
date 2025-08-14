/**
 * Template manager for Node-RED Alexa Home
 * Handles template loading, caching, and rendering with validation
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { renderTemplate, TemplateCache } = require("./template-engine");

class TemplateManager {
  constructor(templateDir) {
    this.templateDir = templateDir || path.join(__dirname, "templates");
    this.cache = new TemplateCache(20);
    this.templates = new Map();
    this.loadTemplates();
  }

  /**
   * Load all templates from the template directory
   */
  loadTemplates() {
    const templateFiles = {
      "setup.xml": "setup.xml",
      "index.html": "index.html",
      "registration.json": "registration.json",
      "response.json": "response.json",
      "list.json": "items/list.json",
      "config.json": "items/config.json",
      "get-state.json": "items/get-state.json",
      "set-state.json": "items/set-state.json",
    };

    Object.entries(templateFiles).forEach(([key, file]) => {
      try {
        const templatePath = path.join(this.templateDir, file);
        const content = fs.readFileSync(templatePath, "utf8");
        this.templates.set(key, content);
      } catch (error) {
        console.warn(`Failed to load template ${file}: ${error.message}`);
      }
    });
  }

  /**
   * Get a template by name
   * @param {string} name - Template name
   * @returns {string} Template content
   */
  getTemplate(name) {
    const cached = this.cache.get(name);
    if (cached) return cached;

    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template '${name}' not found`);
    }

    this.cache.set(name, template);
    return template;
  }

  /**
   * Render a template with data
   * @param {string} templateName - Name of the template
   * @param {Object} data - Data for template rendering
   * @param {Object} partials - Optional partials
   * @returns {string} Rendered template
   */
  render(templateName, data = {}, partials = {}) {
    try {
      const template = this.getTemplate(templateName);
      return renderTemplate(template, data, partials);
    } catch (error) {
      throw new Error(
        `Failed to render template '${templateName}': ${error.message}`,
      );
    }
  }

  /**
   * Render template with post-processing for JSON responses
   * @param {string} templateName - Template name
   * @param {Object} data - Template data
   * @param {Object} partials - Optional partials
   * @returns {string} Processed template output
   */
  renderJson(templateName, data = {}, partials = {}) {
    const content = this.render(templateName, data, partials);

    // Clean up empty iterator stoppers for JSON templates
    return content
      .replace(/(\{\s+)?,?[^,]+_emptyIteratorStopper": \{\}/g, "$1")
      .replace(/(\[|\{)?","?[^,}]+_emptyIteratorStopper":""/gi, (match) => {
        return match.startsWith('"') ? "" : match.charAt(0);
      });
  }

  /**
   * Validate template data before rendering
   * @param {Object} data - Data to validate
   * @param {Array<string>} requiredFields - Required field names
   * @returns {boolean} True if validation passes
   */
  validateData(data, requiredFields = []) {
    if (!data || typeof data !== "object") {
      return false;
    }

    return requiredFields.every((field) => {
      const value = data[field];
      return value !== undefined && value !== null && value !== "";
    });
  }

  /**
   * Reload templates from disk
   */
  reload() {
    this.cache.clear();
    this.templates.clear();
    this.loadTemplates();
  }

  /**
   * Get template statistics
   * @returns {Object} Template statistics
   */
  getStats() {
    return {
      templatesLoaded: this.templates.size,
      cacheSize: this.cache.cache.size,
      templateNames: Array.from(this.templates.keys()),
    };
  }
}

module.exports = TemplateManager;
