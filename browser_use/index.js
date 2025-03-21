/**
 * Browser-Use
 * JavaScript ES6 version of browser-use
 * 
 * Enable AI to control your browser
 */

// Setup logging
import { setupLogging } from './logging_config.js';
setupLogging();

// Export main components
import { Browser, BrowserConfig } from './browser/browser.js';
import { BrowserContext, BrowserContextConfig } from './browser/context.js';
import { DomService } from './dom/service.js';
import { HistoryTreeProcessor } from './dom/history_tree_processor/service.js';
import { ProductTelemetry } from './telemetry/service.js';
import { Controller } from './controller/service.js';
import { ControllerRegistry } from './controller/registry/service.js';
import { Agent } from './agent/service.js';
import { createHistoryGif } from './agent/gif.js';

// Export views
import * as BrowserViews from './browser/views.js';
import * as DomViews from './dom/views.js';
import * as ControllerViews from './controller/views.js';
import * as TelemetryViews from './telemetry/views.js';
import * as RegistryViews from './controller/registry/views.js';
import * as AgentViews from './agent/views.js';

// Export utilities
import * as Utils from './utils.js';

// Export all components
export {
  // Main components
  Browser,
  BrowserConfig,
  BrowserContext,
  BrowserContextConfig,
  DomService,
  HistoryTreeProcessor,
  ProductTelemetry,
  Controller,
  ControllerRegistry,
  Agent,
  createHistoryGif,
  
  // Views
  BrowserViews,
  DomViews,
  ControllerViews,
  TelemetryViews,
  RegistryViews,
  AgentViews,
  
  // Utilities
  Utils,
};

// Export specific views for convenience
export const {
  BrowserState,
  BrowserStateHistory,
  TabInfo,
  BrowserError,
  URLNotAllowedError,
} = BrowserViews;

export const {
  DOMBaseNode,
  DOMElementNode,
  DOMTextNode,
  DOMState,
} = DomViews;

export const {
  SearchGoogleAction,
  GoToUrlAction,
  ClickElementAction,
  InputTextAction,
  DoneAction,
  SwitchTabAction,
  OpenTabAction,
  ScrollAction,
  SendKeysAction,
  ExtractPageContentAction,
  NoParamsAction,
} = ControllerViews;

export const {
  BaseTelemetryEvent,
  RegisteredFunction,
  ControllerRegisteredFunctionsTelemetryEvent,
  AgentStepTelemetryEvent,
  AgentRunTelemetryEvent,
  AgentEndTelemetryEvent,
} = TelemetryViews;

export const {
  RegisteredFunction: RegistryRegisteredFunction,
  FunctionParameter,
} = RegistryViews;

export const {
  AgentSettings,
  AgentState,
  AgentStepInfo,
  ActionResult,
  StepMetadata,
  AgentBrain,
  AgentOutput,
  AgentHistory,
  AgentHistoryList,
  AgentError,
} = AgentViews;

export { 
  timeExecutionAsync, 
  timeExecutionSync, 
  sleep,
  randomString,
  isValidUrl,
  truncateString,
  escapeHtml,
  deepClone,
  logger 
} from './utils.js'; 