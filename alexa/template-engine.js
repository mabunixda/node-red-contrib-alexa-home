1	/**
2	 * Modern template engine for Node-RED Alexa Home
3	 * Replaces Mustache with a lightweight, Express-compatible solution
4	 */
5
6	"use strict";
7
8	/**
9	 * Get nested property from object using dot notation
10	 * @param {Object} obj - Object to search
11	 * @param {string} path - Property path (e.g., 'user.name')
12	 * @returns {*} Property value or undefined
13	 */
14	function getNestedProperty(obj, path) {
15	  if (!obj || !path) return undefined;
16
17	  const keys = path.split(".");
18	  let current = obj;
19
20	  for (const key of keys) {
21	    if (current && typeof current === "object" && key in current) {
22	      current = current[key];
23	    } else {
24	      return undefined;
25	    }
26	  }
27
28	  return current;
29	}
30
31	/**
32	 * Modern template renderer with enhanced features
33	 * @param {string} template - Template string with {{variable}} placeholders
34	 * @param {Object} data - Data object with variables to substitute
35	 * @param {Object} partials - Optional partials for template inclusion
36	 * @returns {string} Rendered template
37	 */
38	function renderTemplate(template, data = {}, partials = {}) {
39	  if (typeof template !== "string") {
40	    throw new Error("Template must be a string");
41	  }
42
43	  let result = template;
44
45	  try {
46	    // Handle partials first if any
47	    if (partials && Object.keys(partials).length > 0) {
48	      Object.entries(partials).forEach(([key, partial]) => {
49	        const partialRegex = new RegExp(`\\{\\{>\\s*${key}\\s*\\}\\}\\``;
50	        result = result.replace(partialRegex, partial || "");
51	      });
52	    }
53
54	    // Handle simple loops {{#array}}...{{/array}}
55	    result = result.replace(
56	      /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
57	      (match, arrayKey, loopContent) => {
58	        const array = getNestedProperty(data, arrayKey);
59	        if (!Array.isArray(array) || array.length === 0) {
60	          return "";
61	        }
62
63	        return array
64	          .map((item, index) => {
65	            let itemContent = loopContent;
66
67	            // Add index and other loop variables
68	            const loopData = {
69	              ...item,
70	              _index: index,
71	              _first: index === 0,
72	              _last: index === array.length - 1,
73	              _length: array.length,
74	            };
75
76	            // Replace variables within the loop
77	            itemContent = itemContent.replace(
78	              /\{\{([^#\/\{\}]+)\}\}/g,
79	              (varMatch, varKey) => {
80	                const trimmedVarKey = varKey.trim();
81	                const value = getNestedProperty(loopData, trimmedVarKey);
82	                return value !== undefined ? String(value) : "";
83	              },
84	            );
85
86	            return itemContent;
87	          })
88	          .join("");
89	      },
90	    );
91
92	    // Handle simple variable substitution {{variable}}
93	    result = result.replace(/\{\{([^#\/\{\}]+)\}\}/g, (match, key) => {
94	      const trimmedKey = key.trim();
95	      const value = getNestedProperty(data, trimmedKey);
96	      return value !== undefined ? String(value) : "";
97	    });
98
99	    return result;
100	  } catch (error) {
101	    throw new Error(`Template rendering failed: ${error.message}`);
102	  }
103	}
104
105	/**
106	 * Template cache for performance optimization
107	 */
108	class TemplateCache {
109	  constructor(maxSize = 50) {
110	    this.cache = new Map();
111	    this.maxSize = maxSize;
112	  }
113
114	  get(key) {
115	    const item = this.cache.get(key);
116	    if (item) {
117	      // Move to end (LRU)
118	      this.cache.delete(key);
119	      this.cache.set(key, item);
120	      return item;
121	    }
122	    return null;
123	  }
124
125	  set(key, value) {
126	    if (this.cache.has(key)) {
127	      this.cache.delete(key);
128	    } else if (this.cache.size >= this.maxSize) {
129	      // Remove least recently used
130	      const firstKey = this.cache.keys().next().value;
131	      this.cache.delete(firstKey);
132	    }
133	    this.cache.set(key, value);
134	  }
135
136	  clear() {
137	    this.cache.clear();
138	  }
139	}
140
141	module.exports = {
142	  renderTemplate,
143	  getNestedProperty,
144	  TemplateCache,
145	};