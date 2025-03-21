/**
 * Browser-Use Browser Context
 * JavaScript ES6 version of context.py
 * 
 * Playwright browser context on steroids.
 */

import { timeExecutionAsync, timeExecutionSync, logger, randomString } from '../utils.js';
import { BrowserError, BrowserState, BrowserStateHistory, TabInfo, URLNotAllowedError } from './views.js';
import { DomService } from '../dom/service.js';
import { HistoryTreeProcessor } from '../dom/history_tree_processor/service.js';
import { DOMElementNode } from '../index.js';

/**
 * Browser context window size
 * @typedef {Object} BrowserContextWindowSize
 * @property {number} width - Window width
 * @property {number} height - Window height
 */

/**
 * Configuration for the BrowserContext
 */
export class BrowserContextConfig {
  /**
   * @param {Object} options - Browser context configuration options
   * @param {string|null} [options.cookiesFile=null] - Path to cookies file for persistence
   * @param {boolean} [options.disableSecurity=true] - Disable browser security features
   * @param {number} [options.minimumWaitPageLoadTime=0.5] - Minimum time to wait before getting page state for LLM input
   * @param {number} [options.waitForNetworkIdlePageLoadTime=1.0] - Time to wait for network requests to finish
   * @param {number} [options.maximumWaitPageLoadTime=5.0] - Maximum time to wait for page load
   * @param {number} [options.waitBetweenActions=1.0] - Time to wait between multiple per step actions
   * @param {BrowserContextWindowSize} [options.browserWindowSize={ width: 1280, height: 1100 }] - Default browser window size
   * @param {boolean} [options.noViewport=false] - Disable viewport
   * @param {string|null} [options.saveRecordingPath=null] - Path to save video recordings
   * @param {string|null} [options.saveDownloadsPath=null] - Path to save downloads to
   * @param {string|null} [options.tracePath=null] - Path to save trace files
   * @param {string|null} [options.locale=null] - Specify user locale
   * @param {string} [options.userAgent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36'] - Custom user agent
   * @param {boolean} [options.highlightElements=true] - Highlight elements in the DOM
   * @param {number} [options.viewportExpansion=500] - Viewport expansion in pixels
   * @param {string[]|null} [options.allowedDomains=null] - List of allowed domains
   * @param {boolean} [options.includeDynamicAttributes=true] - Include dynamic attributes in selectors
   */
  constructor({
    cookiesFile = null,
    disableSecurity = true,
    minimumWaitPageLoadTime = 0.5,
    waitForNetworkIdlePageLoadTime = 1.0,
    maximumWaitPageLoadTime = 5.0,
    waitBetweenActions = 1.0,
    browserWindowSize = { width: 1280, height: 1100 },
    noViewport = false,
    saveRecordingPath = null,
    saveDownloadsPath = null,
    tracePath = null,
    locale = null,
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36',
    highlightElements = true,
    viewportExpansion = 500,
    allowedDomains = null,
    includeDynamicAttributes = true,
  } = {}) {
    this.cookiesFile = cookiesFile;
    this.disableSecurity = disableSecurity;
    this.minimumWaitPageLoadTime = minimumWaitPageLoadTime;
    this.waitForNetworkIdlePageLoadTime = waitForNetworkIdlePageLoadTime;
    this.maximumWaitPageLoadTime = maximumWaitPageLoadTime;
    this.waitBetweenActions = waitBetweenActions;
    this.browserWindowSize = browserWindowSize;
    this.noViewport = noViewport;
    this.saveRecordingPath = saveRecordingPath;
    this.saveDownloadsPath = saveDownloadsPath;
    this.tracePath = tracePath;
    this.locale = locale;
    this.userAgent = userAgent;
    this.highlightElements = highlightElements;
    this.viewportExpansion = viewportExpansion;
    this.allowedDomains = allowedDomains;
    this.includeDynamicAttributes = includeDynamicAttributes;
  }
}

/**
 * Browser context
 */
export class BrowserContext {
  /**
   * @param {Object} params - Parameters
   * @param {BrowserContextConfig} params.config - Browser context configuration
   * @param {import('./browser.js').Browser} params.browser - Browser
   */
  constructor({ config, browser }) {
    this.config = config;
    this.browser = browser;
    this.context = null;
    this.pages = [];
    this.currentPageIndex = 0;
    this.domService = null;
    this.stateHistory = [];
    this.id = randomString(16);
  }

  /**
   * Initialize the browser context
   * @returns {Promise<void>}
   * @private
   */
  async _init() {
    console.log('init');
    return await timeExecutionAsync('--init (browser context)', async () => {
      if (this.context) {
        return;
      }

      const playwrightBrowser = await this.browser.getPlaywrightBrowser();

      // Tạo danh sách các user agent phổ biến
      const commonUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      ];

      // Chọn ngẫu nhiên một user agent
      const randomUserAgent = commonUserAgents[Math.floor(Math.random() * commonUserAgents.length)];

      // Các timezone phổ biến
      const commonTimezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Asia/Ho_Chi_Minh',
        'Asia/Singapore',
        'Europe/Paris',
        'America/Los_Angeles',
      ];

      // Chọn ngẫu nhiên một timezone
      const randomTimezone = commonTimezones[Math.floor(Math.random() * commonTimezones.length)];

      const contextOptions = {
        viewport: this.config.noViewport ? null : this.config.browserWindowSize,
        userAgent: randomUserAgent,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        javaScriptEnabled: true,
        timezoneId: randomTimezone,
        geolocation: { longitude: 105.8342, latitude: 21.0278 }, // Hanoi coordinates
        permissions: ['geolocation'],
        recordVideo: this.config.saveRecordingPath ? {
          dir: this.config.saveRecordingPath,
          size: this.config.browserWindowSize,
        } : undefined,
      };

      // Only add locale if it's a non-empty string
      if (typeof this.config.locale === 'string' && this.config.locale.length > 0) {
        contextOptions.locale = this.config.locale;
      } else {
        // Các locale phổ biến
        const commonLocales = ['en-US', 'en-GB'];
        contextOptions.locale = commonLocales[Math.floor(Math.random() * commonLocales.length)];
      }

      if (this.config.saveDownloadsPath) {
        contextOptions.acceptDownloads = true;
        contextOptions.downloadsPath = this.config.saveDownloadsPath;
      }

      logger.info(`Creating browser context with options: ${JSON.stringify(contextOptions)}`);
      this.context = await playwrightBrowser.newContext(contextOptions);

      // Thêm script để vô hiệu hóa WebDriver và navigator.webdriver
      await this.context.addInitScript(() => {
        // Ghi đè thuộc tính navigator.webdriver để tránh bị phát hiện
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
          configurable: true
        });

        // Ghi đè các phương thức phát hiện automation
        if (window.navigator.permissions) {
          window.navigator.permissions.query = (parameters) => {
            return Promise.resolve({ state: 'prompt', onchange: null });
          };
        }

        // Thêm plugins giả để trông giống trình duyệt thật
        if (navigator.plugins) {
          Object.defineProperty(navigator, 'plugins', {
            get: () => {
              const plugins = [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format' },
                { name: 'Native Client', filename: 'internal-nacl-plugin', description: 'Native Client Executable' }
              ];
              return Object.setPrototypeOf(plugins, Navigator.prototype);
            }
          });
        }

        // Thêm ngôn ngữ giả
        if (navigator.languages) {
          Object.defineProperty(navigator, 'languages', {
            get: () => ['vi-VN', 'vi', 'en-US', 'en'],
          });
        }

        // Ghi đè hàm toString của các hàm để tránh bị phát hiện
        const originalFunctionToString = Function.prototype.toString;
        Function.prototype.toString = function () {
          if (this === Function.prototype.toString) return originalFunctionToString.call(this);
          if (this === navigator.permissions.query) return 'function query() { [native code] }';
          return originalFunctionToString.call(this);
        };
      });

      // Set up event listeners
      this.context.on('page', this._handleNewPage.bind(this));

      // Create initial page
      const page = await this.context.newPage();

      // Khởi tạo this.pages từ context.pages()
      this.pages = this.context.pages();
      this.currentPageIndex = 0;

      // Initialize DOM service
      this.domService = new DomService(page);

      // Start tracing if configured
      if (this.config.tracePath) {
        await this.context.tracing.start({ screenshots: true, snapshots: true });
      }
    });
  }

  /**
   * Handle new page
   * @param {import('playwright').Page} page - New page
   * @private
   */
  async _handleNewPage(page) {
    logger.info(`New page created: ${page.url()}`);
    // Không cần thêm page vào this.pages vì getSession() sẽ tự động cập nhật
    // Chỉ cần cập nhật currentPageIndex
    this.pages = this.context.pages();
    this.currentPageIndex = this.pages.indexOf(page);

    // Cập nhật DomService để trỏ đến trang mới
    this.domService = new DomService(page);
  }

  /**
   * Get or initialize the browser session
   * @returns {Promise<Object>} The browser session
   */
  async getSession() {
    if (!this.context) {
      await this._init();
    }

    // Đồng bộ hóa this.pages với context.pages()
    this.pages = this.context.pages();

    // Đảm bảo currentPageIndex hợp lệ
    if (this.currentPageIndex >= this.pages.length) {
      this.currentPageIndex = this.pages.length - 1;
    }
    if (this.currentPageIndex < 0 && this.pages.length > 0) {
      this.currentPageIndex = 0;
    }

    return {
      context: this.context,
      pages: this.pages,
      currentPageIndex: this.currentPageIndex
    };
  }

  /**
   * Get current page from session
   * @param {Object} session - Browser session
   * @returns {import('playwright').Page} Current page
   * @private
   */
  async _getCurrentPage(session) {
    try {
      // Kiểm tra nếu currentPageIndex không hợp lệ
      if (this.currentPageIndex < 0 || this.currentPageIndex >= session.pages.length) {
        logger.warning(`Invalid currentPageIndex: ${this.currentPageIndex}, resetting to 0`);
        this.currentPageIndex = session.pages.length > 0 ? 0 : 0;
      }

      // Kiểm tra nếu không có trang nào
      if (session.pages.length === 0) {
        logger.warning('No pages available, creating a new page');
        const newPage = await session.context.newPage();
        this.pages = session.context.pages();
        this.currentPageIndex = 0;
        return newPage;
      }

      return session.pages[session.currentPageIndex];
    } catch (error) {
      logger.error(`Error getting current page: ${error.message}`);
      // Tạo trang mới nếu có lỗi
      const newPage = await session.context.newPage();
      this.pages = session.context.pages();
      this.currentPageIndex = this.pages.indexOf(newPage);
      return newPage;
    }
  }

  /**
   * Get current page
   * @returns {Promise<import('playwright').Page>} Current page
   */
  async getCurrentPage() {
    const session = await this.getSession();
    return await this._getCurrentPage(session);
  }

  /**
   * Navigate to URL
   * @param {string} url - URL to navigate to
   * @returns {Promise<void>}
   */
  async goto(url) {
    await this.getSession();

    // Check if URL is allowed
    if (!this._isUrlAllowed(url)) {
      throw new URLNotAllowedError(`Navigation to non-allowed URL: ${url}`);
    }

    const page = await this.getCurrentPage();
    // console.log('goto', page._guid,this.pages.length); process.exit(1);
    logger.info(`Navigating to ${url}`);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: this.config.maximumWaitPageLoadTime * 1000,
    });

    // Wait for network idle
    await this._waitForPageLoad();

    // Check if the loaded URL is allowed
    await this._checkAndHandleNavigation(page);
  }

  /**
   * Wait for page to load
   * @returns {Promise<void>}
   * @private
   */
  async _waitForPageLoad() {
    console.time("waitForPageLoad");
    const page = await this.getCurrentPage();

    // Wait minimum time
    await page.waitForTimeout(this.config.minimumWaitPageLoadTime * 1000);

    try {
      // Wait for network idle
      await page.waitForLoadState('networkidle', {
        timeout: this.config.waitForNetworkIdlePageLoadTime * 1000,
      });
    } catch (error) {
      logger.warning(`Timeout waiting for network idle: ${error.message}`);
    }

    // Wait additional time if needed
    if (this.config.maximumWaitPageLoadTime > this.config.minimumWaitPageLoadTime) {
      const additionalWaitTime = this.config.maximumWaitPageLoadTime - this.config.minimumWaitPageLoadTime;
      await page.waitForTimeout(additionalWaitTime * 1000);
    }
    console.timeEnd("waitForPageLoad");

  }

  /**
   * Check if a URL is allowed based on the whitelist configuration
   * @param {string} url - URL to check
   * @returns {boolean} Whether the URL is allowed
   * @private
   */
  _isUrlAllowed(url) {
    if (!this.config.allowedDomains) {
      return true;
    }

    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname.toLowerCase();

      // Check if domain matches any allowed domain pattern
      return this.config.allowedDomains.some(
        allowedDomain => domain === allowedDomain.toLowerCase() || domain.endsWith('.' + allowedDomain.toLowerCase())
      );
    } catch (e) {
      logger.error(`Error checking URL allowlist: ${e.message}`);
      return false;
    }
  }

  /**
   * Check if current page URL is allowed and handle if not
   * @param {import('playwright').Page} page - Page to check
   * @returns {Promise<void>}
   * @private
   */
  async _checkAndHandleNavigation(page) {
    if (!this._isUrlAllowed(page.url())) {
      logger.warning(`Navigation to non-allowed URL detected: ${page.url()}`);
      try {
        await this.goBack();
      } catch (e) {
        logger.error(`Failed to go back after detecting non-allowed URL: ${e.message}`);
      }
      throw new URLNotAllowedError(`Navigation to non-allowed URL: ${page.url()}`);
    }
  }

  /**
   * Get browser state
   * @param {Object} options - Options
   * @param {boolean} [options.includeScreenshot=false] - Include screenshot
   * @returns {Promise<BrowserState>} Browser state
   */
  async getState({ includeScreenshot = true } = {}) {
    console.log("getStateeeeeeeeeeeeeeeeeeeeee");
    return await timeExecutionAsync('--get_state', async () => {
      await this.getSession();
      const page = await this.getCurrentPage();
    
      // Đảm bảo DomService luôn được cập nhật với trang hiện tại
      this.domService = new DomService(page);

      // Wait for page to load
      await this._waitForPageLoad();

      try {
        // Get DOM state
        await this.removeHighlights();
        const domState = await this.domService.getClickableElements(
          this.config.highlightElements,
          -1,
          this.config.viewportExpansion,

        );

        // Get tabs info
        const tabs = await this._getTabsInfo();

        // Get screenshot if requested
        let screenshot = null;
        if (includeScreenshot) {
          screenshot = await this._takeScreenshot();
        }

        // Get page info
        const url = page.url();
        const title = await page.title();

        // Get scroll info
        const [pixelsAbove, pixelsBelow] = await this._getScrollInfo();

        return new BrowserState({
          elementTree: domState.elementTree,
          selectorMap: domState.selectorMap,
          url,
          title,
          tabs,
          screenshot,
          pixelsAbove,
          pixelsBelow,
          browserErrors: [],
        });
      } catch (error) {
        logger.error(`Error getting browser state: ${error.message}`);
        // Trả về trạng thái tối thiểu nếu có lỗi
        return new BrowserState({
          elementTree: new DOMElementNode(),
          selectorMap: {},
          url: page.url(),
          title: await page.title(),
          tabs: await this._getTabsInfo(),
          screenshot: null,
          pixelsAbove: 0,
          pixelsBelow: 0,
          browserErrors: [new BrowserError(error.message)],
        });
      }
    });
  }

  /**
   * Get tabs info
   * @returns {Promise<TabInfo[]>} Tabs info
   * @private
   */
  async _getTabsInfo() {
    // Đảm bảo this.pages đã được đồng bộ với context.pages()
    await this.getSession();

    const tabs = [];

    for (let i = 0; i < this.pages.length; i++) {
      const page = this.pages[i];
      try {
        const url = page.url();
        const title = await page.title();
        tabs.push(new TabInfo(i, url, title));
      } catch (e) {
        logger.error(`Error getting tab info: ${e.message}`);
      }
    }

    return tabs;
  }

  /**
   * Take screenshot
   * @param {boolean} [fullPage=false] - Whether to take a screenshot of the full page
   * @returns {Promise<string>} Base64 encoded screenshot
   * @private
   */
  async _takeScreenshot(fullPage = false) {
    const page = await this.getCurrentPage();

    try {
      const buffer = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage
      });
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (e) {
      logger.error(`Error taking screenshot: ${e.message}`);
      return null;
    }
  }

  /**
   * Click element
   * @param {number} highlightIndex - Highlight index
   * @returns {Promise<void>}
   */
  async clickElement(highlightIndex) {
    return await timeExecutionAsync('--click_element', async () => {
      await this.getSession();

      logger.info(`Clicking element with highlight index ${highlightIndex}`);
      const element = await this.domService.getElementByHighlightIndex(highlightIndex);

      if (!element) {
        throw new BrowserError(`Element with highlight index ${highlightIndex} not found`);
      }

      // Save state before click
      const state = await this.getState();
      const domElement = state.selectorMap[highlightIndex];

      if (domElement) {
        const historyElement = HistoryTreeProcessor.convertDomElementToHistoryElement(domElement);

        // Add to history
        this.stateHistory.push(new BrowserStateHistory(
          state.url,
          state.title,
          state.tabs,
          [historyElement],
          state.screenshot
        ));
      }

      try {
        // Click the element
        await element.click();

        // Wait for page to load
        await this._waitForPageLoad();

        // Cập nhật DomService sau khi click, vì trang có thể đã thay đổi
        const page = await this.getCurrentPage();
        this.domService = new DomService(page);
      } catch (error) {
        logger.error(`Error clicking element: ${error.message}`);
        // Cập nhật DomService ngay cả khi có lỗi
        const page = await this.getCurrentPage();
        this.domService = new DomService(page);
        throw error;
      }
    });
  }

  /**
   * Input text
   * @param {number} highlightIndex - Highlight index
   * @param {string} text - Text to input
   * @returns {Promise<void>}
   */
  async inputText(highlightIndex, text) {
    console.log('inputText', highlightIndex, text); //process.exit(1)
    return await timeExecutionAsync('--input_text', async () => {
      await this.getSession();

      logger.info(`Inputting text to element with highlight index ${highlightIndex}`);
      const element = await this.domService.getElementByHighlightIndex(highlightIndex);

      if (!element) {
        throw new BrowserError(`Element with highlight index ${highlightIndex} not found`);
      }
      console.log('inputText', text);// process.exit(1)
      // Clear existing text
      await element.fill(text);

      // Type text
      // await element.type(text);

      // Wait a bit
      await (await this.getCurrentPage()).waitForTimeout(500);
    });
  }

  /**
   * Go back
   * @returns {Promise<void>}
   */
  async goBack() {
    await this.getSession();
    const page = await this.getCurrentPage();

    logger.info('Going back');
    await page.goBack();

    // Wait for page to load
    await this._waitForPageLoad();
  }

  /**
   * Go forward
   * @returns {Promise<void>}
   */
  async goForward() {
    await this.getSession();
    const page = await this.getCurrentPage();

    logger.info('Going forward');
    await page.goForward();

    // Wait for page to load
    await this._waitForPageLoad();
  }

  /**
   * Refresh the current page
   * @returns {Promise<void>}
   */
  async refreshPage() {
    await this.getSession();
    const page = await this.getCurrentPage();

    logger.info('Refreshing page');
    await page.reload();

    // Wait for page to load
    await this._waitForPageLoad();
  }

  /**
   * Open new tab
   * @param {string|null} [url=null] - URL to navigate to
   * @returns {Promise<void>}
   */
  async openNewTab(url = null) {
    await this.getSession();

    // Check if URL is allowed
    if (url && !this._isUrlAllowed(url)) {
      throw new URLNotAllowedError(`Cannot create new tab with non-allowed URL: ${url}`);
    }

    logger.info('Opening new tab');
    const page = await this.context.newPage();

    // Cập nhật currentPageIndex để trỏ đến trang mới
    this.pages = this.context.pages();
    this.currentPageIndex = this.pages.indexOf(page);

    // Update DOM service
    this.domService = new DomService(page);

    // Navigate to URL if provided
    if (url) {
      await page.goto(url);
      await this._waitForPageLoad();
    }
  }

  /**
   * Switch to tab
   * @param {number} tabIndex - Tab index
   * @returns {Promise<void>}
   */
  async switchToTab(tabIndex) {
    await this.getSession();

    if (tabIndex < 0 || tabIndex >= this.pages.length) {
      throw new BrowserError(`Tab index ${tabIndex} out of range`);
    }

    // Check if the tab's URL is allowed
    if (!this._isUrlAllowed(this.pages[tabIndex].url())) {
      throw new URLNotAllowedError(`Cannot switch to tab with non-allowed URL: ${this.pages[tabIndex].url()}`);
    }

    logger.info(`Switching to tab ${tabIndex}`);
    this.currentPageIndex = tabIndex;

    // Update DOM service
    this.domService = new DomService(this.pages[tabIndex]);
  }

  /**
   * Close current tab
   * @returns {Promise<void>}
   */
  async closeCurrentTab() {
    await this.getSession();

    if (this.pages.length <= 1) {
      logger.warn('Cannot close the last tab');
      return;
    }

    const page = await this.getCurrentPage();
    logger.info('Closing current tab');
    await page.close();

    // Cập nhật pages và currentPageIndex sau khi đóng trang
    this.pages = this.context.pages();

    // Đảm bảo currentPageIndex hợp lệ
    if (this.currentPageIndex >= this.pages.length) {
      this.currentPageIndex = this.pages.length - 1;
    }

    // Update DOM service
    this.domService = new DomService(this.pages[this.currentPageIndex]);
  }

  /**
   * Get the HTML content of the current page
   * @returns {Promise<string>} HTML content
   */
  async getPageHtml() {
    await this.getSession();
    const page = await this.getCurrentPage();

    return await page.content();
  }

  /**
   * Execute JavaScript on the current page
   * @param {string} script - JavaScript code to execute
   * @returns {Promise<any>} Result of the script execution
   */
  async executeJavaScript(script) {
    await this.getSession();
    const page = await this.getCurrentPage();

    return await page.evaluate(script);
  }

  /**
   * Get scroll position information for the current page
   * @returns {Promise<[number, number]>} [pixelsAbove, pixelsBelow]
   * @private
   */
  async _getScrollInfo() {
    const page = await this.getCurrentPage();

    const scrollY = await page.evaluate('window.scrollY');
    const viewportHeight = await page.evaluate('window.innerHeight');
    const totalHeight = await page.evaluate('document.documentElement.scrollHeight');

    const pixelsAbove = scrollY;
    const pixelsBelow = totalHeight - (scrollY + viewportHeight);

    return [pixelsAbove, pixelsBelow];
  }

  /**
   * Save cookies to file
   * @returns {Promise<void>}
   */
  async saveCookies() {
    if (!this.context || !this.config.cookiesFile) {
      return;
    }

    try {
      const cookies = await this.context.cookies();
      logger.debug(`Saving ${cookies.length} cookies to ${this.config.cookiesFile}`);

      // Use Node.js fs module to write cookies to file
      const fs = await import('fs');
      const path = await import('path');

      // Create directory if it doesn't exist
      const dirname = path.dirname(this.config.cookiesFile);
      if (dirname) {
        fs.mkdirSync(dirname, { recursive: true });
      }

      fs.writeFileSync(this.config.cookiesFile, JSON.stringify(cookies, null, 2));
    } catch (e) {
      logger.warn(`Failed to save cookies: ${e.message}`);
    }
  }

  /**
   * Reset the browser context
   * @returns {Promise<void>}
   */
  async resetContext() {
    await this.getSession();

    // Close all tabs
    for (const page of this.pages) {
      await page.close();
    }

    // Đặt lại mảng pages và stateHistory
    this.stateHistory = [];

    // Create a new page
    const page = await this.context.newPage();

    // Đồng bộ this.pages với context.pages()
    this.pages = this.context.pages();
    this.currentPageIndex = 0;

    // Update DOM service
    this.domService = new DomService(page);
  }

  /**
   * Remove highlights from the page
   * @returns {Promise<void>}
   */
  async removeHighlights() {
    console.log("removeHighlights");
    try {
      const page = await this.getCurrentPage();
      await page.evaluate(`
        try {
          // Remove the highlight container and all its contents
          const container = document.getElementById('playwright-highlight-container');
          if (container) {
            container.remove();
          }

          // Remove highlight attributes from elements
          const highlightedElements = document.querySelectorAll('[browser-user-highlight-id^="playwright-highlight-"]');
          highlightedElements.forEach(el => {
            el.removeAttribute('browser-user-highlight-id');
          });
        } catch (e) {
          console.error('Failed to remove highlights:', e);
        }
      `);
    } catch (e) {
      logger.debug(`Failed to remove highlights (this is usually ok): ${e.message}`);
    }
  }

  /**
   * Close
   * @returns {Promise<void>}
   */
  async close() {
    if (this.context) {
      logger.info('Closing browser context');

      // Save cookies if configured
      if (this.config.cookiesFile) {
        await this.saveCookies();
      }

      // Stop tracing if configured
      if (this.config.tracePath) {
        try {
          await this.context.tracing.stop({
            path: `${this.config.tracePath}/${this.id}.zip`,
          });
        } catch (e) {
          logger.error(`Error stopping tracing: ${e.message}`);
        }
      }

      await this.context.close();
      this.context = null;
      this.pages = [];
      this.currentPageIndex = 0;
      this.domService = null;
    }
  }
} 