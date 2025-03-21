/**
 * Browser-Use Utilities
 * JavaScript ES6 version of utils.py
 */

import { getLogger } from './logging_config.js';

// Logger instance
export const logger = getLogger('browser_use.utils');

/**
 * Measure execution time of an asynchronous function
 * @param {string} name - Name of the function
 * @param {Function} func - Async function to measure
 * @returns {Promise<any>} Result of the function
 */
export async function timeExecutionAsync(name, func) {
  const start = process.hrtime.bigint();
  try {
    return await func();
  } finally {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // Convert to milliseconds
    logger.debug(`${name} took ${duration.toFixed(2)}ms`);
  }
}

/**
 * Measure execution time of a synchronous function
 * @param {string} name - Name of the function
 * @param {Function} func - Sync function to measure
 * @returns {any} Result of the function
 */
export function timeExecutionSync(name, func) {
  const start = process.hrtime.bigint();
  try {
    return func();
  } finally {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // Convert to milliseconds
    logger.debug(`${name} took ${duration.toFixed(2)}ms`);
  }
}

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after the specified time
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
export function randomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if a string is a valid URL
 * @param {string} str - String to check
 * @returns {boolean} Whether the string is a valid URL
 */
export function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Truncate a string to a specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncateString(str, maxLength = 100) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Escape HTML special characters
 * @param {string} html - HTML string to escape
 * @returns {string} Escaped HTML
 */
export function escapeHtml(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Creates a singleton instance of a class
 * @param {Class} Constructor - Class constructor
 * @returns {Function} - Factory function that returns a singleton instance
 */
export function singleton(Constructor) {
  let instance = null;
  
  return function(...args) {
    if (instance === null) {
      instance = new Constructor(...args);
    }
    return instance;
  };
}

// Alternative implementation of decorators for environments that don't support them
export const utils = {
  /**
   * Measures execution time of a synchronous function
   * @param {Function} fn - The function to measure
   * @param {string} additionalText - Additional text to display in the log
   * @returns {Function} - Wrapped function
   */
  timeExecutionSyncFn: (fn, additionalText = '') => {
    return function(...args) {
      const startTime = performance.now();
      const result = fn.apply(this, args);
      const executionTime = (performance.now() - startTime) / 1000; // Convert to seconds
      logger.debug(`${additionalText} Execution time: ${executionTime.toFixed(2)} seconds`);
      return result;
    };
  },

  /**
   * Measures execution time of an asynchronous function
   * @param {Function} fn - The async function to measure
   * @param {string} additionalText - Additional text to display in the log
   * @returns {Function} - Wrapped async function
   */
  timeExecutionAsyncFn: (fn, additionalText = '') => {
    return async function(...args) {
      const startTime = performance.now();
      const result = await fn.apply(this, args);
      const executionTime = (performance.now() - startTime) / 1000; // Convert to seconds
      logger.debug(`${additionalText} Execution time: ${executionTime.toFixed(2)} seconds`);
      return result;
    };
  }
};
