/**
 * Browser-Use Agent Message Manager Views
 * JavaScript ES6 version of views.py
 * 
 * Contains data models for the message manager
 */

/**
 * Message manager state
 */
export class MessageManagerState {
  /**
   * @param {Object} options - Message manager state options
   * @param {Object[]} [options.history=[]] - Message history
   * @param {number} [options.currentTokens=0] - Current token count
   * @param {number} [options.maxTokens=0] - Maximum token count
   */
  constructor({
    history = [],
    currentTokens = 0,
    maxTokens = 0,
  } = {}) {
    this.history = history;
    this.currentTokens = currentTokens;
    this.maxTokens = maxTokens;
  }
} 