/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ValidationError } from '../types';

/**
 * Attempts to parse JSON, offering rich error feedback if it fails.
 */
export function parseAndValidate(raw: string): { data: any; error: ValidationError | null } {
  if (!raw.trim()) {
    return { data: null, error: { message: 'Input is empty' } };
  }

  try {
    const parsed = JSON.parse(raw);
    return { data: parsed, error: null };
  } catch (err: any) {
    const message = err.message || 'Unknown parsing error';
    const result: ValidationError = { message };

    // Locate line and column if available
    // Standard V8 engines provide error formats like:
    // "Unexpected token } in JSON at position 124"
    // "Expected ',' or '}' after property value in JSON at position 45 (line 3 column 5)"
    // Or sometimes "JSON.parse: unexpected non-whitespace character after JSON data at line 2 column 5"
    
    let position = -1;
    let line = -1;
    let column = -1;

    // Regex 1: Parse standard position
    const positionMatch = message.match(/position (\d+)/i);
    if (positionMatch) {
      position = parseInt(positionMatch[1], 10);
    }

    // Regex 2: Parse line and column
    const lineColumnMatch = message.match(/line (\d+)\s+column (\d+)/i);
    if (lineColumnMatch) {
      line = parseInt(lineColumnMatch[1], 10);
      column = parseInt(lineColumnMatch[2], 10);
    }

    // If we have position but not line/column, compute them
    if (position >= 0 && (line === -1 || column === -1)) {
      const beforeError = raw.substring(0, position);
      const lines = beforeError.split(/\r?\n/);
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }

    if (line !== -1) {
      result.line = line;
    }
    if (column !== -1) {
      result.column = column;
    }
    if (position !== -1) {
      result.charIndex = position;
    }

    // Create snippet around the error
    if (line !== -1) {
      const rawLines = raw.split(/\r?\n/);
      const errorLineIndex = line - 1;
      const start = Math.max(0, errorLineIndex - 1);
      const end = Math.min(rawLines.length - 1, errorLineIndex + 1);
      
      let snippet = '';
      for (let i = start; i <= end; i++) {
        const isErrorLine = i === errorLineIndex;
        const prefix = isErrorLine ? ' > ' : '   ';
        snippet += `${prefix}${i + 1}: ${rawLines[i]}\n`;
        if (isErrorLine && column !== -1) {
          const padding = ' '.repeat(String(i + 1).length + 5 + (column - 1));
          snippet += `${padding}^\n`;
        }
      }
      result.snippet = snippet;
    }

    return { data: null, error: result };
  }
}

/**
 * Format dynamic types into stringified JSON.
 */
export function formatJson(
  data: any,
  style: '2' | '4' | 'tabs' | 'minify',
  sortKeys: boolean = false
): string {
  if (data === undefined || data === null) return '';

  const processedData = sortKeys ? makeKeysSorted(data) : data;

  if (style === 'minify') {
    return JSON.stringify(processedData);
  }

  const space = style === 'tabs' ? '\t' : parseInt(style, 10);
  return JSON.stringify(processedData, null, space);
}

/**
 * Deep sort the object keys alphabetically.
 */
export function makeKeysSorted(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(makeKeysSorted);
  }

  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const sorted: any = {};
  for (const key of keys) {
    sorted[key] = makeKeysSorted(obj[key]);
  }
  return sorted;
}

/**
 * Filters JSON object via custom dotted query path.
 * Supports: `$` (root), `$.users`, `$.users[0]`, `users[0].name`, `items[*].id`
 */
export function filterJsonByQuery(data: any, query: string): any {
  let cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery === '$') return data;

  // Standardize the query to a path sequence:
  // e.g. "$.store.book[0].title" => ["store", "book", "0", "title"]
  // Remove starting "$." or "$"
  if (cleanQuery.startsWith('$.')) {
    cleanQuery = cleanQuery.substring(2);
  } else if (cleanQuery.startsWith('$')) {
    cleanQuery = cleanQuery.substring(1);
  }

  if (!cleanQuery) return data;

  // Split paths considering brackets for arrays:
  // "users[0].name" => "users", "0", "name"
  const normalizedPath = cleanQuery
    .replace(/\[(\w+)\]/g, '.$1') // convert [index] or ['key'] to .index
    .replace(/^\./, '');          // strip leading dot if any
  
  const pathParts = normalizedPath.split('.');

  let current = data;
  for (const part of pathParts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Support wildcard arrays, e.g. "users[*].id" or "users.*.id"
    if (part === '*' && Array.isArray(current)) {
      // Map to rest of path dynamically
      const remainingPath = pathParts.slice(pathParts.indexOf(part) + 1).join('.');
      if (!remainingPath) {
        return current;
      }
      return current.map(item => filterJsonByQuery(item, remainingPath)).filter(v => v !== undefined);
    }

    current = current[part];
  }

  return current;
}

/**
 * Custom light-weight XML converter.
 */
export function jsonToXml(obj: any, rootName = 'root', indent = '  ', depth = 0): string {
  const currentIndent = indent.repeat(depth);
  
  if (obj === null) {
    return `${currentIndent}<${rootName} nil="true" />`;
  }

  if (typeof obj !== 'object') {
    // Escape string values for xml
    const strVal = String(obj)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return `${currentIndent}<${rootName}>${strVal}</${rootName}>`;
  }

  if (Array.isArray(obj)) {
    return obj
      .map(item => jsonToXml(item, 'item', indent, depth))
      .join('\n');
  }

  const childXml = Object.keys(obj)
    .map(key => {
      // XML elements cannot start with numbers or contain invalid symbols
      const cleanKey = key.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const validKey = /^[a-zA-Z_]/.test(cleanKey) ? cleanKey : `_${cleanKey}`;
      return jsonToXml(obj[key], validKey, indent, depth + 1);
    })
    .join('\n');

  return `${currentIndent}<${rootName}>\n${childXml}\n${currentIndent}</${rootName}>`;
}

/**
 * Custom light-weight YAML converter.
 */
export function jsonToYaml(obj: any, depth = 0): string {
  const spaces = '  '.repeat(depth);

  if (obj === null) {
    return 'null';
  }

  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      // Output on multiple lines if has newlines
      if (obj.includes('\n')) {
        return `|\n${obj.split('\n').map(line => '  '.repeat(depth + 1) + line).join('\n')}`;
      }
      // Wrap strings that have YAML special characters
      if (/[:#\[\]\{\},&*!|>'"\s]/.test(obj) || obj === '') {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
    }
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj
      .map(item => {
        const itemVal = jsonToYaml(item, depth + 1).trimStart();
        return `${spaces}- ${itemVal}`;
      })
      .join('\n');
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';

  return keys
    .map(key => {
      const val = obj[key];
      // Check if value is object or array and non-empty
      const isNested = val !== null && typeof val === 'object' && Object.keys(val).length > 0;
      const formattedVal = jsonToYaml(val, depth + 1);
      
      if (isNested) {
        return `${spaces}${key}:\n${formattedVal}`;
      } else {
        return `${spaces}${key}: ${formattedVal.trimStart()}`;
      }
    })
    .join('\n');
}

/**
 * Convert JSON list of objects to CSV/TSV format.
 */
export function jsonToCsv(obj: any, delimiter: ',' | '\t' = ','): string {
  // If not array, turn it into array of one element or extract keys
  let array: any[] = [];
  if (Array.isArray(obj)) {
    array = obj;
  } else if (obj && typeof obj === 'object') {
    // If it's a simple flat object
    array = [obj];
  } else {
    return 'Invalid data structure for CSV. Paste an array or array of nested records.';
  }

  // Find all keys recursively (flattened to 1 level depth for CSV usefulness)
  const flatArray = array.map(item => flattenObject(item));
  const allHeadersSet = new Set<string>();
  flatArray.forEach(item => {
    Object.keys(item).forEach(k => allHeadersSet.add(k));
  });

  const headers = Array.from(allHeadersSet);
  if (headers.length === 0) return '';

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(delimiter),
    ...flatArray.map(item =>
      headers.map(h => escapeCell(item[h])).join(delimiter)
    )
  ];

  return lines.join('\n');
}

/**
 * Flatten nested objects into a single depth for tabular display.
 */
function flattenObject(obj: any, prefix = ''): any {
  let result: any = {};

  if (obj === null || typeof obj !== 'object') {
    if (prefix) {
      result[prefix.slice(0, -1)] = obj;
    }
    return result;
  }

  if (Array.isArray(obj)) {
    obj.forEach((val, idx) => {
      const flat = flattenObject(val, `${prefix}${idx}.`);
      result = { ...result, ...flat };
    });
    return result;
  }

  Object.keys(obj).forEach(key => {
    const flat = flattenObject(obj[key], `${prefix}${key}.`);
    result = { ...result, ...flat };
  });

  return result;
}

/**
 * Provides static mock datasets for developers to test instantly
 */
export const SAMPLE_DATASETS = [
  {
    name: '📚 Bookstore Catalog',
    description: 'A rich dataset of categories, array elements, attributes, and integers.',
    data: `{
  "store": {
    "name": "Acme Book Emporium",
    "established": 1994,
    "location": {
      "city": "San Francisco",
      "state": "California",
      "coordinates": [37.7749, -122.4194]
    },
    "genres": ["Fiction", "Technology", "Science", "Biography"],
    "inventory": [
      {
        "id": "B01",
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "categories": ["Programming", "Software Crafts"],
        "price": 39.99,
        "instock": true,
        "details": {
          "pages": 464,
          "publisher": "Prentice Hall"
        }
      },
      {
        "id": "B02",
        "title": "The Hobbit",
        "author": "J.R.R. Tolkien",
        "categories": ["Fantasy", "Classic"],
        "price": 14.95,
        "instock": false,
        "details": {
          "pages": 310,
          "publisher": "Allen & Unwin"
        }
      },
      {
        "id": "B03",
        "title": "Introduction to Algorithms",
        "author": "Thomas H. Cormen",
        "categories": ["Education", "Computer Science"],
        "price": 84.50,
        "instock": true,
        "details": {
          "pages": 1312,
          "publisher": "MIT Press"
        }
      }
    ],
    "specialOffer": null
  }
}`
  },
  {
    name: '👥 Organization Hierarchy',
    description: 'A structural tree layout perfect for testing folding and query lists.',
    data: `[
  {
    "id": 101,
    "displayName": "Elizabeth Sterling",
    "role": "Chief Executive Officer",
    "department": "Executive",
    "status": "Active",
    "skills": ["Leadership", "Venture Capital", "Corporate Strategy"],
    "directReports": [
      {
        "id": 204,
        "displayName": "Marcus Chen",
        "role": "VP of Engineering",
        "department": "Engineering",
        "status": "Active",
        "skills": ["Distributed Systems", "Rust", "Architecture"],
        "directReports": []
      },
      {
        "id": 208,
        "displayName": "Sarah Jenkins",
        "role": "Director of Product Management",
        "department": "Product",
        "status": "Active",
        "skills": ["UX Research", "Roadmap Execution"],
        "directReports": []
      }
    ]
  },
  {
    "id": 102,
    "displayName": "Amir Sadeh",
    "role": "VP of Marketing",
    "department": "Marketing",
    "status": "On Leave",
    "skills": ["SEO", "GTM Execution", "Growth Loops"],
    "directReports": []
  }
]`
  },
  {
    name: '📍 GeoJSON Coordinate Map',
    description: 'Highly nested structural coordinates and property map arrays.',
    data: `{
  "type": "FeatureCollection",
  "crs": {
    "type": "name",
    "properties": {
      "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
    }
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "placeName": "Golden Gate Bridge",
        "class": "Bridge",
        "rating": 4.9,
        "nationalPark": true
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4783, 37.8199, 67.0]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "placeName": "Alcatraz Island",
        "class": "Historic Landmark",
        "rating": 4.7,
        "nationalPark": true
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4229, 37.8270, 0.0]
      }
    }
  ]
}`
  },
  {
    name: '❌ Buggy JSON (With Common Syntax Errors)',
    description: 'Use this broken snapshot to test interactive line highlighting and parsing validations.',
    data: `{
  "projectName": "Mercury Pro",
  "version": 1.2,
  "isActive": true,
  "tags": [
    "alpha",
    "internal"
  ],
  "developers": [
    {
      "name": "Jane Doe",
      "role": "Lead Architect"
    },
    {
      "name": "Bob Smith"
      "role": "Fullstack Developer" // Notice the missing comma above!
    }
  ],
  "buildSetting" : {
    "target": "web",
    "minify": true, // Notice the trailing comma after minify! (Illegal in JSON)
  }
}`
  }
];
