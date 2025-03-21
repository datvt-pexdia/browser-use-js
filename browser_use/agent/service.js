/**
 * Browser-Use Agent Service
 * JavaScript ES6 version of service.py
 * 
 * Agent for browser automation
 */

import { timeExecutionAsync, timeExecutionSync, logger, sleep } from '../utils.js';
import { MessageManager, MessageManagerSettings } from './message_manager/service.js';
import { convertInputMessages, extractJsonFromModelOutput, saveConversation } from './message_manager/utils.js';
import { AgentMessagePrompt, PlannerPrompt, SystemPrompt } from './prompts.js';
import {
  ActionResult,
  AgentError,
  AgentHistory,
  AgentHistoryList,
  AgentOutput,
  AgentSettings,
  AgentState,
  AgentStepInfo,
  StepMetadata,
} from './views.js';
import { Browser } from '../browser/browser.js';
import { BrowserContext } from '../browser/context.js';
import { BrowserState, BrowserStateHistory } from '../browser/views.js';
import { Controller } from '../controller/service.js';
import { HistoryTreeProcessor } from '../dom/history_tree_processor/service.js';
import { ProductTelemetry } from '../telemetry/service.js';
import { AgentEndTelemetryEvent, AgentRunTelemetryEvent, AgentStepTelemetryEvent } from '../telemetry/views.js';
import fs from 'fs';
import path from 'path';

/**
 * Log response
 * @param {AgentOutput} response - Response to log
 */
function logResponse(response) {
  logger.info('Agent response:');

  // Check if currentState exists before accessing its properties
  if (response.currentState) {
    // Use optional chaining to safely access properties
    logger.info(`Evaluation: ${response.currentState.evaluationPreviousGoal || 'N/A'}`);
    logger.info(`Memory: ${response.currentState.memory || 'N/A'}`);
    logger.info(`Next goal: ${response.currentState.nextGoal || 'N/A'}`);
  } else {
    logger.info('No current state information available');
  }
  
  logger.info('Actions:');
  if (response.action && Array.isArray(response.action)) {
  for (const action of response.action) {
    logger.info(JSON.stringify(action));
    }
  } else {
    logger.info('No actions available');
  }
}

/**
 * Agent for browser automation
 */
export class Agent {
  /**
   * @param {Object} options - Agent options
   * @param {string} options.task - Task description
   * @param {Object} options.llm - Language model
   * @param {Browser|null} [options.browser=null] - Browser
   * @param {BrowserContext|null} [options.browserContext=null] - Browser context
   * @param {Controller} [options.controller=new Controller()] - Controller
   * @param {Object|null} [options.sensitiveData=null] - Sensitive data to redact
   * @param {Object[]|null} [options.initialActions=null] - Initial actions
   * @param {Function|null} [options.registerNewStepCallback=null] - Callback for new steps
   * @param {Function|null} [options.registerDoneCallback=null] - Callback for done
   * @param {Function|null} [options.registerExternalAgentStatusRaiseErrorCallback=null] - Callback for external agent status
   * @param {boolean} [options.useVision=true] - Whether to use vision
   * @param {boolean} [options.useVisionForPlanner=false] - Whether to use vision for planner
   * @param {string|null} [options.saveConversationPath=null] - Path to save conversation
   * @param {string} [options.saveConversationPathEncoding='utf-8'] - Encoding for saved conversation
   * @param {number} [options.maxFailures=3] - Maximum number of failures before giving up
   * @param {number} [options.retryDelay=10] - Delay in seconds before retrying after a failure
   * @param {string|null} [options.overrideSystemMessage=null] - Override system message
   * @param {string|null} [options.extendSystemMessage=null] - Extend system message
   * @param {number} [options.maxInputTokens=128000] - Maximum number of input tokens
   * @param {boolean} [options.validateOutput=false] - Whether to validate output
   * @param {string|null} [options.messageContext=null] - Additional context for messages
   * @param {boolean|string} [options.generateGif=false] - Whether to generate a GIF of the session
   * @param {string[]|null} [options.availableFilePaths=null] - Available file paths
   * @param {string[]} [options.includeAttributes=['title','type','name','role','aria-label','placeholder','value','alt','aria-expanded','data-date-format']] - Attributes to include
   * @param {number} [options.maxActionsPerStep=10] - Maximum number of actions per step
   * @param {string|null} [options.toolCallingMethod='auto'] - Tool calling method
   * @param {Object|null} [options.pageExtractionLlm=null] - LLM for page extraction
   * @param {Object|null} [options.plannerLlm=null] - LLM for planner
   * @param {number} [options.plannerInterval=1] - Run planner every N steps
   * @param {AgentState|null} [options.injectedAgentState=null] - Injected agent state
   * @param {Object|null} [options.context=null] - Context
   */
  constructor({
    task,
    llm,
    browser = null,
    browserContext = null,
    controller = new Controller({}),
    sensitiveData = null,
    initialActions = null,
    registerNewStepCallback = null,
    registerDoneCallback = null,
    registerExternalAgentStatusRaiseErrorCallback = null,
    useVision = true,
    useVisionForPlanner = false,
    saveConversationPath = null,
    saveConversationPathEncoding = 'utf-8',
    maxFailures = 3,
    retryDelay = 10,
    overrideSystemMessage = null,
    extendSystemMessage = null,
    maxInputTokens = 128000,
    validateOutput = false,
    messageContext = null,
    generateGif = false,
    availableFilePaths = null,
    includeAttributes = [
      'title',
      'type',
      'name',
      'role',
      'aria-label',
      'placeholder',
      'value',
      'alt',
      'aria-expanded',
      'data-date-format',
    ],
    maxActionsPerStep = 1,
    toolCallingMethod = 'auto',
    pageExtractionLlm = null,
    plannerLlm = null,
    plannerInterval = 1,
    injectedAgentState = null,
    context = null,
  }) {
    if (!pageExtractionLlm) {
      pageExtractionLlm = llm;
    }
    
    // Core components
    this.task = task;
    this.llm = llm;

    this.sensitiveData = sensitiveData;
    
    this.settings = new AgentSettings({
      useVision: useVision,
      useVisionForPlanner: useVisionForPlanner,
      saveConversationPath: saveConversationPath,
      saveConversationPathEncoding: saveConversationPathEncoding,
      maxFailures: maxFailures,
      retryDelay: retryDelay,
      overrideSystemMessage: overrideSystemMessage,
      extendSystemMessage: extendSystemMessage,
      maxInputTokens: maxInputTokens,
      validateOutput: validateOutput,
      messageContext: messageContext,
      generateGif: generateGif,
      availableFilePaths: availableFilePaths,
      includeAttributes: includeAttributes,
      maxActionsPerStep: maxActionsPerStep,
      toolCallingMethod: toolCallingMethod,
      pageExtractionLlm: pageExtractionLlm,
      plannerLlm: plannerLlm,
      plannerInterval: plannerInterval,
    });
    
    // Initialize state
    this.state = injectedAgentState || new AgentState();
    // Browser setup
    this.injectedBrowser = browser !== null;
    this.injectedBrowserContext = browserContext !== null;
    this.browser = browser || (browserContext ? null : new Browser());

    if (browserContext) {
      this.browserContext = browserContext;
    } else if (this.browser) {
      this.browserContext = new BrowserContext({
        browser: this.browser,
        config: this.browser.config.newContextConfig
      });
    } else {
      this.browser = new Browser();
      this.browserContext = new BrowserContext({ browser: this.browser });
    }
    this.controller = new Controller({ context: this.browserContext })
    // Action setup
    this._setupActionModels();
    this._setBrowserUseVersionAndSource();
    this.initialActions = initialActions ? this._convertInitialActions(initialActions) : null;
    
    // Model setup
    this._setModelNames();
    
    // For models without tool calling, add available actions to context
    this.availableActions = this.controller.registry.getPromptDescription();
    
    this.toolCallingMethod = this._setToolCallingMethod();
    this.settings.messageContext = this._setMessageContext();
    
    // Initialize message manager with state
    this._messageManager = new MessageManager({
      task: task,
      systemMessage: new SystemPrompt({
        actionDescription: this.availableActions,
        maxActionsPerStep: this.settings.maxActionsPerStep,
        overrideSystemMessage: overrideSystemMessage,
        extendSystemMessage: extendSystemMessage,
      }).getSystemMessage(),
      settings: new MessageManagerSettings({
        maxInputTokens: this.settings.maxInputTokens,
        includeAttributes: this.settings.includeAttributes,
        messageContext: this.settings.messageContext,
        sensitiveData: sensitiveData,
        availableFilePaths: this.settings.availableFilePaths,
      }),
      state: this.state.messageManagerState,
    });
    
    
    // Callbacks
    this.registerNewStepCallback = registerNewStepCallback;
    this.registerDoneCallback = registerDoneCallback;
    this.registerExternalAgentStatusRaiseErrorCallback = registerExternalAgentStatusRaiseErrorCallback;
    
    // Context
    this.context = context;
    
    // Telemetry
    this.telemetry = new ProductTelemetry();
    
    if (this.settings.saveConversationPath) {
      logger.info(`Saving conversation to ${this.settings.saveConversationPath}`);
    }
  }
  
  /**
   * Set message context
   * @returns {string|null} Message context
   * @private
   */
  _setMessageContext() {
    if (this.toolCallingMethod === 'raw') {
      if (this.settings.messageContext) {
        this.settings.messageContext += `\n\nAvailable actions: ${this.availableActions}`;
      } else {
        this.settings.messageContext = `Available actions: ${this.availableActions}`;
      }
    }
    return this.settings.messageContext;
  }
  
  /**
   * Set browser-use version and source
   * @private
   */
  _setBrowserUseVersionAndSource() {
    try {
      // First check for repository-specific files
      const repoFiles = ['.git', 'README.md', 'docs', 'examples'];
      const packageRoot = path.resolve(__dirname, '..', '..');
      
      // If all of these files/dirs exist, it's likely from git
      if (repoFiles.every(file => fs.existsSync(path.join(packageRoot, file)))) {
        try {
          const { execSync } = require('child_process');
          const version = execSync('git describe --tags').toString().trim();
          this.version = version;
          this.source = 'git';
        } catch (e) {
          this.version = 'unknown';
          this.source = 'git';
        }
      } else {
        // If no repo files found, try getting version from package.json
        try {
          const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8'));
          this.version = packageJson.version;
          this.source = 'npm';
        } catch (e) {
          this.version = 'unknown';
          this.source = 'unknown';
        }
      }
    } catch (e) {
      this.version = 'unknown';
      this.source = 'unknown';
    }
    
    logger.debug(`Version: ${this.version}, Source: ${this.source}`);
  }
  
  /**
   * Set model names
   * @private
   */
  _setModelNames() {
    this.chatModelLibrary = this.llm.constructor.name;
    this.modelName = 'Unknown';
    
    if (this.llm.modelName) {
      this.modelName = this.llm.modelName || 'Unknown';
    } else if (this.llm.model) {
      this.modelName = this.llm.model || 'Unknown';
    }
    
    if (this.settings.plannerLlm) {
      if (this.settings.plannerLlm.modelName) {
        this.plannerModelName = this.settings.plannerLlm.modelName;
      } else if (this.settings.plannerLlm.model) {
        this.plannerModelName = this.settings.plannerLlm.model;
      } else {
        this.plannerModelName = 'Unknown';
      }
    } else {
      this.plannerModelName = null;
    }
  }
  
  /**
   * Setup action models
   * @private
   */
  _setupActionModels() {
    // Setup dynamic action models from controller's registry
    this.ActionModel = this.controller.registry.createActionModel();
    
    // Create output model with the dynamic actions
    this.AgentOutput = AgentOutput.typeWithCustomActions(this.ActionModel);
    
    // Used to force the done action when max_steps is reached
    this.DoneActionModel = this.controller.registry.createActionModel(['done']);
    this.DoneAgentOutput = AgentOutput.typeWithCustomActions(this.DoneActionModel);
  }
  
  /**
   * Convert initial actions
   * @param {Object[]|null} initialActions - Initial actions
   * @returns {Object[]|null} Converted initial actions
   * @private
   */
  _convertInitialActions(initialActions) {
    if (!initialActions) {
      return null;
    }
    
    return initialActions.map(action => {
      if (action instanceof this.ActionModel) {
        return action;
      }
      return new this.ActionModel(action);
    });
  }
  
  /**
   * Set tool calling method
   * @returns {string|null} Tool calling method
   * @private
   */
  _setToolCallingMethod() {
    const toolCallingMethod = this.settings.toolCallingMethod;
    
    if (toolCallingMethod === 'auto') {
      if (this.modelName.includes('deepseek-reasoner') || this.modelName.includes('deepseek-r1')) {
        return 'raw';
      } else if (this.chatModelLibrary === 'ChatGoogleGenerativeAI') {
        return null;
      } else if (this.chatModelLibrary === 'ChatOpenAI') {
        return 'function_calling';
      } else if (this.chatModelLibrary === 'AzureChatOpenAI') {
        return 'function_calling';
      } else {
        return null;
      }
    } else {
      return toolCallingMethod;
    }
  }
  
  /**
   * Add new task
   * @param {string} newTask - New task
   */
  addNewTask(newTask) {
    this._messageManager.addNewTask(newTask);
  }
  
  /**
   * Raise if stopped or paused
   * @returns {Promise<void>}
   * @private
   */
  async _raiseIfStoppedOrPaused() {
    if (this.registerExternalAgentStatusRaiseErrorCallback) {
      if (await this.registerExternalAgentStatusRaiseErrorCallback()) {
        throw new Error('Interrupted');
      }
    }
    
    if (this.state.stopped || this.state.paused) {
      logger.debug('Agent paused after getting state');
      throw new Error('Interrupted');
    }
  }
  
  /**
   * Execute one step of the task
   * @param {AgentStepInfo|null} [stepInfo=null] - Step information
   * @returns {Promise<void>}
   */
  async step(stepInfo = null) {
    logger.info(`📍 Step ${this.state.nSteps}`);
    
    let state = null;
    let modelOutput = null;
    let result = [];
    const stepStartTime = Date.now() / 1000;
    let tokens = 0;
    
    try {
      state = await this.browserContext.getState();

      await this._raiseIfStoppedOrPaused();
      this._messageManager.addStateMessage(state, this.state.lastResult, stepInfo, this.settings.useVision);

      // Run planner at specified intervals if planner is configured
      if (this.settings.plannerLlm && this.state.nSteps % this.settings.plannerInterval === 0) {
        const plan = await this._runPlanner();
        // Add plan before last state message
        this._messageManager.addPlan(plan, -1);
      }
      
      if (stepInfo && stepInfo.isLastStep()) {
        // Add last step warning if needed
        let msg = 'Now comes your last step. Use only the "done" action now. No other actions - so here your action sequence must have length 1.';
        msg += '\nIf the task is not yet fully finished as requested by the user, set success in "done" to false! E.g. if not all steps are fully completed.';
        msg += '\nIf the task is fully finished, set success in "done" to true.';
        msg += '\nInclude everything you found out for the ultimate task in the done text.';
        
        logger.info('Last step finishing up');
        this._messageManager._addMessageWithTokens({
          role: 'user',
          content: msg,
        });
        
        this.AgentOutput = this.DoneAgentOutput;
      }
      
      const inputMessages = this._messageManager.getMessages();
      tokens = this._messageManager.state.currentTokens;
      try {
        modelOutput = await this.getNextAction(inputMessages);
        console.log('modelOutput', modelOutput);//process.exit(1)
        this.state.nSteps += 1;
        
        if (this.registerNewStepCallback) {
          await this.registerNewStepCallback(state, modelOutput, this.state.nSteps);
        }
        
        if (this.settings.saveConversationPath) {
          const target = `${this.settings.saveConversationPath}_${this.state.nSteps}.txt`;
          saveConversation(
            inputMessages, 
            modelOutput, 
            target, 
            this.settings.saveConversationPathEncoding
          );
        }
        
        this._messageManager._removeLastStateMessage(); // We don't want the whole state in the chat history
        
        await this._raiseIfStoppedOrPaused();
        
        this._messageManager.addModelOutput(modelOutput);
      } catch (e) {
        // Model call failed, remove last state message from history
        this._messageManager._removeLastStateMessage();
        throw e;
      }
      
      result = await this.multiAct(modelOutput.action);
      
      this.state.lastResult = result;
      
      if (result.length > 0 && result[result.length - 1].isDone) {
        logger.info(`📄 Result: ${result[result.length - 1].extractedContent}`);
      }
      
      this.state.consecutiveFailures = 0;
    } catch (e) {
      if (e.message === 'Interrupted') {
        logger.debug('Agent paused');
        this.state.lastResult = [
          new ActionResult({
            error: 'The agent was paused - now continuing actions might need to be repeated',
            includeInMemory: true,
          }),
        ];
        return;
      } else {
        result = await this._handleStepError(e);
        this.state.lastResult = result;
      }
    } finally {
      const stepEndTime = Date.now() / 1000;
      
      const actions = modelOutput ? modelOutput.action.map(a => {
        // Chuyển đổi action thành plain object, tương tự model_dump trong Python
        return typeof a.toJSON === 'function' ? a.toJSON() :
          (typeof a.model_dump === 'function' ? a.model_dump({ exclude_unset: true }) :
            JSON.parse(JSON.stringify(a)));
      }) : [];
      
      this.telemetry.capture(
        new AgentStepTelemetryEvent({
          agentId: this.state.agentId,
          step: this.state.nSteps,
          actions,
          consecutiveFailures: this.state.consecutiveFailures,
          stepError: result ? result.filter(r => r.error).map(r => r.error) : ['No result'],
        })
      );
      
      if (!result) {
        return;
      }
      
      if (state) {
        const metadata = new StepMetadata({
          stepNumber: this.state.nSteps,
          stepStartTime,
          stepEndTime,
          inputTokens: tokens,
        });
        
        this._makeHistoryItem(modelOutput, state, result, metadata);
      }
    }
  }
  
  /**
   * Handle step error
   * @param {Error} error - Error
   * @returns {Promise<ActionResult[]>} Action results
   * @private
   */
  async _handleStepError(error) {
    const includeTrace = logger.level === 'debug';
    const errorMsg = AgentError.formatError(error, includeTrace);
    const prefix = `❌ Result failed ${this.state.consecutiveFailures + 1}/${this.settings.maxFailures} times:\n `;
    
    if (error instanceof Error && (error.name === 'ValidationError' || error.name === 'ValueError')) {
      logger.error(`${prefix}${errorMsg}`);
      
      if (errorMsg.includes('Max token limit reached')) {
        // Cut tokens from history
        this._messageManager.settings.maxInputTokens = this.settings.maxInputTokens - 500;
        logger.info(`Cutting tokens from history - new max input tokens: ${this._messageManager.settings.maxInputTokens}`);
        this._messageManager.cutMessages();
      } else if (errorMsg.includes('Could not parse response')) {
        // Give model a hint how output should look like
        errorMsg += '\n\nReturn a valid JSON object with the required fields.';
      }
      
      this.state.consecutiveFailures += 1;
    } else {
      if (error.name === 'RateLimitError' || error.name === 'ResourceExhausted') {
        logger.warning(`${prefix}${errorMsg}`);
        await sleep(this.settings.retryDelay * 1000);
        this.state.consecutiveFailures += 1;
      } else {
        logger.error(`${prefix}${errorMsg}`);
        this.state.consecutiveFailures += 1;
      }
    }
    
    return [new ActionResult({ error: errorMsg, includeInMemory: true })];
  }
  
  /**
   * Make history item
   * @param {AgentOutput|null} modelOutput - Model output
   * @param {BrowserState} state - Browser state
   * @param {ActionResult[]} result - Action results
   * @param {StepMetadata|null} [metadata=null] - Metadata
   * @private
   */
  _makeHistoryItem(modelOutput, state, result, metadata = null) {
    let interactedElements = [null];
    
    if (modelOutput) {
      interactedElements = AgentHistory.getInteractedElement(modelOutput, state.selectorMap);
    }
    
    const stateHistory = new BrowserStateHistory({
      url: state.url,
      title: state.title,
      tabs: state.tabs,
      interactedElement: interactedElements,
      screenshot: state.screenshot,
    });
    
    const historyItem = new AgentHistory({
      modelOutput,
      result,
      state: stateHistory,
      metadata,
    });
    
    this.state.history.history.push(historyItem);
  }
  
  /**
   * Remove think tags
   * @param {string} text - Text
   * @returns {string} Text without think tags
   * @private
   */
  _removeThinkTags(text) {
    // Step 1: Remove well-formed <think>...</think>
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    // Step 2: Remove stray closing tags
    text = text.replace(/[\s\S]*?<\/think>/g, '');
    
    return text;
  }
  
  /**
   * Convert input messages
   * @param {Object[]} inputMessages - Input messages
   * @returns {Object[]} Converted messages
   * @private
   */
  _convertInputMessages(inputMessages) {
    return convertInputMessages(inputMessages);
  }
  
  /**
   * Get next action from LLM based on current state
   * @param {Object[]} inputMessages - Input messages
   * @returns {Promise<AgentOutput>} Next action
   */
  async getNextAction(inputMessages) {
    return await timeExecutionAsync('--get_next_action (agent)', async () => {
      // Convert input messages to the correct format
      // This is similar to self._convert_input_messages in Python
      const convertedMessages = this._convertInputMessages(inputMessages);
      
      // Convert messages to [type, content] format for LangChain JS compatibility
      const formattedMessages = convertedMessages.map(msg => {
        const type = msg.role === 'system' ? 'system' :
          msg.role === 'user' ? 'human' :
            msg.role === 'assistant' ? 'ai' : msg.role;
        return [type, msg.content];
      });

      let parsed = null;

      if (this.toolCallingMethod === 'raw') {
        // Raw mode - similar to Python's raw mode
        const output = await this.llm.invoke(formattedMessages);

        // Remove think tags if needed (similar to Python's _remove_think_tags)
        const cleanContent = typeof output.content === 'string'
          ? this._removeThinkTags(output.content)
          : output.content;

        try {
          const parsedJson = extractJsonFromModelOutput(cleanContent);
          parsed = new this.AgentOutput(parsedJson);
        } catch (e) {
          logger.warning(`Failed to parse model output: ${output} ${e.message}`);
          throw new Error('Could not parse response.');
        }
      } else if (this.toolCallingMethod === null) {
        // No tool calling - use structured output without withStructuredOutput
        try {
          // Define the schema for AgentOutput structure
          const agentOutputSchema = {
            type: "object",
            properties: {
              currentState: {
                type: "object",
                properties: {
                  memory: {
                    type: "string",
                    description: "Agent's memory about the current task"
                  },
                  evaluationPreviousGoal: {
                    type: "string",
                    description: "Evaluation of the previous goal (include 'Success' or 'Failed')"
                  },
                  nextGoal: {
                    type: "string",
                    description: "The next goal to achieve"
                  }
                },
                required: ["memory", "evaluationPreviousGoal", "nextGoal"]
              },
              action: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    actionType: { type: "string" },
                    actionParams: { type: "object" }
                  },
                  required: ["actionType"]
                }
              }
            },
            required: ["currentState", "action"]
          };

          // Create a system message with detailed instructions for formatting
          const systemMessage = [
            'system',
            `You must respond with a valid JSON object that follows this schema: ${JSON.stringify(agentOutputSchema, null, 2)}
            
Your response MUST be a valid JSON object with the following structure:
{
  "currentState": {
    "memory": "string describing what you remember",
    "evaluationPreviousGoal": "string evaluating previous goal (include 'Success' or 'Failed')",
    "nextGoal": "string describing the next goal"
  },
  "action": [
    {
      "actionType": "string representing the action type",
      "actionParams": {
        // parameters specific to the action type
      }
    }
    // more actions if needed
  ]
}

Do not include any text before or after the JSON object. Your entire response must be valid JSON.`
          ];

          // Add the system message to the end of the messages
          const messagesWithSystem = [...formattedMessages, systemMessage];

          // Invoke the LLM with the formatted messages
          const output = await this.llm.invoke(messagesWithSystem);

          // Extract and parse the JSON from the output
          let cleanContent = '';
          if (typeof output.content === 'string') {
            cleanContent = this._removeThinkTags(output.content);
            // Try to extract JSON if the response isn't already pure JSON
            try {
              JSON.parse(cleanContent);
            } catch (e) {
              cleanContent = extractJsonFromModelOutput(cleanContent);
            }
          } else if (typeof output.content === 'object') {
            cleanContent = JSON.stringify(output.content);
          }

          // Parse the JSON and create an AgentOutput instance
          const parsedJson = JSON.parse(cleanContent);

          // Ensure the parsed JSON has the required structure
          if (!parsedJson.currentState) {
            parsedJson.currentState = {
              memory: "No memory provided",
              evaluationPreviousGoal: "No evaluation provided",
              nextGoal: "No goal provided"
            };
          } else {
            // Ensure all required fields exist
            parsedJson.currentState.memory = parsedJson.currentState.memory || "No memory provided";
            parsedJson.currentState.evaluationPreviousGoal = parsedJson.currentState.evaluationPreviousGoal || "No evaluation provided";
            parsedJson.currentState.nextGoal = parsedJson.currentState.nextGoal || "No goal provided";
          }

          parsed = new this.AgentOutput(parsedJson);

          logger.debug(`Successfully parsed structured output: ${JSON.stringify(parsed)}`);
        } catch (e) {
          logger.error(`Failed to parse structured output: ${e.message}`);
          logger.debug(`Raw output: ${e.message}`);
          throw new Error(`Could not parse response: ${e.message}`);
        }
      } else {
        // Tool calling with specific method (function_calling or json_mode)
        try {
          // Define the tool/function for the LLM to use
          const agentOutputFunction = {
            name: "agent_output",
            description: "Generate the next action for the browser agent",
            parameters: {
              type: "object",
              properties: {
                currentState: {
                  type: "object",
                  properties: {
                    memory: {
                      type: "string",
                      description: "Memory of the agent about the current task"
                    },
                    evaluationPreviousGoal: {
                      type: "string",
                      description: "Evaluation of the previous goal (include 'Success' or 'Failed')"
                    },
                    nextGoal: {
                      type: "string",
                      description: "The next goal to achieve"
                    }
                  },
                  required: ["memory", "evaluationPreviousGoal", "nextGoal"],
                  description: "The current state of the agent"
                },
                action: {
                  type: "array",
                  items: {
                    type: "object",
                    description: "Each action should be an object with a single key (the action name) and its parameters as value",
                    additionalProperties: {
                      type: "object",
                      description: "Parameters for the action"
                    },
                    minProperties: 1,
                    maxProperties: 1
                  },
                  description: "The actions to take, each action is an object with the action name as key"
                }
              },
              required: ["currentState", "action"]
            }
          };

          // Use the existing LLM instance
          const llmWithTools = this.llm;

          // Set the tool calling method based on the configuration
          if (this.toolCallingMethod === 'function_calling') {
            // For OpenAI-compatible models
            const response = await llmWithTools.invoke(formattedMessages, {
              functions: [agentOutputFunction],
              function_call: { name: "agent_output" }
            });

            // Extract the function call from the response
            if (response.additional_kwargs && response.additional_kwargs.function_call) {
          const functionCall = response.additional_kwargs.function_call;
              const parsedArgs = JSON.parse(functionCall.arguments);

              // Ensure the parsed JSON has the required structure
              if (!parsedArgs.currentState) {
                parsedArgs.currentState = {
                  memory: "No memory provided",
                  evaluationPreviousGoal: "No evaluation provided",
                  nextGoal: "No goal provided"
                };
              } else {
                // Ensure all required fields exist
                parsedArgs.currentState.memory = parsedArgs.currentState.memory || "No memory provided";
                parsedArgs.currentState.evaluationPreviousGoal = parsedArgs.currentState.evaluationPreviousGoal || "No evaluation provided";
                parsedArgs.currentState.nextGoal = parsedArgs.currentState.nextGoal || "No goal provided";
              }

              parsed = new this.AgentOutput(parsedArgs);
            } else if (response.tool_calls && response.tool_calls.length > 0) {
              // Handle tool calls format
              const toolCall = response.tool_calls.find(tool => tool.name === "agent_output");
              if (toolCall) {
                const args = typeof toolCall.args === 'string'
                  ? JSON.parse(toolCall.args)
                  : toolCall.args;

                // Ensure the parsed JSON has the required structure
                if (!args.currentState) {
                  args.currentState = {
                    memory: "No memory provided",
                    evaluationPreviousGoal: "No evaluation provided",
                    nextGoal: "No goal provided"
                  };
        } else {
                  // Ensure all required fields exist
                  args.currentState.memory = args.currentState.memory || "No memory provided";
                  args.currentState.evaluationPreviousGoal = args.currentState.evaluationPreviousGoal || "No evaluation provided";
                  args.currentState.nextGoal = args.currentState.nextGoal || "No goal provided";
                }

                parsed = new this.AgentOutput(args);
              }
            }
          } else if (this.toolCallingMethod === 'json_mode') {
            // For models that support JSON mode
            // Add instructions to format the output as JSON
            const systemMsg = [
              'system',
              "You must respond with a valid JSON object that matches the following schema: " +
              JSON.stringify(agentOutputFunction.parameters, null, 2)
            ];

            const messagesWithSystem = [...formattedMessages, systemMsg];

            const response = await llmWithTools.invoke(messagesWithSystem, {
              response_format: { type: "json_object" }
            });

            // Parse the JSON response
            let content = '';
          if (typeof response.content === 'string') {
              content = response.content;
              // Try to extract JSON if the response isn't already pure JSON
              try {
                JSON.parse(content);
              } catch (e) {
                content = extractJsonFromModelOutput(content);
              }
            } else if (typeof response.content === 'object') {
              content = JSON.stringify(response.content);
            }

            const parsedJson = JSON.parse(content);

            // Ensure the parsed JSON has the required structure
            if (!parsedJson.currentState) {
              parsedJson.currentState = {
                memory: "No memory provided",
                evaluationPreviousGoal: "No evaluation provided",
                nextGoal: "No goal provided"
              };
          } else {
              // Ensure all required fields exist
              parsedJson.currentState.memory = parsedJson.currentState.memory || "No memory provided";
              parsedJson.currentState.evaluationPreviousGoal = parsedJson.currentState.evaluationPreviousGoal || "No evaluation provided";
              parsedJson.currentState.nextGoal = parsedJson.currentState.nextGoal || "No goal provided";
            }

            parsed = new this.AgentOutput(parsedJson);
          }

          if (!parsed) {
            throw new Error('Could not parse response.');
          }
        } catch (e) {
          logger.error(`Failed to parse tool calling output: ${e.message}`);
          throw new Error(`Could not parse response: ${e.message}`);
        }
      }

      if (!parsed) {
        throw new Error('Could not parse response.');
      }

      // Cut the number of actions to max_actions_per_step if needed
      if (parsed.action && parsed.action.length > this.settings.maxActionsPerStep) {
        parsed.action = parsed.action.slice(0, this.settings.maxActionsPerStep);
      }
        
        // Log response
      logResponse(parsed);

      return parsed;
    });
  }
  
  /**
   * Log agent run
   * @private
   */
  _logAgentRun() {
    const history = this.state.history;
    
    logger.info('Agent run completed:');
    logger.info(`Steps: ${history.numberOfSteps}`);
    logger.info(`Duration: ${history.totalDurationSeconds.toFixed(2)}s`);
    logger.info(`Input tokens: ${history.totalInputTokens}`);
    logger.info(`Done: ${history.isDone}`);
    logger.info(`Success: ${history.isSuccessful}`);
    logger.info(`Errors: ${history.hasErrors ? history.errors.length : 0}`);
    
    if (history.finalResult) {
      logger.info(`Final result: ${history.finalResult}`);
    }
    
    this.telemetry.capture(
      new AgentEndTelemetryEvent({
        agentId: this.state.agentId,
        task: this.task,
        steps: history.numberOfSteps,
        duration: history.totalDurationSeconds,
        inputTokens: history.totalInputTokens,
        isDone: history.isDone,
        isSuccessful: history.isSuccessful,
        hasErrors: history.hasErrors,
        modelName: this.modelName,
        modelLibrary: this.chatModelLibrary,
        browserUseVersion: this.version,
        browserUseSource: this.source,
      })
    );
  }
  
  /**
   * Run the planner to generate a plan for the task
   * @returns {Promise<string>} Generated plan
   * @private
   */
  async _runPlanner() {
    logger.info('Running planner...');
    
    try {
      const state = await this.browserContext.getState();
      
      // Create planner prompt
      const plannerPrompt = new PlannerPrompt({
        task: this.task,
        browserState: state,
        useVision: this.settings.useVisionForPlanner,
      });
      
      // Get planner messages
      const plannerMessages = plannerPrompt.getMessages();

      // Convert messages to [type, content] format
      const formattedMessages = plannerMessages.map(msg => {
        const type = msg.role === 'system' ? 'system' :
          msg.role === 'user' ? 'human' :
            msg.role === 'assistant' ? 'ai' : msg.role;
        return [type, msg.content];
      });
      
      // Call planner LLM
      const plannerResponse = await this.settings.plannerLlm.invoke(formattedMessages);
      
      // Extract plan from response
      const plan = plannerResponse.content;
      
      logger.info('Planner generated a plan');
      logger.debug(`Plan: ${plan}`);
      
      return plan;
    } catch (error) {
      logger.error(`Error running planner: ${error.message}`);
      return `Error generating plan: ${error.message}`;
    }
  }
  
  /**
   * Run the agent until completion or max steps reached
   * @param {number} [maxSteps=50] - Maximum number of steps to run
   * @returns {Promise<AgentHistoryList>} Agent history
   */
  async run(maxSteps = 50) {
    logger.info(`Starting agent run with max ${maxSteps} steps`);
    
    this.telemetry.capture(
      new AgentRunTelemetryEvent({
        agentId: this.state.agentId,
        task: this.task,
        modelName: this.modelName,
        modelLibrary: this.chatModelLibrary,
        browserUseVersion: this.version,
        browserUseSource: this.source,
      })
    );
    
    try {
      // Execute initial actions if any
      if (this.initialActions && this.initialActions.length > 0) {
        logger.info('Executing initial actions');
        const result = await this.multiAct(this.initialActions, false);
        this.state.lastResult = result;
      }
      
      for (let i = 0; i < maxSteps; i++) {
        // Check if we should stop due to too many failures
        if (this.state.consecutiveFailures >= this.settings.maxFailures) {
          logger.error(`❌ Stopping due to ${this.settings.maxFailures} consecutive failures`);
          break;
        }
        
        // Check control flags before each step
        if (this.state.stopped) {
          logger.info('Agent stopped');
          break;
        }
        
        while (this.state.paused) {
          await sleep(200); // Small delay to prevent CPU spinning
          if (this.state.stopped) { // Allow stopping while paused
            break;
          }
        }
        
        const stepInfo = new AgentStepInfo({
          maxSteps,
          stepNumber: i + 1,
        });
        
        await this.step(stepInfo);
        
        if (this.state.history.isDone) {
          if (this.settings.validateOutput && i < maxSteps - 1) {
            if (!await this._validateOutput()) {
              continue;
            }
          }
          
          await this.logCompletion();
          break;
        }
      }
      
      if (!this.state.history.isDone) {
        logger.warning(`Agent reached maximum steps (${maxSteps}) without completing the task`);
        
        // Force done with failure if max steps reached
        const errorMsg = `Maximum number of steps (${maxSteps}) reached without completing the task.`;
        const doneResult = [new ActionResult({ isDone: true, success: false, extractedContent: errorMsg })];
        
        // Add to history
        const state = await this.browserContext.getState();
        this._makeHistoryItem(null, state, doneResult);
      }
      
      return this.state.history;
    } catch (error) {
      console.log(error); process.exit(1);
      logger.error(`Error during agent run: ${error.message}`);
      logger.debug(error.stack);
      
      // Force done with failure
      const errorMsg = `Error during agent run: ${error.message}`;
      const doneResult = [new ActionResult({ isDone: true, success: false, extractedContent: errorMsg })];
      
      // Add to history
      try {
        const state = await this.browserContext.getState();
        this._makeHistoryItem(null, state, doneResult);
      } catch (e) {
        logger.error(`Could not add final history item: ${e.message}`);
      }
      
      return this.state.history;
    } finally {
      this._logAgentRun();
      
      // Close browser resources if not injected
      if (!this.injectedBrowserContext) {
        await this.browserContext.close();
      }
      
      if (!this.injectedBrowser && this.browser) {
        await this.browser.close();
      }
      
      // Generate GIF if requested
      if (this.settings.generateGif) {
        let outputPath = 'agent_history.gif';
        if (typeof this.settings.generateGif === 'string') {
          outputPath = this.settings.generateGif;
        }
        
        // This would need a GIF generation implementation for JavaScript
        logger.info(`GIF generation requested but not implemented in JS version: ${outputPath}`);
      }
      
      if (this.registerDoneCallback) {
        await this.registerDoneCallback(
          this.state.history,
          this.state.history.isDone,
          this.state.history.isSuccessful
        );
      }
    }
  }
  
  /**
   * Execute multiple actions
   * @param {Object[]} actions - Actions to execute
   * @param {boolean} [checkForNewElements=true] - Whether to check for new elements
   * @returns {Promise<ActionResult[]>} Action results
   */
  async multiAct(actions, checkForNewElements = true) {
    const results = [];
    
    // Get current selector map and path hashes for checking new elements
    const currentState = await this.browserContext.getState();
    const cachedSelectorMap = currentState.selectorMap;
    const cachedPathHashes = new Set(
      Object.values(cachedSelectorMap).map(e => e.hash?.branchPathHash).filter(Boolean)
    );
    
    // Remove any existing highlights
    // await this.browserContext.removeHighlights();
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const newState = await this.browserContext.getState();
      
      // Check for new elements if needed
      if (action.getIndex !== undefined && action.getIndex() !== null && i !== 0) {
        const newPathHashes = new Set(
          Object.values(newState.selectorMap).map(e => e.hash?.branchPathHash).filter(Boolean)
        );
        
        if (checkForNewElements && !this._isSubset(newPathHashes, cachedPathHashes)) {
          // Next action requires index but there are new elements on the page
          const msg = `Something new appeared after action ${i} / ${actions.length}`;
          logger.info(msg);
          results.push(new ActionResult({ 
            extractedContent: msg, 
            includeInMemory: true 
          }));
          break;
        }
      }
      
      // Check if agent is stopped or paused
      await this._raiseIfStoppedOrPaused();
      
      try {
        // Convert action to ActionModel if needed
        const actionModel = action instanceof this.ActionModel 
          ? action 
          : new this.ActionModel(action);
        
        // Get action type and parameters
        const actionType = actionModel.actionType;
        const actionParams = actionModel.actionParams;
        
        if (!actionType) {
          throw new Error('Action type not specified');
        }
        
        logger.info(`Executing action: ${actionType}`);
        
        // Execute action
        // Execute action - result đã là ActionResult rồi
        const result = await this.controller.executeAction(
          actionType, 
          actionParams
        );
        
        // Push trực tiếp result vào mảng results
        results.push(result);
        
        logger.debug(`Executed action ${i + 1} / ${actions.length}`);
        
        // If done action or error or last action, stop executing further actions
        if (results[results.length - 1].isDone || 
            results[results.length - 1].error || 
            i === actions.length - 1) {
          break;
        }
        
        // Wait between actions if configured
        if (this.browserContext.config && this.browserContext.config.waitBetweenActions) {
          await sleep(this.browserContext.config.waitBetweenActions * 1000);
        }
      } catch (error) {
        logger.error(`Error executing action: ${error.message}`);
        
        // Create error result
        const errorResult = new ActionResult({
          error: error.message,
          includeInMemory: true,
        });
        
        results.push(errorResult);
        break;
      }
    }
    
    return results;
  }
  
  /**
   * Helper function to check if set A is a subset of set B
   * @param {Set} a - Set A
   * @param {Set} b - Set B
   * @returns {boolean} Whether A is a subset of B
   * @private
   */
  _isSubset(a, b) {
    for (const item of a) {
      if (!b.has(item)) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Log the completion of a task
   * @returns {Promise<void>}
   */
  async logCompletion() {
    logger.info('✅ Task completed');
    if (this.state.history.isSuccessful) {
      logger.info('✅ Successfully');
    } else {
      logger.info('❌ Unfinished');
    }
    
    if (this.registerDoneCallback) {
      await this.registerDoneCallback(this.state.history);
    }
  }
  
  /**
   * Validate the output of the last action
   * @returns {Promise<boolean>} - Whether the output is valid
   * @private
   */
  async _validateOutput() {
    const systemMsg = 
      `You are a validator of an agent who interacts with a browser. ` +
      `Validate if the output of last action is what the user wanted and if the task is completed. ` +
      `If the task is unclear defined, you can let it pass. But if something is missing or the image does not show what was requested dont let it pass. ` +
      `Try to understand the page and help the model with suggestions like scroll, do x, ... to get the solution right. ` +
      `Task to validate: ${this.task}. Return a JSON object with 2 keys: is_valid and reason. ` +
      `is_valid is a boolean that indicates if the output is correct. ` +
      `reason is a string that explains why it is valid or not.` +
      ` example: {"is_valid": false, "reason": "The user wanted to search for "cat photos", but the agent searched for "dog photos" instead."}`;
    
    if (this.browserContext.session) {
      const state = await this.browserContext.getState();
      const content = new AgentMessagePrompt({
        state: state,
        result: this.state.lastResult,
        includeAttributes: this.settings.includeAttributes
      });
      
      // Create messages in [type, content] format
      const msg = [
        ['system', systemMsg],
        ['human', content.getUserMessage(this.settings.useVision)]
      ];
      
      try {
        const response = await this.llm.invoke(msg);
        let parsed;
        
        try {
          if (typeof response.content === 'string') {
            parsed = JSON.parse(response.content);
          } else {
            throw new Error('Invalid response format');
          }
        } catch (e) {
          logger.warning(`Failed to parse validator response: ${response.content}`);
          return true; // Assume valid if parsing fails
        }
        
        const isValid = parsed.is_valid;
        
        if (!isValid) {
          logger.info(`❌ Validator decision: ${parsed.reason}`);
          const msg = `The output is not yet correct. ${parsed.reason}.`;
          this.state.lastResult = [new ActionResult({ 
            extractedContent: msg, 
            includeInMemory: true 
          })];
        } else {
          logger.info(`✅ Validator decision: ${parsed.reason}`);
        }
        
        return isValid;
      } catch (error) {
        logger.error(`Error validating output: ${error.message}`);
        return true; // Assume valid if validation fails
      }
    }
    
    // If no browser session, we can't validate the output
    return true;
  }
  
  /**
   * Take a step
   * @returns {Promise<[boolean, boolean]>} [isDone, isSuccessful]
   */
  async takeStep() {
    if (this.state.consecutiveFailures >= this.settings.maxFailures) {
      logger.error(`Maximum number of consecutive failures (${this.settings.maxFailures}) reached. Stopping.`);
      
      // Add a final error result
      const errorMsg = `Maximum number of consecutive failures (${this.settings.maxFailures}) reached.`;
      this.state.lastResult = [new ActionResult({ error: errorMsg, includeInMemory: true })];
      
      // Force done with failure
      const doneResult = [new ActionResult({ isDone: true, success: false, extractedContent: errorMsg })];
      
      // Add to history
      const state = await this.browserContext.getState();
      this._makeHistoryItem(null, state, doneResult);
      
      return [true, false];
    }
    
    await this.step();
    
    // Check if done
    const isDone = this.state.history.isDone;
    const isSuccessful = this.state.history.isSuccessful;
    
    return [isDone, isSuccessful !== null ? isSuccessful : false];
  }
  
  /**
   * Rerun a saved history of actions with error handling and retry logic
   * @param {AgentHistoryList} history - The history to replay
   * @param {number} [maxRetries=3] - Maximum number of retries per action
   * @param {boolean} [skipFailures=true] - Whether to skip failed actions or stop execution
   * @param {number} [delayBetweenActions=2.0] - Delay between actions in seconds
   * @returns {Promise<ActionResult[]>} - List of action results
   */
  async rerunHistory(
    history,
    maxRetries = 3,
    skipFailures = true,
    delayBetweenActions = 2.0
  ) {
    // Execute initial actions if provided
    if (this.initialActions && this.initialActions.length > 0) {
      const result = await this.multiAct(this.initialActions);
      this.state.lastResult = result;
    }
    
    const results = [];
    
    for (let i = 0; i < history.history.length; i++) {
      const historyItem = history.history[i];
      const goal = historyItem.modelOutput?.currentState?.nextGoal || '';
      logger.info(`Replaying step ${i + 1}/${history.history.length}: goal: ${goal}`);
      
      if (
        !historyItem.modelOutput ||
        !historyItem.modelOutput.action ||
        historyItem.modelOutput.action.length === 0 || 
        historyItem.modelOutput.action[0] === null
      ) {
        logger.warning(`Step ${i + 1}: No action to replay, skipping`);
        results.push(new ActionResult({ error: 'No action to replay' }));
        continue;
      }
      
      let retryCount = 0;
      while (retryCount < maxRetries) {
        try {
          const result = await this._executeHistoryStep(historyItem, delayBetweenActions);
          results.push(...result);
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            const errorMsg = `Step ${i + 1} failed after ${maxRetries} attempts: ${error.message}`;
            logger.error(errorMsg);
            if (!skipFailures) {
              results.push(new ActionResult({ error: errorMsg }));
              throw new Error(errorMsg);
            }
          } else {
            logger.warning(`Step ${i + 1} failed (attempt ${retryCount}/${maxRetries}), retrying...`);
            await sleep(delayBetweenActions * 1000);
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * Execute a single step from history with element validation
   * @param {AgentHistory} historyItem - History item to execute
   * @param {number} delay - Delay between actions in seconds
   * @returns {Promise<ActionResult[]>} - List of action results
   * @private
   */
  async _executeHistoryStep(historyItem, delay) {
    const state = await this.browserContext.getState();
    if (!state || !historyItem.modelOutput) {
      throw new Error('Invalid state or model output');
    }
    
    const updatedActions = [];
    
    for (let i = 0; i < historyItem.modelOutput.action.length; i++) {
      const action = historyItem.modelOutput.action[i];
      const updatedAction = await this._updateActionIndices(
        historyItem.state.interactedElement[i],
        action,
        state
      );
      
      updatedActions.push(updatedAction);
      
      if (updatedAction === null) {
        throw new Error(`Could not find matching element ${i} in current page`);
      }
    }
    
    const result = await this.multiAct(updatedActions);
    
    await sleep(delay * 1000);
    
    return result;
  }
  
  /**
   * Update action indices based on current page state
   * @param {DOMHistoryElement|null} historicalElement - Historical element
   * @param {ActionModel} action - Action model
   * @param {BrowserState} currentState - Current browser state
   * @returns {Promise<ActionModel|null>} - Updated action or null if element cannot be found
   * @private
   */
  async _updateActionIndices(historicalElement, action, currentState) {
    if (!historicalElement || !currentState.elementTree) {
      return action;
    }
    
    const currentElement = HistoryTreeProcessor.findHistoryElementInTree(
      historicalElement, 
      currentState.elementTree
    );
    
    if (!currentElement || currentElement.highlightIndex === null) {
      return null;
    }
    
    const oldIndex = action.getIndex ? action.getIndex() : null;
    if (oldIndex !== null && oldIndex !== currentElement.highlightIndex) {
      action.setIndex(currentElement.highlightIndex);
      logger.info(`Element moved in DOM, updated index from ${oldIndex} to ${currentElement.highlightIndex}`);
    }
    
    return action;
  }
  
  /**
   * Load history from file and rerun it
   * @param {string|null} [historyFile=null] - Path to the history file
   * @param {Object} [kwargs={}] - Additional arguments passed to rerunHistory
   * @returns {Promise<ActionResult[]>} - List of action results
   */
  async loadAndRerun(historyFile = null, kwargs = {}) {
    if (!historyFile) {
      historyFile = 'AgentHistory.json';
    }
    
    const history = AgentHistoryList.loadFromFile(historyFile, this.AgentOutput);
    return await this.rerunHistory(
      history,
      kwargs.maxRetries,
      kwargs.skipFailures,
      kwargs.delayBetweenActions
    );
  }
  
  /**
   * Save the history to a file
   * @param {string|null} [filePath=null] - Path to save history to
   */
  saveHistory(filePath = null) {
    if (!filePath) {
      filePath = 'AgentHistory.json';
    }
    
    this.state.history.saveToFile(filePath);
  }
  
  /**
   * Pause the agent before the next step
   */
  pause() {
    logger.info('🔄 pausing Agent');
    this.state.paused = true;
  }
  
  /**
   * Resume the agent
   */
  resume() {
    logger.info('▶️ Agent resuming');
    this.state.paused = false;
  }
  
  /**
   * Stop the agent
   */
  stop() {
    logger.info('⏹️ Agent stopping');
    this.state.stopped = true;
  }
} 