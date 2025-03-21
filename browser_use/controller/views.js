/**
 * Browser-Use Controller Views
 * JavaScript ES6 version of views.py
 */

/**
 * Base model for all action models
 */
export class BaseModel {
  /**
   * Validate model
   * @returns {boolean} Whether the model is valid
   */
  validate() {
    return true;
  }
}

/**
 * Action to search Google
 */
export class SearchGoogleAction extends BaseModel {
  /**
   * @param {string} query - Search query
   */
  constructor({ query }) {
    super();
    this.query = query;
  }

  validate() {
    return typeof this.query === 'string' && this.query.length > 0;
  }
}

/**
 * Action to navigate to URL
 */
export class GoToUrlAction extends BaseModel {
  /**
   * @param {string} url - URL to navigate to
   */
  constructor({ url }) {
    super();
    this.url = url;
  }

  validate() {
    return typeof this.url === 'string' && this.url.length > 0;
  }
}

/**
 * Action to click element
 */
export class ClickElementAction extends BaseModel {
  /**
   * @param {number} index - Element index
   * @param {string|null} [xpath=null] - XPath
   */
  constructor({ index, xpath = null }) {
    super();
    this.index = index;
    this.xpath = xpath;
  }

  validate() {
    return typeof this.index === 'number' && this.index >= 0;
  }
}

/**
 * Action to input text
 */
export class InputTextAction extends BaseModel {
  /**
   * @param {number} index - Element index
   * @param {string} text - Text to input
   * @param {string|null} [xpath=null] - XPath
   */
  constructor({ index, text, xpath = null }) {
    super();
    this.index = index;
    this.text = text;
    this.xpath = xpath;
  }

  validate() {
    return typeof this.index === 'number' && this.index >= 0 && typeof this.text === 'string';
  }
}

/**
 * Action to complete task
 */
export class DoneAction extends BaseModel {
  /**
   * @param {string} text - Result text
   * @param {boolean} success - Whether the task was successful
   */
  constructor({ text, success }) {
    super();
    this.text = text;
    this.success = success;
  }

  validate() {
    return typeof this.text === 'string' && typeof this.success === 'boolean';
  }
}

/**
 * Action to switch tab
 */
export class SwitchTabAction extends BaseModel {
  /**
   * @param {number} pageId - Page ID
   */
  constructor({ pageId }) {
    super();
    this.pageId = pageId;
  }

  validate() {
    return typeof this.pageId === 'number' && this.pageId >= 0;
  }
}

/**
 * Action to open tab
 */
export class OpenTabAction extends BaseModel {
  /**
   * @param {string} url - URL to open
   */
  constructor({ url }) {
    super();
    this.url = url;
  }

  validate() {
    return typeof this.url === 'string' && this.url.length > 0;
  }
}

/**
 * Action to scroll
 */
export class ScrollAction extends BaseModel {
  /**
   * @param {number|null} [amount=null] - Amount to scroll
   */
  constructor({ amount = null }) {
    super();
    this.amount = amount;
  }

  validate() {
    return this.amount === null || typeof this.amount === 'number';
  }
}

/**
 * Action to send keys
 */
export class SendKeysAction extends BaseModel {
  /**
   * @param {string} keys - Keys to send
   */
  constructor({ keys }) {
    super();
    this.keys = keys;
  }

  validate() {
    return typeof this.keys === 'string' && this.keys.length > 0;
  }
}

/**
 * Action to extract page content
 */
export class ExtractPageContentAction extends BaseModel {
  /**
   * @param {string} value - Value to extract
   */
  constructor({ value }) {
    super();
    this.value = value;
  }

  validate() {
    return true;
  }
}

/**
 * Action with no parameters
 */
export class NoParamsAction extends BaseModel {
  /**
   * Accepts absolutely anything in the incoming data
   * and discards it, so the final parsed model is empty.
   */
  constructor(data = {}) {
    super();
    // Ignore all inputs
  }

  /**
   * Ignore all inputs
   * @param {Object} values - Values to ignore
   * @returns {Object} Empty object
   */
  static ignoreAllInputs(values) {
    return {};
  }
}

/**
 * Action to extract links from page
 */
export class ExtractLinksAction extends BaseModel {
  /**
   * @param {Object} options - Options
   * @param {string} [options.goal] - Optional goal to filter links
   */
  constructor({ goal = null } = {}) {
    super();
    this.goal = goal;
  }

  validate() {
    return true;
  }
}

/**
 * Action to select an option from dropdown
 */
export class SelectOptionAction extends BaseModel {
  /**
   * @param {Object} options - Options
   * @param {number|null} [options.index=null] - Element index
   * @param {string|null} [options.value=null] - Option value to select
   * @param {string|null} [options.text=null] - Option text to select
   * @param {string|null} [options.xpath=null] - XPath selector
   */
  constructor({ index = null, value = null, text = null, xpath = null }) {
    super();
    this.index = index;
    this.value = value;
    this.text = text;
    this.xpath = xpath;
  }

  validate() {
    // Need either index or xpath to locate the select element
    if (this.index === null && this.xpath === null) {
      return false;
    }

    // Need either value or text to identify which option to select
    if (this.value === null && this.text === null) {
      return false;
    }

    return true;
  }
} 