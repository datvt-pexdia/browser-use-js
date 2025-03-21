/**
 * Browser-Use Controller Registry Service
 * JavaScript ES6 version of service.py
 */

import { logger } from '../../utils.js';
import { RegisteredFunction } from './views.js';

/**
 * Registry for controller functions
 */
export class ControllerRegistry {
  /**
   * @param {Object} options - Options
   * @param {import('../service.js').Controller} options.controller - Controller
   * @param {import('../../telemetry/service.js').ProductTelemetry|null} [options.telemetry=null] - Telemetry
   */
  constructor({ controller, telemetry = null }) {
    this.controller = controller;
    this.telemetry = telemetry;
    this.registeredFunctions = [];
    this.registeredFunctionsByName = {};
    
    this._registerControllerFunctions();
  }

  /**
   * Register controller functions
   * @private
   */
  _registerControllerFunctions() {
    const registeredActions = this.controller.getRegisteredActions();
    
    for (const [actionName, actionModel] of Object.entries(registeredActions)) {
      this.registerFunction({
        name: actionName,
        description: this._getActionDescription(actionName),
        parameters: this._getActionParameters(actionModel),
        action: async (params) => {
          return await this.controller.executeAction(actionName, params);
        }
      });
    }
    
    // Send telemetry if available
    if (this.telemetry) {
      this.telemetry.sendControllerRegisteredFunctionsTelemetryEvent(this.registeredFunctions);
    }
  }

  /**
   * Create a dynamic action model class that can handle all registered actions
   * @param {string[]} [limitToActions=null] - Limit to specific actions
   * @returns {Function} Action model class
   */
  createActionModel(limitToActions = null) {
    const registry = this;
    const registeredActions = this.controller.getRegisteredActions();
    
    // Filter actions if limitToActions is provided
    const actionEntries = Object.entries(registeredActions);
    const filteredActions = limitToActions 
      ? actionEntries.filter(([name]) => limitToActions.includes(name))
      : actionEntries;
    
    // Create a dynamic class that can handle all registered actions
    return class DynamicActionModel {
      constructor(data) {
        // Initialize with empty object if no data provided
        if (!data) {
          data = {};
        }
        
        // Find the action type from the data
        let actionType = null;
        let actionParams = null;
        
        // Check if data is already in the format { action_type: { params } }
        for (const [name] of filteredActions) {
          if (data[name]) {
            actionType = name;
            actionParams = data[name];
            break;
          }
        }
        
        // If not found, assume data is the params for the first action type
        if (!actionType && filteredActions.length > 0) {
          actionType = filteredActions[0][0];
          actionParams = data;
        }
        
        // Store the action type and params
        this.actionType = actionType;
        this.actionParams = actionParams;
        
        // Add properties from action params to this instance
        if (actionParams) {
          Object.assign(this, actionParams);
        }
      }
      
      /**
       * Convert to JSON
       * @returns {Object} JSON representation
       */
      modelDump() {
        const result = {};
        result[this.actionType] = this.actionParams;
        return result;
      }
      
      /**
       * Validate model
       * @returns {boolean} Whether the model is valid
       */
      validate() {
        // Get the action model class
        const actionModel = registeredActions[this.actionType];
        if (!actionModel) {
          return false;
        }
        
        // Create an instance and validate
        const instance = new actionModel(this.actionParams);
        return instance.validate();
      }
    };
  }

  /**
   * Get action description
   * @param {string} actionName - Action name
   * @returns {string} Action description
   * @private
   */
  _getActionDescription(actionName) {
    const descriptions = {
      'search_google': 'Search Google for the given query',
      'go_to_url': 'Navigate to the specified URL',
      'click_element': 'Click on an element with the given index',
      'input_text': 'Input text into an element with the given index',
      'done': 'Complete the task with a result message',
      'switch_tab': 'Switch to a different browser tab',
      'open_tab': 'Open a new browser tab',
      'scroll': 'Scroll the page',
      'send_keys': 'Send keyboard keys to the page',
      'extract_page_content': 'Extract text content from the page',
      'go_back': 'Navigate back in browser history',
      'go_forward': 'Navigate forward in browser history',
      'refresh_page': 'Refresh the current page'
    };
    
    return descriptions[actionName] || `Execute ${actionName} action`;
  }

  /**
   * Get action parameters
   * @param {Function} actionModel - Action model class
   * @returns {Object} Action parameters
   * @private
   */
  _getActionParameters(actionModel) {
    // Create a temporary instance to inspect properties
    const instance = new actionModel({});
    const properties = Object.getOwnPropertyNames(instance);
    
    // Filter out methods and internal properties
    const parameters = properties.filter(prop => 
      typeof instance[prop] !== 'function' && 
      !prop.startsWith('_') &&
      prop !== 'constructor'
    );
    
    // Create parameter schema
    return parameters.reduce((schema, param) => {
      schema[param] = {
        type: typeof instance[param] === 'number' ? 'number' : 'string',
        required: param !== 'xpath' // xpath is optional in some models
      };
      return schema;
    }, {});
  }

  /**
   * Register function
   * @param {Object} options - Options
   * @param {string} options.name - Function name
   * @param {string} options.description - Function description
   * @param {Object} options.parameters - Function parameters
   * @param {Function} options.action - Function action
   * @returns {RegisteredFunction} Registered function
   */
  registerFunction({ name, description, parameters, action }) {
    if (this.registeredFunctionsByName[name]) {
      logger.warn(`Function ${name} already registered, overwriting`);
    }
    
    const registeredFunction = new RegisteredFunction(name, description, parameters);
    
    this.registeredFunctions.push(registeredFunction);
    this.registeredFunctionsByName[name] = {
      function: registeredFunction,
      action
    };
    
    return registeredFunction;
  }

  /**
   * Get registered functions
   * @returns {RegisteredFunction[]} Registered functions
   */
  getRegisteredFunctions() {
    return this.registeredFunctions;
  }

  /**
   * Execute function
   * @param {string} functionName - Function name
   * @param {Object} parameters - Function parameters
   * @returns {Promise<any>} Function result
   */
  async executeFunction(functionName, parameters) {
    const registeredFunction = this.registeredFunctionsByName[functionName];
    
    if (!registeredFunction) {
      throw new Error(`Function ${functionName} not registered`);
    }
    
    return await registeredFunction.action(parameters);
  }

  /**
   * Get function definitions for OpenAI function calling
   * @returns {Object[]} Function definitions
   */
  getFunctionDefinitions() {
    return this.registeredFunctions.map(func => {
      return {
        name: func.name,
        description: func.description,
        parameters: {
          type: 'object',
          properties: Object.entries(func.parameters || {}).reduce((props, [name, param]) => {
            props[name] = {
              type: param.type || 'string',
              description: param.description || `Parameter ${name} for ${func.name}`
            };
            return props;
          }, {}),
          required: Object.entries(func.parameters || {})
            .filter(([_, param]) => param.required)
            .map(([name]) => name)
        }
      };
    });
  }

  /**
   * Get a formatted description of all registered functions for use in prompts
   * @returns {string} Formatted description of all registered functions
   */
  getPromptDescription() {
    if (this.registeredFunctions.length === 0) {
      return "No actions available.";
    }

    let description = "Available actions:\n\n";
    
    for (const func of this.registeredFunctions) {
      description += `${func.name}: ${func.description}\n`;
      
      // Add parameter details if there are any
      const paramKeys = Object.keys(func.parameters || {});
      if (paramKeys.length > 0) {
        description += "Parameters:\n";
        for (const paramName of paramKeys) {
          const param = func.parameters[paramName];
          const requiredText = param.required ? " (required)" : " (optional)";
          description += `  - ${paramName}: ${param.type}${requiredText}\n`;
        }
      }
      
      description += "\n";
    }
    
    return description;
  }
} 