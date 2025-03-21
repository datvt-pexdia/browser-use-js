/**
 * Browser-Use Browser Views
 * JavaScript ES6 version of views.py
 */

import { DOMHistoryElement } from '../dom/history_tree_processor/view.js';
import { DOMState } from '../dom/views.js';

/**
 * Represents information about a browser tab
 */
export class TabInfo {
  /**
   * @param {number} pageId - Page ID
   * @param {string} url - URL
   * @param {string} title - Title
   */
  constructor(pageId, url, title) {
    this.pageId = pageId;
    this.url = url;
    this.title = title;
  }

  /**
   * Convert to a plain object
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      page_id: this.pageId,
      url: this.url,
      title: this.title
    };
  }
}

/**
 * Browser state
 */
export class BrowserState extends DOMState {
  /**
   * @param {Object} params - Parameters
   * @param {import('../dom/views.js').DOMElementNode} params.elementTree - Element tree
   * @param {Object<number, import('../dom/views.js').DOMElementNode>} params.selectorMap - Selector map
   * @param {string} params.url - URL
   * @param {string} params.title - Title
   * @param {TabInfo[]} params.tabs - Tabs
   * @param {string|null} [params.screenshot=null] - Screenshot
   * @param {number} [params.pixelsAbove=0] - Pixels above
   * @param {number} [params.pixelsBelow=0] - Pixels below
   * @param {string[]} [params.browserErrors=[]] - Browser errors
   */
  constructor({
    elementTree,
    selectorMap,
    url,
    title,
    tabs,
    screenshot = null,
    pixelsAbove = 0,
    pixelsBelow = 0,
    browserErrors = []
  }) {
    super(elementTree, selectorMap);
    this.url = url;
    this.title = title;
    this.tabs = tabs;
    this.screenshot = screenshot;
    this.pixelsAbove = pixelsAbove;
    this.pixelsBelow = pixelsBelow;
    this.browserErrors = browserErrors;
  }
}

/**
 * Browser state history
 */
export class BrowserStateHistory {
  /**
   * @param {string} url - URL
   * @param {string} title - Title
   * @param {TabInfo[]} tabs - Tabs
   * @param {(DOMHistoryElement|null)[]} interactedElement - Interacted elements
   * @param {string|null} [screenshot=null] - Screenshot
   */
  constructor(url, title, tabs, interactedElement, screenshot = null) {
    this.url = url;
    this.title = title;
    this.tabs = tabs;
    this.interactedElement = interactedElement;
    this.screenshot = screenshot;
  }

  /**
   * Convert to a plain object
   * @returns {Object} Plain object
   */
  toDict() {
    return {
      tabs: this.tabs.map(tab => tab.toJSON()),
      screenshot: this.screenshot,
      interacted_element: this.interactedElement.map(el => el ? el.toDict() : null),
      url: this.url,
      title: this.title
    };
  }
}

/**
 * Base class for all browser errors
 */
export class BrowserError extends Error {
  /**
   * @param {string} message - Error message
   */
  constructor(message) {
    super(message);
    this.name = 'BrowserError';
  }
}

/**
 * Error raised when a URL is not allowed
 */
export class URLNotAllowedError extends BrowserError {
  /**
   * @param {string} url - URL that was not allowed
   */
  constructor(url) {
    super(`URL not allowed: ${url}`);
    this.name = 'URLNotAllowedError';
    this.url = url;
  }
} 