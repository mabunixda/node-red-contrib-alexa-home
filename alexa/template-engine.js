/**
 * Modern template engine for Node-RED Alexa Home
 * Replaces Mustache with a lightweight, Express-compatible solution
 */

"use strict";

/**
 * Get nested property from object using dot notation
 * @param {Object} obj - Object to search
 * @param {string} path - Property path (e.g., 'user.name')
 * @returns {*} Property value or undefined
 */
function getNestedProperty(obj, path) {
  if (!obj || !path) return undefined;

  const keys = path.split(".");
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Modern template renderer with enhanced features
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} data - Data object with variables to substitute
 * @param {Object} partials - Optional partials for template inclusion
 * @returns {string} Rendered template
 */
function renderTemplate(template, data = {}, partials = {}) {
  if (typeof template !== "string") {
    throw new Error("Template must be a string");
  }

  let result = template;

  try {
    // Handle partials first if any
    if (partials && Object.keys(partials).length > 0) {
      Object.entries(partials).forEach(([key, partial]) => {
        const partialRegex = new RegExp(`\\{\\{>${key}\\}\\}`, "g");
        result = result.replace(partialRegex, partial || "");
      });
    }

    // Handle simple loops {{#array}}...{{/array}}
    result = result.replace(
      /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (match, arrayKey, loopContent) => {
        const array = getNestedProperty(data, arrayKey);
        if (!Array.isArray(array) || array.length === 0) {
          return "";
        }

        return array
          .map((item, index) => {
            let itemContent = loopContent;

            // Add index and other loop variables
            const loopData = {
              ...item,
              _index: index,
              _first: index === 0,
              _last: index === array.length - 1,
              _length: array.length,
            };

            // Replace variables within the loop
            itemContent = itemContent.replace(
              /\{\{([^#\/\{\}]+)\}\}/g,
              (varMatch, varKey) => {
                const trimmedVarKey = varKey.trim();
                const value = getNestedProperty(loopData, trimmedVarKey);
                return value !== undefined ? String(value) : "";
              },
            );

            return itemContent;
          })
          .join("");
      },
    );

    // Handle simple variable substitution {{variable}}
    result = result.replace(/\{\{([^#\/\{\}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      const value = getNestedProperty(data, trimmedKey);
      return value !== undefined ? String(value) : "";
    });

    return result;
  } catch (error) {
    throw new Error(`Template rendering failed: ${error.message}`);
  }
}

/**
 * Template cache for performance optimization
 */
class TemplateCache {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const item = this.cache.get(key);
    if (item) {
      // Move to end (LRU)
      this.cache.delete(key);
      this.cache.set(key, item);
      return item;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

module.exports = {
  renderTemplate,
  getNestedProperty,
  TemplateCache,
};
