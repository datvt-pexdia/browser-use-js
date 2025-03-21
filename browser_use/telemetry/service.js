/**
 * Browser-Use Telemetry Service
 * JavaScript ES6 version of service.py
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { BaseTelemetryEvent } from './views.js';
import { singleton, logger } from '../utils.js';

// Load environment variables
dotenv.config();

const POSTHOG_EVENT_SETTINGS = {
  'process_person_profile': true,
};

/**
 * Service for capturing anonymized telemetry data.
 * 
 * If the environment variable `ANONYMIZED_TELEMETRY=False`, anonymized telemetry will be disabled.
 */
class ProductTelemetryClass {
  constructor() {
    this.USER_ID_PATH = path.join(os.homedir(), '.cache', 'browser_use', 'telemetry_user_id');
    this.PROJECT_API_KEY = 'phc_F8JMNjW1i2KbGUTaW1unnDdLSPCoyc52SGRU0JecaUh';
    this.HOST = 'https://eu.i.posthog.com';
    this.UNKNOWN_USER_ID = 'UNKNOWN';
    this._currUserId = null;
    
    const telemetryDisabled = (process.env.ANONYMIZED_TELEMETRY || 'true').toLowerCase() === 'false';
    this.debugLogging = (process.env.BROWSER_USE_LOGGING_LEVEL || 'info').toLowerCase() === 'debug';

    if (telemetryDisabled) {
      this._posthogClient = null;
    } else {
      logger.info('Anonymized telemetry enabled. See https://docs.browser-use.com/development/telemetry for more information.');
      
      // In a real implementation, you would import and use the posthog-node library
      // For now, we'll create a simple mock
      this._posthogClient = {
        capture: (userId, eventName, properties) => {
          if (this.debugLogging) {
            logger.debug(`[POSTHOG] Captured event: ${eventName} for user ${userId}`);
          }
          // In a real implementation, this would send data to PostHog
        }
      };
    }

    if (this._posthogClient === null) {
      logger.debug('Telemetry disabled');
    }
  }

  /**
   * Capture a telemetry event
   * @param {BaseTelemetryEvent} event - The event to capture
   */
  capture(event) {
    if (this._posthogClient === null) {
      return;
    }

    if (this.debugLogging) {
      logger.debug(`Telemetry event: ${event.name} ${JSON.stringify(event.properties)}`);
    }
    this._directCapture(event);
  }

  /**
   * Directly capture a telemetry event
   * @param {BaseTelemetryEvent} event - The event to capture
   * @private
   */
  _directCapture(event) {
    if (this._posthogClient === null) {
      return;
    }

    try {
      this._posthogClient.capture(
        this.userId,
        event.name,
        { ...event.properties, ...POSTHOG_EVENT_SETTINGS }
      );
    } catch (e) {
      logger.error(`Failed to send telemetry event ${event.name}: ${e}`);
    }
  }

  /**
   * Get the user ID
   * @returns {Promise<string>} The user ID
   */
  get userId() {
    if (this._currUserId) {
      return this._currUserId;
    }

    // We need to make this synchronous to match the Python implementation
    // In a real implementation, you might want to use async/await
    try {
      if (!fs.existsSync(this.USER_ID_PATH)) {
        fs.mkdirSync(path.dirname(this.USER_ID_PATH), { recursive: true });
        const newUserId = uuidv4();
        fs.writeFileSync(this.USER_ID_PATH, newUserId);
        this._currUserId = newUserId;
      } else {
        this._currUserId = fs.readFileSync(this.USER_ID_PATH, 'utf8');
      }
    } catch (e) {
      this._currUserId = 'UNKNOWN_USER_ID';
    }
    
    return this._currUserId;
  }
}

// Create a singleton instance
export const ProductTelemetry = singleton(ProductTelemetryClass);

export default ProductTelemetry; 