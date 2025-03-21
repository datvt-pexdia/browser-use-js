/**
 * Browser-Use Browser
 * JavaScript ES6 version of browser.py
 * 
 * Playwright browser on steroids.
 */

import { chromium, firefox, webkit } from 'playwright';
import { BrowserContext, BrowserContextConfig } from './context.js';
import { timeExecutionAsync, logger, randomString } from '../utils.js';

/**
 * Configuration for the Browser
 */
export class BrowserConfig {
  /**
   * @param {Object} options - Browser configuration options
   * @param {boolean} [options.headless=false] - Whether to run browser in headless mode
   * @param {boolean} [options.disableSecurity=true] - Disable browser security features
   * @param {string[]} [options.extraChromiumArgs=[]] - Extra arguments to pass to the browser
   * @param {string|null} [options.chromeInstancePath=null] - Path to a Chrome instance to use
   * @param {string|null} [options.wssUrl=null] - Connect to a browser instance via WebSocket
   * @param {string|null} [options.cdpUrl=null] - Connect to a browser instance via CDP
   * @param {Object|null} [options.proxy=null] - Proxy settings
   * @param {BrowserContextConfig} [options.newContextConfig=null] - New context configuration
   * @param {boolean} [options._forceKeepBrowserAlive=false] - Force keep browser alive
   * @param {boolean} [options.enableStealth=true] - Enable stealth mode to avoid detection
   */
  constructor({
    headless = false,
    disableSecurity = true,
    extraChromiumArgs = [],
    chromeInstancePath = null,
    wssUrl = null,
    cdpUrl = null,
    proxy = null,
    newContextConfig = null,
    _forceKeepBrowserAlive = false,
    enableStealth = true
  } = {}) {
    this.headless = headless;
    this.disableSecurity = disableSecurity;
    this.extraChromiumArgs = extraChromiumArgs;
    this.chromeInstancePath = chromeInstancePath;
    this.wssUrl = wssUrl;
    this.cdpUrl = cdpUrl;
    this.proxy = proxy;
    this.newContextConfig = newContextConfig || new BrowserContextConfig();
    this._forceKeepBrowserAlive = _forceKeepBrowserAlive;
    this.enableStealth = enableStealth;
  }
}

/**
 * Playwright browser on steroids.
 * 
 * This is a persistent browser factory that can spawn multiple browser contexts.
 * It is recommended to use only one instance of Browser per your application (RAM usage will grow otherwise).
 */
export class Browser {
  /**
   * @param {BrowserConfig} config - Browser configuration
   */
  constructor(config = new BrowserConfig()) {
    logger.debug('Initializing new browser');
    this.config = config;
    this.playwright = null;
    this.playwrightBrowser = null;

    this.disableSecurityArgs = [];
    if (this.config.disableSecurity) {
      this.disableSecurityArgs = [
        '--disable-web-security',
        '--disable-site-isolation-trials',
        '--disable-features=IsolateOrigins,site-per-process',
      ];
    }

    // Stealth mode arguments to avoid detection
    this.stealthArgs = [];
    if (this.config.enableStealth) {
      this.stealthArgs = [
        // Disable automation flags
        '--disable-blink-features=AutomationControlled',
        // Enable features that make the browser appear more human-like
        '--enable-webgl',
        '--use-gl=swiftshader',
        '--enable-accelerated-2d-canvas',
        // Disable features that might reveal automation
        '--disable-features=TranslateUI',
        // Add noise to canvas fingerprinting
        '--disable-reading-from-canvas',
        // Disable notifications
        '--disable-notifications',
        // Disable password saving UI
        '--disable-save-password-bubble',
      ];
    }
  }

  /**
   * Create a browser context
   * @param {BrowserContextConfig} config - Browser context configuration
   * @returns {Promise<BrowserContext>} Browser context
   */
  async newContext(config = new BrowserContextConfig()) {
    return new BrowserContext({ config, browser: this });
  }

  /**
   * Get a Playwright browser
   * @returns {Promise<import('playwright').Browser>} Playwright browser
   */
  async getPlaywrightBrowser() {
    if (this.playwrightBrowser === null) {
      return await this._init();
    }
    return this.playwrightBrowser;
  }

  /**
   * Initialize the browser
   * @returns {Promise<import('playwright').Browser>} Playwright browser
   * @private
   */
  async _init() {
    return await timeExecutionAsync('--init (browser)', async () => {
      // Connect to existing browser if wss_url or cdp_url is provided
      if (this.config.wssUrl) {
        logger.info(`Connecting to browser via WebSocket: ${this.config.wssUrl}`);
        this.playwright = await chromium;
        this.playwrightBrowser = await this.playwright.connect({ wsEndpoint: this.config.wssUrl });
        return this.playwrightBrowser;
      }

      if (this.config.cdpUrl) {
        logger.info(`Connecting to browser via CDP: ${this.config.cdpUrl}`);
        this.playwright = await chromium;
        this.playwrightBrowser = await this.playwright.connectOverCDP({ endpointURL: this.config.cdpUrl });
        return this.playwrightBrowser;
      }

      // Launch new browser
      this.playwright = await chromium;
      
      const launchOptions = {
        headless: this.config.headless,
        args: [
          ...this.disableSecurityArgs,
          ...this.stealthArgs,
          ...this.config.extraChromiumArgs,
        ],
        ignoreDefaultArgs: ['--enable-automation'],
      };

      if (this.config.proxy) {
        launchOptions.proxy = this.config.proxy;
      }

      if (this.config.chromeInstancePath) {
        launchOptions.executablePath = this.config.chromeInstancePath;
      }

      logger.info(`Launching browser with options: ${JSON.stringify(launchOptions)}`);
      this.playwrightBrowser = await this.playwright.launch(launchOptions);
      
      return this.playwrightBrowser;
    });
  }

  /**
   * Close the browser
   * @returns {Promise<void>}
   */
  async close() {
    if (this.config._forceKeepBrowserAlive) {
      logger.info('Browser is forced to stay alive');
      return;
    }

    if (this.playwrightBrowser) {
      logger.info('Closing browser');
      await this.playwrightBrowser.close();
      this.playwrightBrowser = null;
    }

    // Force garbage collection
    global.gc && global.gc();
  }
} 