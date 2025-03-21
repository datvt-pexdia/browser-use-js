/**
 * Browser-Use Agent Views
 * JavaScript ES6 version of views.py
 * 
 * Contains data models for the agent
 */

import { v4 as uuidv4 } from 'uuid';
import { BrowserStateHistory } from '../browser/views.js';
import { BaseModel } from '../controller/views.js';
import { HistoryTreeProcessor } from '../dom/history_tree_processor/service.js';
import { DOMHistoryElement } from '../dom/history_tree_processor/view.js';
import { MessageManagerState } from './message_manager/views.js';
import { logger } from '../utils.js';

/**
 * Tool calling method types
 * @typedef {'function_calling'|'json_mode'|'raw'|'auto'} ToolCallingMethod
 */

/**
 * Options for the agent
 */
export class AgentSettings {
  /**
   * @param {Object} options - Agent settings options
   * @param {boolean} [options.useVision=true] - Whether to use vision
   * @param {boolean} [options.useVisionForPlanner=false] - Whether to use vision for planner
   * @param {string|null} [options.saveConversationPath=null] - Path to save conversation
   * @param {string|null} [options.saveConversationPathEncoding='utf-8'] - Encoding for saved conversation
   * @param {number} [options.maxFailures=3] - Maximum number of failures before giving up
   * @param {number} [options.retryDelay=10] - Delay in seconds before retrying after failure
   * @param {number} [options.maxInputTokens=128000] - Maximum number of input tokens
   * @param {boolean} [options.validateOutput=false] - Whether to validate output
   * @param {string|null} [options.messageContext=null] - Additional context for messages
   * @param {boolean|string} [options.generateGif=false] - Whether to generate GIF and optional path
   * @param {string[]|null} [options.availableFilePaths=null] - Available file paths
   * @param {string|null} [options.overrideSystemMessage=null] - Override system message
   * @param {string|null} [options.extendSystemMessage=null] - Extend system message
   * @param {string[]} [options.includeAttributes=[]] - Attributes to include in element descriptions
   * @param {number} [options.maxActionsPerStep=10] - Maximum number of actions per step
   * @param {ToolCallingMethod|null} [options.toolCallingMethod='auto'] - Tool calling method
   * @param {Object|null} [options.pageExtractionLlm=null] - LLM for page extraction
   * @param {Object|null} [options.plannerLlm=null] - LLM for planner
   * @param {number} [options.plannerInterval=1] - Run planner every N steps
   */
  constructor({
    useVision = true,
    useVisionForPlanner = false,
    saveConversationPath = null,
    saveConversationPathEncoding = 'utf-8',
    maxFailures = 3,
    retryDelay = 10,
    maxInputTokens = 128000,
    validateOutput = false,
    messageContext = null,
    generateGif = false,
    availableFilePaths = null,
    overrideSystemMessage = null,
    extendSystemMessage = null,
    includeAttributes = [
      'title',
      'type',
      'name',
      'role',
      'tabindex',
      'aria-label',
      'placeholder',
      'value',
      'alt',
      'aria-expanded',
    ],
    maxActionsPerStep = 1,
    toolCallingMethod = 'auto',
    pageExtractionLlm = null,
    plannerLlm = null,
    plannerInterval = 1,
  } = {}) {
    this.useVision = useVision;
    this.useVisionForPlanner = useVisionForPlanner;
    this.saveConversationPath = saveConversationPath;
    this.saveConversationPathEncoding = saveConversationPathEncoding;
    this.maxFailures = maxFailures;
    this.retryDelay = retryDelay;
    this.maxInputTokens = maxInputTokens;
    this.validateOutput = validateOutput;
    this.messageContext = messageContext;
    this.generateGif = generateGif;
    this.availableFilePaths = availableFilePaths;
    this.overrideSystemMessage = overrideSystemMessage;
    this.extendSystemMessage = extendSystemMessage;
    this.includeAttributes = includeAttributes;
    this.maxActionsPerStep = maxActionsPerStep;
    this.toolCallingMethod = toolCallingMethod;
    this.pageExtractionLlm = pageExtractionLlm;
    this.plannerLlm = plannerLlm;
    this.plannerInterval = plannerInterval;
  }
}

/**
 * Holds all state information for an Agent
 */
export class AgentState {
  /**
   * @param {Object} options - Agent state options
   * @param {string} [options.agentId] - Agent ID
   * @param {number} [options.nSteps=1] - Number of steps taken
   * @param {number} [options.consecutiveFailures=0] - Number of consecutive failures
   * @param {ActionResult[]|null} [options.lastResult=null] - Last action result
   * @param {AgentHistoryList} [options.history] - History of agent actions
   * @param {string|null} [options.lastPlan=null] - Last plan
   * @param {boolean} [options.paused=false] - Whether agent is paused
   * @param {boolean} [options.stopped=false] - Whether agent is stopped
   * @param {MessageManagerState} [options.messageManagerState] - Message manager state
   */
  constructor({
    agentId = uuidv4(),
    nSteps = 1,
    consecutiveFailures = 0,
    lastResult = null,
    history = new AgentHistoryList({ history: [] }),
    lastPlan = null,
    paused = false,
    stopped = false,
    messageManagerState = new MessageManagerState(),
  } = {}) {
    this.agentId = agentId;
    this.nSteps = nSteps;
    this.consecutiveFailures = consecutiveFailures;
    this.lastResult = lastResult;
    this.history = history;
    this.lastPlan = lastPlan;
    this.paused = paused;
    this.stopped = stopped;
    this.messageManagerState = messageManagerState;
  }
}

/**
 * Step information for agent
 */
export class AgentStepInfo {
  /**
   * @param {number} stepNumber - Current step number
   * @param {number} maxSteps - Maximum number of steps
   */
  constructor({stepNumber, maxSteps}) {
    this.stepNumber = stepNumber;
    this.maxSteps = maxSteps;
  }

  /**
   * Check if this is the last step
   * @returns {boolean} Whether this is the last step
   */
  isLastStep() {
    return this.stepNumber >= this.maxSteps - 1;
  }
}

/**
 * Result of executing an action
 */
export class ActionResult {
  /**
   * @param {Object} options - Action result options
   * @param {boolean} [options.isDone=false] - Whether the action is done
   * @param {boolean|null} [options.success=null] - Whether the action was successful
   * @param {string|null} [options.extractedContent=null] - Extracted content
   * @param {string|null} [options.error=null] - Error message
   * @param {boolean} [options.includeInMemory=false] - Whether to include in memory
   */
  constructor({
    isDone = false,
    success = null,
    extractedContent = null,
    error = null,
    includeInMemory = false,
  } = {}) {
    this.isDone = isDone;
    this.success = success;
    this.extractedContent = extractedContent;
    this.error = error;
    this.includeInMemory = includeInMemory;
  }
}

/**
 * Metadata for a single step including timing and token information
 */
export class StepMetadata {
  /**
   * @param {Object} options - Step metadata options
   * @param {number} options.stepStartTime - Step start time
   * @param {number} options.stepEndTime - Step end time
   * @param {number} options.inputTokens - Input tokens
   * @param {number} options.stepNumber - Step number
   */
  constructor({
    stepStartTime,
    stepEndTime,
    inputTokens,
    stepNumber,
  }) {
    this.stepStartTime = stepStartTime;
    this.stepEndTime = stepEndTime;
    this.inputTokens = inputTokens;
    this.stepNumber = stepNumber;
  }

  /**
   * Get duration in seconds
   * @returns {number} Duration in seconds
   */
  get durationSeconds() {
    return this.stepEndTime - this.stepStartTime;
  }
}

/**
 * Current state of the agent
 */
export class AgentBrain {
  /**
   * @param {Object} options - Agent brain options
   * @param {string} options.evaluationPreviousGoal - Evaluation of previous goal
   * @param {string} options.memory - Memory
   * @param {string} options.nextGoal - Next goal
   */
  constructor({
    evaluationPreviousGoal,
    memory,
    nextGoal,
  }) {
    this.evaluationPreviousGoal = evaluationPreviousGoal;
    this.memory = memory;
    this.nextGoal = nextGoal;
  }
}

/**
 * Output model for agent
 */
export class AgentOutput {
  /**
   * @param {Object} options - Agent output options
   * @param {AgentBrain} options.currentState - Current state
   * @param {ActionModel[]} options.action - Actions to take
   */
  constructor({
    currentState,
    action = [],
  }) {
    this.currentState = currentState;
    this.action = action;
  }

  /**
   * Create a type with custom actions
   * @param {typeof ActionModel} customActions - Custom actions
   * @returns {typeof AgentOutput} Agent output with custom actions
   */
  static typeWithCustomActions(customActions) {
    return class CustomAgentOutput extends AgentOutput {
      constructor(data) {
        super(data);
        
        // Convert action objects to instances of the custom action model
        if (Array.isArray(data.action)) {
          this.action = data.action.map(actionData => {
            if (actionData instanceof customActions) {
              return actionData;
            }
            return new customActions(actionData);
          });
        }
      }
    };
  }
}

/**
 * History item for agent actions
 */
export class AgentHistory {
  /**
   * @param {Object} options - Agent history options
   * @param {AgentOutput|null} options.modelOutput - Model output
   * @param {ActionResult[]} options.result - Action results
   * @param {BrowserStateHistory} options.state - Browser state history
   * @param {StepMetadata|null} [options.metadata=null] - Step metadata
   */
  constructor({
    modelOutput,
    result,
    state,
    metadata = null,
  }) {
    this.modelOutput = modelOutput;
    this.result = result;
    this.state = state;
    this.metadata = metadata;
  }

  /**
   * Get interacted element
   * @param {AgentOutput} modelOutput - Model output
   * @param {Object} selectorMap - Selector map
   * @returns {Array<DOMHistoryElement|null>} Interacted elements
   */
  static getInteractedElement(modelOutput, selectorMap) {
    if (!modelOutput || !modelOutput.action || modelOutput.action.length === 0) {
      return [null];
    }

    const elements = [];
    for (const action of modelOutput.action) {
      // Check if action has index property and it's a click or input action
      const actionData = action.modelDump ? action.modelDump() : action;
      const actionType = Object.keys(actionData)[0];
      const actionParams = actionData[actionType];

      if (
        (actionType === 'click_element' || actionType === 'input_text') &&
        actionParams && 
        typeof actionParams.index === 'number' &&
        selectorMap && 
        selectorMap[actionParams.index]
      ) {
        const domElement = selectorMap[actionParams.index];
        const historyElement = HistoryTreeProcessor.convertDomElementToHistoryElement(domElement);
        elements.push(historyElement);
      } else {
        elements.push(null);
      }
    }

    return elements;
  }

  /**
   * Convert to JSON
   * @param {Object} options - Options
   * @returns {Object} JSON representation
   */
  modelDump(options = {}) {
    const result = {
      model_output: this.modelOutput ? JSON.parse(JSON.stringify(this.modelOutput)) : null,
      result: this.result.map(r => JSON.parse(JSON.stringify(r))),
      state: JSON.parse(JSON.stringify(this.state)),
      metadata: this.metadata ? JSON.parse(JSON.stringify(this.metadata)) : null,
    };

    return result;
  }
}

/**
 * List of agent history items
 */
export class AgentHistoryList {
  /**
   * @param {Object} options - Agent history list options
   * @param {AgentHistory[]} options.history - History items
   */
  constructor({
    history = [],
  }) {
    this.history = history;
  }

  /**
   * Get total duration in seconds
   * @returns {number} Total duration in seconds
   */
  get totalDurationSeconds() {
    return this.history
      .filter(item => item.metadata)
      .reduce((total, item) => total + item.metadata.durationSeconds, 0);
  }

  /**
   * Get total input tokens
   * @returns {number} Total input tokens
   */
  get totalInputTokens() {
    return this.history
      .filter(item => item.metadata)
      .reduce((total, item) => total + item.metadata.inputTokens, 0);
  }

  /**
   * Get input token usage
   * @returns {number[]} Input token usage
   */
  get inputTokenUsage() {
    return this.history
      .filter(item => item.metadata)
      .map(item => item.metadata.inputTokens);
  }

  /**
   * Convert to string
   * @returns {string} String representation
   */
  toString() {
    return `AgentHistoryList(${this.history.length} items)`;
  }

  /**
   * Convert to string
   * @returns {string} String representation
   */
  toRepr() {
    return this.toString();
  }

  /**
   * Save to file
   * @param {string} filepath - File path
   */
  saveToFile(filepath) {
    const fs = require('fs');
    const path = require('path');
    
    // Create directory if it doesn't exist
    const dirname = path.dirname(filepath);
    if (dirname) {
      fs.mkdirSync(dirname, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(this.modelDump(), null, 2));
  }

  /**
   * Convert to JSON
   * @param {Object} options - Options
   * @returns {Object} JSON representation
   */
  modelDump(options = {}) {
    return {
      history: this.history.map(item => item.modelDump()),
    };
  }

  /**
   * Load from file
   * @param {string} filepath - File path
   * @param {typeof AgentOutput} outputModel - Output model
   * @returns {AgentHistoryList} Agent history list
   */
  static loadFromFile(filepath, outputModel) {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    
    const history = data.history.map(item => {
      return new AgentHistory({
        modelOutput: item.model_output ? new outputModel(item.model_output) : null,
        result: item.result.map(r => new ActionResult(r)),
        state: new BrowserStateHistory(item.state),
        metadata: item.metadata ? new StepMetadata(item.metadata) : null,
      });
    });
    
    return new AgentHistoryList({ history });
  }

  /**
   * Get last action
   * @returns {Object|null} Last action
   */
  get lastAction() {
    if (this.history.length === 0 || !this.history[this.history.length - 1].modelOutput) {
      return null;
    }
    
    const lastOutput = this.history[this.history.length - 1].modelOutput;
    if (!lastOutput.action || lastOutput.action.length === 0) {
      return null;
    }
    
    return lastOutput.action[lastOutput.action.length - 1];
  }

  /**
   * Get errors
   * @returns {Array<string|null>} Errors
   */
  get errors() {
    return this.history
      .flatMap(item => item.result)
      .filter(result => result.error)
      .map(result => result.error);
  }

  /**
   * Get final result
   * @returns {string|null} Final result
   */
  get finalResult() {
    for (let i = this.history.length - 1; i >= 0; i--) {
      for (const result of this.history[i].result) {
        if (result.isDone && result.extractedContent) {
          return result.extractedContent;
        }
      }
    }
    return null;
  }

  /**
   * Check if done
   * @returns {boolean} Whether done
   */
  get isDone() {
    return this.history
      .flatMap(item => item.result)
      .some(result => result.isDone);
  }

  /**
   * Check if successful
   * @returns {boolean|null} Whether successful
   */
  get isSuccessful() {
    for (let i = this.history.length - 1; i >= 0; i--) {
      for (const result of this.history[i].result) {
        if (result.isDone) {
          return result.success;
        }
      }
    }
    return null;
  }

  /**
   * Check if has errors
   * @returns {boolean} Whether has errors
   */
  get hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * Get URLs
   * @returns {Array<string|null>} URLs
   */
  get urls() {
    return this.history.map(item => item.state.url);
  }

  /**
   * Get screenshots
   * @returns {Array<string|null>} Screenshots
   */
  get screenshots() {
    return this.history.map(item => item.state.screenshot);
  }

  /**
   * Get action names
   * @returns {string[]} Action names
   */
  get actionNames() {
    return this.history
      .filter(item => item.modelOutput && item.modelOutput.action)
      .flatMap(item => item.modelOutput.action.map(action => {
        const actionData = action.modelDump ? action.modelDump() : action;
        return Object.keys(actionData)[0];
      }));
  }

  /**
   * Get model thoughts
   * @returns {AgentBrain[]} Model thoughts
   */
  get modelThoughts() {
    return this.history
      .filter(item => item.modelOutput && item.modelOutput.currentState)
      .map(item => item.modelOutput.currentState);
  }

  /**
   * Get model outputs
   * @returns {AgentOutput[]} Model outputs
   */
  get modelOutputs() {
    return this.history
      .filter(item => item.modelOutput)
      .map(item => item.modelOutput);
  }

  /**
   * Get model actions
   * @returns {Object[]} Model actions
   */
  get modelActions() {
    return this.history
      .filter(item => item.modelOutput && item.modelOutput.action)
      .flatMap(item => item.modelOutput.action.map(action => {
        const actionData = action.modelDump ? action.modelDump() : action;
        return actionData;
      }));
  }

  /**
   * Get action results
   * @returns {ActionResult[]} Action results
   */
  get actionResults() {
    return this.history.flatMap(item => item.result);
  }

  /**
   * Get extracted content
   * @returns {string[]} Extracted content
   */
  get extractedContent() {
    return this.history
      .flatMap(item => item.result)
      .filter(result => result.extractedContent)
      .map(result => result.extractedContent);
  }

  /**
   * Get filtered model actions
   * @param {string[]|null} include - Actions to include
   * @returns {Object[]} Filtered model actions
   */
  modelActionsFiltered(include = null) {
    let actions = this.modelActions;
    
    if (include) {
      actions = actions.filter(action => {
        const actionType = Object.keys(action)[0];
        return include.includes(actionType);
      });
    }
    
    return actions;
  }

  /**
   * Get number of steps
   * @returns {number} Number of steps
   */
  get numberOfSteps() {
    return this.history.length;
  }
}

/**
 * Container for agent error handling
 */
export class AgentError {
  static VALIDATION_ERROR = 'Invalid model output format. Please follow the correct schema.';
  static RATE_LIMIT_ERROR = 'Rate limit reached. Waiting before retry.';
  static NO_VALID_ACTION = 'No valid action found';

  /**
   * Format error
   * @param {Error} error - Error
   * @param {boolean} includeTrace - Whether to include stack trace
   * @returns {string} Formatted error
   */
  static formatError(error, includeTrace = false) {
    console.log(error)
    let errorMessage = error.message || String(error);
    
    if (includeTrace && error.stack) {
      errorMessage += `\n${error.stack}`;
    }
    
    return errorMessage;
  }
} 