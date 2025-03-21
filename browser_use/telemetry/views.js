/**
 * Browser-Use Telemetry Views
 * JavaScript ES6 version of views.py
 */

/**
 * Base class for all telemetry events
 */
export class BaseTelemetryEvent {
  /**
   * Get the name of the event
   * @returns {string} The event name
   */
  get name() {
    throw new Error('Method not implemented');
  }

  /**
   * Get the properties of the event
   * @returns {Object} The event properties
   */
  get properties() {
    const props = { ...this };
    delete props.name;
    return props;
  }
}

/**
 * Represents a registered function
 */
export class RegisteredFunction {
  /**
   * @param {string} name - The function name
   * @param {Object} params - The function parameters
   */
  constructor(name, params = {}) {
    this.name = name;
    this.params = params;
  }
}

/**
 * Event for controller registered functions
 */
export class ControllerRegisteredFunctionsTelemetryEvent extends BaseTelemetryEvent {
  /**
   * @param {RegisteredFunction[]} registeredFunctions - The registered functions
   */
  constructor(registeredFunctions = []) {
    super();
    this.registeredFunctions = registeredFunctions;
    this._name = 'controller_registered_functions';
  }

  get name() {
    return this._name;
  }
}

/**
 * Event for agent steps
 */
export class AgentStepTelemetryEvent extends BaseTelemetryEvent {
  /**
   * @param {string} agentId - The agent ID
   * @param {number} step - The step number
   * @param {string[]} stepError - The step errors
   * @param {number} consecutiveFailures - The number of consecutive failures
   * @param {Object[]} actions - The actions
   */
  constructor(agentId, step, stepError = [], consecutiveFailures = 0, actions = []) {
    super();
    this.agentId = agentId;
    this.step = step;
    this.stepError = stepError;
    this.consecutiveFailures = consecutiveFailures;
    this.actions = actions;
    this._name = 'agent_step';
  }

  get name() {
    return this._name;
  }
}

/**
 * Event for agent run
 */
export class AgentRunTelemetryEvent extends BaseTelemetryEvent {
  /**
   * @param {string} agentId - The agent ID
   * @param {boolean} useVision - Whether to use vision
   * @param {string} task - The task
   * @param {string} modelName - The model name
   * @param {string} chatModelLibrary - The chat model library
   * @param {string} version - The version
   * @param {string} source - The source
   */
  constructor(agentId, useVision, task, modelName, chatModelLibrary, version, source) {
    super();
    this.agentId = agentId;
    this.useVision = useVision;
    this.task = task;
    this.modelName = modelName;
    this.chatModelLibrary = chatModelLibrary;
    this.version = version;
    this.source = source;
    this._name = 'agent_run';
  }

  get name() {
    return this._name;
  }
}

/**
 * Event for agent end
 */
export class AgentEndTelemetryEvent extends BaseTelemetryEvent {
  /**
   * @param {string} agentId - The agent ID
   * @param {number} steps - The number of steps
   * @param {boolean} maxStepsReached - Whether the maximum steps were reached
   * @param {boolean} isDone - Whether the agent is done
   * @param {boolean|null} success - Whether the agent was successful
   * @param {number} totalInputTokens - The total input tokens
   * @param {number} totalDurationSeconds - The total duration in seconds
   * @param {(string|null)[]} errors - The errors
   */
  constructor(agentId, steps, maxStepsReached, isDone, success, totalInputTokens, totalDurationSeconds, errors = []) {
    super();
    this.agentId = agentId;
    this.steps = steps;
    this.maxStepsReached = maxStepsReached;
    this.isDone = isDone;
    this.success = success;
    this.totalInputTokens = totalInputTokens;
    this.totalDurationSeconds = totalDurationSeconds;
    this.errors = errors;
    this._name = 'agent_end';
  }

  get name() {
    return this._name;
  }
} 