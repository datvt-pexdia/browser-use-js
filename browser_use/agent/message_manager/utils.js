/**
 * Browser-Use Agent Message Manager Utils
 * JavaScript ES6 version of utils.py
 * 
 * Contains utility functions for the message manager
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../../utils.js';

/**
 * Convert input messages to a format suitable for the model
 * @param {Object[]} messages - Input messages
 * @returns {Object[]} Converted messages
 */
export function convertInputMessages(messages) {
  // Check if messages is iterable
  if (!messages || !Array.isArray(messages)) {
    logger.error(`convertInputMessages received non-array input: ${typeof messages}`);
    return [];
  }
  
  return messages.map(message => {
    // If message is null or undefined, skip it
    if (!message) {
      logger.warn('Skipping null or undefined message');
      return { role: 'user', content: '' };
    }
    
    // Handle [type, content] format - convert to {role, content}
    if (Array.isArray(message) && message.length === 2) {
      const [type, content] = message;
      // Convert type to role
      let role;
      if (type === 'human' || type === 'user') {
        role = 'user';
      } else if (type === 'ai' || type === 'assistant') {
        role = 'assistant';
      } else {
        role = type; // 'system' stays as 'system'
      }
      return { role, content };
    }
    
    // If the message is already in the correct format, return it as is
    if (message.role && (typeof message.content === 'string' || Array.isArray(message.content))) {
      return message;
    }
    
    // Otherwise, convert it
    return {
      role: message.role || 'user',
      content: message.content || '',
    };
  });
}

/**
 * Extract JSON from model output
 * @param {string} text - Model output
 * @returns {Object|null} Extracted JSON
 */
export function extractJsonFromModelOutput(text) {
  try {
    // Try to parse the entire text as JSON
    return JSON.parse(text);
  } catch (e) {
    // If that fails, try to extract JSON from the text
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                      text.match(/```([\s\S]*?)```/) ||
                      text.match(/{[\s\S]*}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e) {
        logger.error(`Failed to parse extracted JSON: ${e.message}`);
        return null;
      }
    }
    
    logger.error(`No JSON found in model output: ${text}`);
    return null;
  }
}

/**
 * Save conversation to file
 * @param {Object[]} messages - Input messages
 * @param {Object} modelOutput - Model output
 * @param {string} filepath - File path
 * @param {string} [encoding='utf-8'] - File encoding
 */
export function saveConversation(messages, modelOutput, filepath, encoding = 'utf-8') {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Format messages
    const formattedMessages = messages.map(message => {
      if (typeof message.content === 'string') {
        return `${message.role.toUpperCase()}: ${message.content}`;
      } else if (Array.isArray(message.content)) {
        const textParts = message.content
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join('\n');
        
        const imageParts = message.content
          .filter(part => part.type === 'image_url')
          .map(part => `[IMAGE: ${part.image_url.url.substring(0, 30)}...]`)
          .join('\n');
        
        return `${message.role.toUpperCase()}: ${textParts}\n${imageParts}`;
      }
      
      return `${message.role.toUpperCase()}: ${JSON.stringify(message.content)}`;
    }).join('\n\n');
    
    // Format model output
    const formattedOutput = `MODEL OUTPUT: ${JSON.stringify(modelOutput, null, 2)}`;
    
    // Write to file
    fs.writeFileSync(filepath, `${formattedMessages}\n\n${formattedOutput}`, { encoding });
    
    logger.debug(`Saved conversation to ${filepath}`);
  } catch (e) {
    logger.error(`Failed to save conversation: ${e.message}`);
  }
} 