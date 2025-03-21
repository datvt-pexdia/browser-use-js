/**
 * Browser-Use Logging Configuration
 * JavaScript ES6 version of logging_config.py
 */

// Import dotenv if needed
// import dotenv from 'dotenv';
// dotenv.config();

/**
 * Custom logger implementation
 * This is a simplified version of the Python logging system
 */
class Logger {
  constructor(name) {
    this.name = name;
    this.level = 'info'; // Default level
    this.handlers = [];
    this.propagate = true;
  }

  setLevel(level) {
    this.level = level;
  }

  addHandler(handler) {
    this.handlers.push(handler);
  }

  log(level, message, ...args) {
    if (this.shouldLog(level)) {
      console.log("log")
      const formattedMessage = this.format(level, message, ...args);
      console.log(formattedMessage)
      // this.handlers.forEach(handler => handler.handle(formattedMessage));
    }
  }

  shouldLog(level) {
    const levels = {
      debug: 10,
      info: 20,
      result: 35,
      warning: 30,
      error: 40,
      critical: 50
    };

    return levels[level] >= levels[this.level];
  }

  format(level, message, ...args) {
    // Replace placeholders like %s with args
    let formattedMessage = message;
    args.forEach(arg => {
      formattedMessage = formattedMessage.replace(/%[sdfo]/, arg);
    });

    return `${level.toUpperCase().padEnd(8)} [${this.name}] ${formattedMessage}`;
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  result(message, ...args) {
    this.log('result', message, ...args);
  }

  warning(message, ...args) {
    this.log('warning', message, ...args);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  critical(message, ...args) {
    this.log('critical', message, ...args);
  }
}

class ConsoleHandler {
  constructor() {
    this.level = 'debug';
    this.formatter = null;
  }

  setLevel(level) {
    this.level = level;
  }

  setFormatter(formatter) {
    this.formatter = formatter;
  }

  handle(message) {

    console.log(message);
  }
}

class BrowserUseFormatter {
  format(record) {
    if (typeof record.name === 'string' && record.name.startsWith('browser_use.')) {
      record.name = record.name.split('.').slice(-2)[0];
    }
    return `${record.level.toUpperCase().padEnd(8)} [${record.name}] ${record.message}`;
  }
}

// Logger registry to mimic Python's logging module
const loggers = {};

/**
 * Get a logger by name
 * @param {string} name - Logger name
 * @returns {Logger} - Logger instance
 */
function getLogger(name) {
  if (!loggers[name]) {
    loggers[name] = new Logger(name);
  }
  return loggers[name];
}

/**
 * Add a new logging level
 * @param {string} levelName - Level name
 * @param {number} levelNum - Level number
 * @param {string} methodName - Method name (optional)
 */
function addLoggingLevel(levelName, levelNum, methodName = null) {
  if (!methodName) {
    methodName = levelName.toLowerCase();
  }

  // Check if level already exists
  if (Logger.prototype[methodName]) {
    throw new Error(`${methodName} already defined in Logger class`);
  }

  // Add method to Logger prototype
  Logger.prototype[methodName] = function (message, ...args) {
    this.log(levelName.toLowerCase(), message, ...args);
  };
}

/**
 * Setup logging configuration
 */
export function setupLogging() {
  // Try to add RESULT level
  try {
    addLoggingLevel('RESULT', 35);
  } catch (error) {
    // Level already exists, which is fine
  }

  // Get log level from environment
  const logType = process.env.BROWSER_USE_LOGGING_LEVEL || 'info';

  // Clear existing handlers
  Object.values(loggers).forEach(logger => {
    logger.handlers = [];
  });

  // Setup console handler
  const console = new ConsoleHandler();
  console.handle("setupLogging")

  if (logType === 'result') {
    console.setLevel('result');
    console.setFormatter({
      format: record => record.message
    });
  } else {
    console.setFormatter(new BrowserUseFormatter());
  }

  // Configure root logger
  const root = getLogger('root');
  root.addHandler(console);

  // Set log level
  if (logType === 'result') {
    root.setLevel('result');
  } else if (logType === 'debug') {
    root.setLevel('debug');
  } else {
    root.setLevel('info');
  }

  // Configure browser_use logger
  const browserUseLogger = getLogger('browser_use');
  browserUseLogger.propagate = false;
  browserUseLogger.addHandler(console);
  browserUseLogger.setLevel(root.level);

  // Log setup complete
  browserUseLogger.info('BrowserUse logging setup complete with level %s', logType);

  // Silence third-party loggers
  const thirdPartyLoggers = [
    'WDM',
    'httpx',
    'selenium',
    'playwright',
    'urllib3',
    'asyncio',
    'langchain',
    'openai',
    'httpcore',
    'charset_normalizer',
    'anthropic._base_client',
    'PIL.PngImagePlugin',
    'trafilatura.htmlprocessing',
    'trafilatura',
  ];

  thirdPartyLoggers.forEach(loggerName => {
    const logger = getLogger(loggerName);
    logger.setLevel('error');
    logger.propagate = false;
  });

  return browserUseLogger;
}

export { getLogger };
export default setupLogging; 