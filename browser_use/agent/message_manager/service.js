/**
 * Browser-Use Agent Message Manager Service
 * JavaScript ES6 version of service.py
 * 
 * Manages messages for the agent
 */

import { logger, truncateString } from '../../utils.js';
import { AgentMessagePrompt } from '../prompts.js';
import { MessageManagerState } from './views.js';

/**
 * Settings for the message manager
 */
export class MessageManagerSettings {
  /**
   * @param {Object} options - Message manager settings options
   * @param {number} [options.maxInputTokens=128000] - Maximum number of input tokens
   * @param {string[]} [options.includeAttributes=[]] - Attributes to include
   * @param {string|null} [options.messageContext=null] - Additional context for messages
   * @param {Object|null} [options.sensitiveData=null] - Sensitive data to redact
   * @param {string[]|null} [options.availableFilePaths=null] - Available file paths
   */
  constructor({
    maxInputTokens = 128000,
    includeAttributes = [],
    messageContext = null,
    sensitiveData = null,
    availableFilePaths = null,
  } = {}) {
    this.maxInputTokens = maxInputTokens;
    this.includeAttributes = includeAttributes;
    this.messageContext = messageContext;
    this.sensitiveData = sensitiveData;
    this.availableFilePaths = availableFilePaths;
  }
}

/**
 * Message manager for the agent
 */
export class MessageManager {
  /**
   * @param {Object} options - Message manager options
   * @param {string} options.task - Task description
   * @param {Object} options.systemMessage - System message
   * @param {MessageManagerSettings} [options.settings=new MessageManagerSettings()] - Settings
   * @param {MessageManagerState} [options.state=new MessageManagerState()] - State
   */
  constructor({
    task,
    systemMessage,
    settings = new MessageManagerSettings(),
    state = new MessageManagerState(),
  }) {
    this.task = task;
    this.systemMessage = systemMessage;
    this.settings = settings;
    this.state = state;

    // Initialize history if empty
    if (this.state.history.length === 0) {
      this._initializeHistory();
    }

    // Set max tokens
    this.state.maxTokens = this.settings.maxInputTokens;
  }

  /**
   * Initialize history
   * @private
   */
  _initializeHistory() {
    // Add system message
    this._addMessageWithTokens(this.systemMessage);

    // Add task message
    let taskContent = `Task: ${this.task}`;

    // Add message context if available
    if (this.settings.messageContext) {
      taskContent += `\n\n${this.settings.messageContext}`;
    }

    // Add available files if available
    if (this.settings.availableFilePaths && this.settings.availableFilePaths.length > 0) {
      taskContent += '\n\nAvailable files:';
      for (const filePath of this.settings.availableFilePaths) {
        taskContent += `\n- ${filePath}`;
      }
    }

    this._addMessageWithTokens({
      role: 'user',
      content: taskContent,
    });
  }

  /**
   * Add message with tokens
   * @param {Object} message - Message to add
   * @private
   */
  _addMessageWithTokens(message) {
    // Estimate token count (very rough approximation)
    let tokens = 0;

    if (typeof message.content === 'string') {
      // Roughly 4 characters per token
      tokens = Math.ceil(message.content.length / 4);
    } else if (Array.isArray(message.content)) {
      // Text parts
      const textTokens = message.content
        .filter(part => part.type === 'text')
        .reduce((sum, part) => sum + Math.ceil((part.text || '').length / 4), 0);

      // Image parts (rough estimate)
      const imageTokens = message.content
        .filter(part => part.type === 'image_url')
        .length * 1000; // Assume 1000 tokens per image

      tokens = textTokens + imageTokens;
    }

    // Add message to history
    this.state.history.push(message);
    this.state.currentTokens += tokens;

    logger.debug(`Added message with ~${tokens} tokens. Current total: ~${this.state.currentTokens}`);
  }

  /**
   * Add state message
   * @param {Object} state - Browser state
   * @param {Object[]|null} result - Action results
   * @param {Object|null} stepInfo - Step information
   * @param {boolean} useVision - Whether to use vision
   */
  addStateMessage(state, result, stepInfo, useVision) {
    const prompt = new AgentMessagePrompt(
      state,
      result,
      this.settings.includeAttributes,
      stepInfo,
    );
    const message = prompt.getUserMessage(useVision);

    // Redact sensitive data if available
    if (this.settings.sensitiveData) {
      message.content = this._redactSensitiveData(message.content);
    }

    this._addMessageWithTokens(message);

  }

  /**
   * Add model output
   * @param {Object} modelOutput - Model output
   */
  addModelOutput(modelOutput) {
    const message = {
      role: 'assistant',
      content: JSON.stringify(modelOutput),
    };

    this._addMessageWithTokens(message);
  }

  /**
   * Add new task
   * @param {string} newTask - New task
   */
  addNewTask(newTask) {
    const message = {
      role: 'user',
      content: `New task: ${newTask}`,
    };

    this._addMessageWithTokens(message);
  }

  /**
   * Add plan
   * @param {string|null} plan - Plan
   * @param {number} [position=-1] - Position to insert the plan
   */
  addPlan(plan, position = -1) {
    if (!plan) {
      return;
    }

    const message = {
      role: 'user',
      content: `Plan: ${plan}`,
    };

    if (position === -1) {
      this._addMessageWithTokens(message);
    } else {
      // Insert at position
      const tokens = Math.ceil(message.content.length / 4);
      this.state.history.splice(position, 0, message);
      this.state.currentTokens += tokens;
    }
  }

  /**
   * Remove last state message
   * @private
   */
  _removeLastStateMessage() {
    if (this.state.history.length > 0) {
      const lastMessage = this.state.history[this.state.history.length - 1];

      // Only remove if it's a user message (state message)
      if (lastMessage.role === 'user') {
        let tokens = 0;

        if (typeof lastMessage.content === 'string') {
          tokens = Math.ceil(lastMessage.content.length / 4);
        } else if (Array.isArray(lastMessage.content)) {
          // Text parts
          const textTokens = lastMessage.content
            .filter(part => part.type === 'text')
            .reduce((sum, part) => sum + Math.ceil((part.text || '').length / 4), 0);

          // Image parts
          const imageTokens = lastMessage.content
            .filter(part => part.type === 'image_url')
            .length * 1000;

          tokens = textTokens + imageTokens;
        }

        this.state.history.pop();
        this.state.currentTokens -= tokens;

        logger.debug(`Removed last state message with ~${tokens} tokens. Current total: ~${this.state.currentTokens}`);
      }
    }
  }

  /**
   * Cut messages to fit within token limit
   */
  cutMessages() {
    // If we're under the limit, no need to cut
    if (this.state.currentTokens <= this.state.maxTokens) {
      return;
    }

    logger.info(`Cutting messages to fit within token limit (${this.state.currentTokens} > ${this.state.maxTokens})`);

    // Keep system message and task message
    const systemMessage = this.state.history[0];
    const taskMessage = this.state.history[1];

    // Start with these two messages
    const newHistory = [systemMessage, taskMessage];
    let newTokens = Math.ceil(systemMessage.content.length / 4) + Math.ceil(taskMessage.content.length / 4);

    // Add messages from the end until we reach the limit
    for (let i = this.state.history.length - 1; i >= 2; i--) {
      const message = this.state.history[i];
      let messageTokens = 0;

      if (typeof message.content === 'string') {
        messageTokens = Math.ceil(message.content.length / 4);
      } else if (Array.isArray(message.content)) {
        // Text parts
        const textTokens = message.content
          .filter(part => part.type === 'text')
          .reduce((sum, part) => sum + Math.ceil((part.text || '').length / 4), 0);

        // Image parts
        const imageTokens = message.content
          .filter(part => part.type === 'image_url')
          .length * 1000;

        messageTokens = textTokens + imageTokens;
      }

      // If adding this message would exceed the limit, skip it
      if (newTokens + messageTokens > this.state.maxTokens) {
        continue;
      }

      // Add message to the beginning of the new history (after system and task)
      newHistory.splice(2, 0, message);
      newTokens += messageTokens;
    }

    // Update history and token count
    this.state.history = newHistory;
    this.state.currentTokens = newTokens;

    logger.info(`Cut messages to ${newHistory.length} messages with ~${newTokens} tokens`);
  }

  /**
   * Get messages
   * @returns {Object[]} Messages
   */
  getMessages() {
    // Ensure history is an array
    if (!Array.isArray(this.state.history)) {
      logger.error(`History is not an array: ${typeof this.state.history}`);
      return [];
    }
    
    // Filter out any invalid messages
    return this.state.history.filter(message => message && typeof message === 'object');
  }

  /**
   * Redact sensitive data
   * @param {string|Object[]} content - Content to redact
   * @returns {string|Object[]} Redacted content
   * @private
   */
  _redactSensitiveData(content) {
    if (!this.settings.sensitiveData) {
      return content;
    }

    if (typeof content === 'string') {
      let redactedContent = content;

      for (const [key, value] of Object.entries(this.settings.sensitiveData)) {
        if (value && value.length > 0) {
          const regex = new RegExp(value, 'g');
          redactedContent = redactedContent.replace(regex, `[REDACTED:${key}]`);
        }
      }

      return redactedContent;
    } else if (Array.isArray(content)) {
      return content.map(part => {
        if (part.type === 'text') {
          return {
            ...part,
            text: this._redactSensitiveData(part.text),
          };
        }
        return part;
      });
    }

    return content;
  }
} 