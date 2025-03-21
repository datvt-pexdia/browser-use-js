/**
 * Browser-Use Agent Prompts
 * JavaScript ES6 version of prompts.py
 * 
 * Contains prompt templates for the agent
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * System prompt for the agent
 */
export class SystemPrompt {
  /**
   * @param {string} actionDescription - Description of available actions
   * @param {number} [maxActionsPerStep=10] - Maximum number of actions per step
   * @param {string|null} [overrideSystemMessage=null] - Override system message
   * @param {string|null} [extendSystemMessage=null] - Extend system message
   */
  constructor(
    actionDescription,
    maxActionsPerStep = 1,
    overrideSystemMessage = null,
    extendSystemMessage = null
  ) {
    this.defaultActionDescription = actionDescription;
    this.maxActionsPerStep = maxActionsPerStep;

    let prompt = '';
    if (overrideSystemMessage) {
      prompt = overrideSystemMessage;
    } else {
      this._loadPromptTemplate();
      prompt = this.promptTemplate.replace('{max_actions}', this.maxActionsPerStep);
    }

    if (extendSystemMessage) {
      prompt += `\n${extendSystemMessage}`;
    }

    this.systemMessage = { role: 'system', content: prompt };
  }

  /**
   * Load the prompt template from the markdown file
   * @private
   */
  _loadPromptTemplate() {
    try {
      // Get the directory of the current module
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const promptPath = path.join(__dirname, 'system_prompt.md');

      if (fs.existsSync(promptPath)) {
        this.promptTemplate = fs.readFileSync(promptPath, 'utf-8');
      } else {
        throw new Error(`System prompt template not found at ${promptPath}`);
      }
    } catch (e) {
      throw new Error(`Failed to load system prompt template: ${e.message}`);
    }
  }

  /**
   * Get the system message
   * @returns {Object} System message
   */
  getSystemMessage() {
    return this.systemMessage;
  }
}

/**
 * Agent message prompt
 */
export class AgentMessagePrompt {
  /**
   * @param {Object} state - Browser state
   * @param {Array|null} [result=null] - Action results
   * @param {string[]} [includeAttributes=[]] - Attributes to include
   * @param {Object|null} [stepInfo=null] - Step information
   */
  constructor(
    state,
    result = null,
    includeAttributes = [],
    stepInfo = null
  ) {
    this.state = state;
    this.result = result;
    this.includeAttributes = includeAttributes;
    this.stepInfo = stepInfo;
  }

  /**
   * Get user message
   * @param {boolean} [useVision=true] - Whether to use vision
   * @returns {Object} User message
   */
  getUserMessage(useVision = true) {
    let elementsText = '';
    // Check if elementTree exists before calling methods on it
    if (this.state.elementTree) {
      elementsText = this.state.elementTree.clickableElementsToString(this.includeAttributes);
    } else {
      elementsText = 'No element tree available';
    }
    console.log("elementsText: ", elementsText);
    const hasContentAbove = (this.state.pixelsAbove || 0) > 0;
    const hasContentBelow = (this.state.pixelsBelow || 0) > 0;

    let formattedElementsText = '';
    if (elementsText !== '') {
      if (hasContentAbove) {
        formattedElementsText = `... ${this.state.pixelsAbove} pixels above - scroll or extract content to see more ...\n${elementsText}`;
      } else {
        formattedElementsText = `[Start of page]\n${elementsText}`;
      }

      if (hasContentBelow) {
        formattedElementsText = `${formattedElementsText}\n... ${this.state.pixelsBelow} pixels below - scroll or extract content to see more ...`;
      } else {
        formattedElementsText = `${formattedElementsText}\n[End of page]`;
      }
    } else {
      formattedElementsText = 'empty page';
    }

    let stepInfoDescription = '';
    if (this.stepInfo) {
      stepInfoDescription = `Current step: ${this.stepInfo.stepNumber + 1}/${this.stepInfo.maxSteps}`;
    }

    // Build the message content
    let content = '';

    // Add task information
    content += `URL: ${this.state.url || 'No URL'}\n`;

    // Add tabs information
    if (this.state.tabs && this.state.tabs.length > 0) {
      content += 'Open tabs:\n';
      for (const tab of this.state.tabs) {
        const isCurrent = tab.index === this.state.currentTabIndex;
        content += `${isCurrent ? '→ ' : '  '}Tab ${tab.index}: ${tab.title} (${tab.url})\n`;
      }
      content += '\n';
    }

    // Add step information if available
    if (stepInfoDescription) {
      content += `${stepInfoDescription}\n\n`;
    }

    // Add previous action results if available
    if (this.result && this.result.length > 0) {
      console.log('this.result', this.result);// process.exit(1);
      content += 'Previous action results:\n';
      for (const r of this.result) {
        if (r.error) {
          content += `❌ Error: ${r.error}\n`;
        } else if (r.extractedContent) {
          content += `📄 Extracted content: ${r.extractedContent}\n`;
        } else if (r.isDone) {
          content += `✅ Done: ${r.success ? 'Success' : 'Failure'}\n`;
        } else {
          content += `✓ Action completed successfully\n`;
        }
      }
      content += '\n';
    }

    // Add interactive elements
    content += 'Interactive Elements:\n';
    content += formattedElementsText;

    // Create the message object
    const message = { role: 'user', content };

    // Add image if using vision and screenshot is available
    if (useVision && this.state.screenshot) {
      message.content = [
        { type: 'text', text: content },
        {
          type: 'image_url',
          image_url: {
            url: this.state.screenshot,
            detail: 'high'
          }
        }
      ];
    }

    return message;
  }
}

/**
 * Planner prompt
 */
export class PlannerPrompt extends SystemPrompt {
  /**
   * Get the system message
   * @returns {Object} System message
   */
  getSystemMessage() {
    const plannerPrompt = `You are a planning assistant for a browser automation task.
Your job is to analyze the current state of the browser and create a high-level plan for completing the task.
Focus on breaking down the task into logical steps that can be executed by the browser automation agent.

The plan should:
1. Be clear and concise
2. Include specific actions where possible (e.g., "Search for X", "Click on the Y button")
3. Account for potential obstacles or variations
4. Be adaptable to different website layouts

Your plan will be used by the browser automation agent to guide its actions.
Respond ONLY with the plan, without any additional explanations or commentary.`;

    return { role: 'system', content: plannerPrompt };
  }
} 