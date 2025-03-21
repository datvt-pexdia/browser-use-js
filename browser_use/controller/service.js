/**
 * Browser-Use Controller Service
 * JavaScript ES6 version of service.py
 */

import { timeExecutionAsync, logger } from '../utils.js';
import {
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
  ExtractLinksAction,
  SelectOptionAction
} from './views.js';
import { BrowserError } from '../browser/views.js';
import { ControllerRegistry } from './registry/service.js';
import { ActionResult } from '../index.js';
import { convert } from 'html-to-text';
import axios from 'axios';

/**
 * Controller for browser actions
 */
export class Controller {
  /**
   * @param {Object} options - Options
   * @param {import('../browser/context.js').BrowserContext} options.context - Browser context
   * @param {import('../telemetry/service.js').ProductTelemetry|null} [options.telemetry=null] - Telemetry
   */
  constructor({ context, telemetry = null }) {
    this.browserContext = context;
    this.actionRegistry = this._setupActionRegistry();
    this.registry = new ControllerRegistry({ controller: this, telemetry });
  }

  /**
   * Set up action registry
   * @returns {Object} Action registry
   * @private
   */
  _setupActionRegistry() {
    return {
      'search_google': {
        action: this.searchGoogle.bind(this),
        model: SearchGoogleAction
      },
      'go_to_url': {
        action: this.goToUrl.bind(this),
        model: GoToUrlAction
      },
      'click_element': {
        action: this.clickElement.bind(this),
        model: ClickElementAction
      },
      'input_text': {
        action: this.inputText.bind(this),
        model: InputTextAction
      },
      'done': {
        action: this.done.bind(this),
        model: DoneAction
      },
      'switch_tab': {
        action: this.switchTab.bind(this),
        model: SwitchTabAction
      },
      'open_tab': {
        action: this.openTab.bind(this),
        model: OpenTabAction
      },
      'scroll': {
        action: this.scroll.bind(this),
        model: ScrollAction
      },
      'send_keys': {
        action: this.sendKeys.bind(this),
        model: SendKeysAction
      },
      'extract_page_content': {
        action: this.extractPageContent.bind(this),
        model: ExtractPageContentAction
      },
      'go_back': {
        action: this.goBack.bind(this),
        model: NoParamsAction
      },
      'go_forward': {
        action: this.goForward.bind(this),
        model: NoParamsAction
      },
      'refresh_page': {
        action: this.refreshPage.bind(this),
        model: NoParamsAction
      },
      'extract_links': {
        action: this.extractLinks.bind(this),
        model: ExtractLinksAction
      },
      'select_option': {
        action: this.selectOption.bind(this),
        model: SelectOptionAction
      }
    };
  }

  /**
   * Get registered actions
   * @returns {Object} Registered actions
   */
  getRegisteredActions() {
    return Object.keys(this.actionRegistry).reduce((acc, key) => {
      acc[key] = this.actionRegistry[key].model;
      return acc;
    }, {});
  }

  /**
   * Execute action
   * @param {string} actionName - Action name
   * @param {Object} actionData - Action data
   * @returns {Promise<any>} Action result
   */
  async executeAction(actionName, actionData) {
    return await timeExecutionAsync('--execute_action', async () => {
      logger.info(`Executing action: ${actionName}`);

      if (!this.actionRegistry[actionName]) {
        throw new BrowserError(`Unknown action: ${actionName}`);
      }

      const { action, model } = this.actionRegistry[actionName];

      // Validate action data
      const actionModel = new model(actionData);
      console.log({ action, model }, actionData, actionModel.validate()); //process.exit(1);

      if (!actionModel.validate()) {
        throw new BrowserError(`Invalid action data for ${actionName}: ${JSON.stringify(actionData)}`);
      }

      // Execute action
      return await action(actionModel);
    });
  }

  /**
   * Hiển thị kết quả tìm kiếm trên trang
   * @param {import('playwright').Page} page - Trang hiện tại
   * @param {string} query - Từ khóa tìm kiếm
   * @param {Array} items - Danh sách kết quả
   * @returns {Promise<void>}
   */
  async displaySearchResults(page, query, items) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Search Results: ${query}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
          }
          h1 {
            color: #1a73e8;
            margin-bottom: 5px;
          }
          .summary {
            color: #666;
            font-size: 16px;
            margin-bottom: 20px;
          }
          .search-result {
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
          }
          .search-result:last-child {
            border-bottom: none;
          }
          .result-title {
            font-size: 18px;
            margin-bottom: 5px;
          }
          .result-title a {
            color: #1a0dab;
            text-decoration: none;
          }
          .result-title a:hover {
            text-decoration: underline;
          }
          .result-url {
            color: #006621;
            font-size: 14px;
            margin-bottom: 5px;
          }
          .result-snippet {
            color: #545454;
            font-size: 14px;
            margin-bottom: 10px;
          }
          .pagemap {
            font-size: 12px;
            background-color: #f8f8f8;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 8px;
            margin-top: 8px;
          }
          .pagemap-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #666;
          }
          .pagemap-data {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .pagemap-item {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 3px;
            padding: 5px 8px;
          }
          .pagemap-toggle {
            color: #1a73e8;
            background: none;
            border: none;
            cursor: pointer;
            text-decoration: underline;
            padding: 0;
            font-size: 12px;
            margin-top: 5px;
          }
          .json-container {
            margin-top: 30px;
            padding: 15px;
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 4px;
            display: none;
          }
          .toggle-json {
            background-color: #1a73e8;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 20px;
          }
          .toggle-json:hover {
            background-color: #1558c4;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .hidden {
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>Search Results: ${query}</h1>
            <div class="summary">Found ${items.length} results</div>
          </header>
          
          <div class="results">
            ${items.map(item => {
      // Xử lý pagemap nếu có
      let pagemapHtml = '';
      if (item.pagemap) {
        const pagemapTypes = Object.keys(item.pagemap);
        if (pagemapTypes.length > 0) {
          pagemapHtml = `
                    <div class="pagemap">
                      <div class="pagemap-title">Additional Information:</div>
                      <div class="pagemap-data" id="pagemap-preview-${item.link.replace(/[^a-zA-Z0-9]/g, '_')}">
                        ${getPreviewPagemap(item.pagemap)}
                      </div>
                      <div class="pagemap-data hidden" id="pagemap-full-${item.link.replace(/[^a-zA-Z0-9]/g, '_')}">
                        ${getFullPagemap(item.pagemap)}
                      </div>
                      <button class="pagemap-toggle" onclick="togglePagemap('${item.link.replace(/[^a-zA-Z0-9]/g, '_')}')">
                        Show more
                      </button>
                    </div>
                  `;
        }
      }

      return `
                <div class="search-result">
                  <div class="result-title">
                    <a href="${item.link}" target="_blank">${item.title}</a>
                  </div>
                  <div class="result-url">${item.link}</div>
                  <div class="result-snippet">${item.snippet}</div>
                  ${pagemapHtml}
                </div>
              `;
    }).join('')}
          </div>
          
          <button class="toggle-json" onclick="toggleJson()">Show Raw JSON</button>
          
          <div class="json-container" id="jsonContainer">
            <pre>${JSON.stringify({
      query,
      totalResults: items.length,
      items: items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        pagemap: item.pagemap || null,
      }))
    }, null, 2)}</pre>
          </div>
        </div>
        
        <script>
          function toggleJson() {
            const container = document.getElementById('jsonContainer');
            const button = document.querySelector('.toggle-json');
            if (container.style.display === 'none' || container.style.display === '') {
              container.style.display = 'block';
              button.textContent = 'Hide Raw JSON';
            } else {
              container.style.display = 'none';
              button.textContent = 'Show Raw JSON';
            }
          }
          
          function togglePagemap(id) {
            const previewElem = document.getElementById('pagemap-preview-' + id);
            const fullElem = document.getElementById('pagemap-full-' + id);
            const button = previewElem.parentElement.querySelector('.pagemap-toggle');
            
            if (previewElem.classList.contains('hidden')) {
              previewElem.classList.remove('hidden');
              fullElem.classList.add('hidden');
              button.textContent = 'Show more';
            } else {
              previewElem.classList.add('hidden');
              fullElem.classList.remove('hidden');
              button.textContent = 'Show less';
            }
          }
        </script>
      </body>
      </html>
    `;

    // Hiển thị kết quả trên trang
    await page.setContent(htmlContent);

    // Hàm helper để tạo preview pagemap
    function getPreviewPagemap(pagemap) {
      // Hiển thị tối đa 3 loại pagemap
      const types = Object.keys(pagemap).slice(0, 3);
      return types.map(type => {
        const count = pagemap[type].length;
        return `<div class="pagemap-item">${type} (${count})</div>`;
      }).join('');
    }

    // Hàm helper để tạo full pagemap
    function getFullPagemap(pagemap) {
      // Hiển thị tất cả các loại pagemap và thông tin chi tiết
      return Object.entries(pagemap).map(([type, items]) => {
        return `
          <div style="margin-bottom: 10px; width: 100%;">
            <div style="font-weight: bold;">${type} (${items.length}):</div>
            <div style="margin-left: 10px;">
              ${items.map(item => {
          // Hiển thị các thuộc tính chính của mỗi item
          const properties = Object.entries(item)
            .filter(([key, value]) => value && typeof value !== 'object')
            .slice(0, 5)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          return `<div>${properties}</div>`;
        }).join('')}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  /**
   * Search Google
   * @param {SearchGoogleAction} model - Search Google action model
   * @returns {Promise<ActionResult>}
   */
  async searchGoogle(model) {
    return await timeExecutionAsync('--search_google', async () => {
      try {
        // Sử dụng Google Search API thay vì truy cập trực tiếp qua trình duyệt
        const baseURL = 'https://www.googleapis.com/customsearch/v1';

        // Lấy API keys từ biến môi trường
        const API_KEY = process.env.GOOGLE_API_KEY;
        const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!API_KEY || !SEARCH_ENGINE_ID) {
          throw new Error('Missing required environment variables: GOOGLE_API_KEY and/or GOOGLE_SEARCH_ENGINE_ID');
        }

        const params = {
          key: API_KEY,
          cx: SEARCH_ENGINE_ID,
          q: model.query,
        };

        logger.info(`Searching Google API for: "${model.query}"`);
        const response = await axios.get(baseURL, { params });
        const items = response.data.items || [];

        // Tạo kết quả dạng JSON
        const searchResults = {
          query: model.query,
          totalResults: items.length,
          items: items.map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            // Thêm pagemap nếu có
            pagemap: item.pagemap || null,
          }))
        };

        // Hiển thị kết quả trên trang
        const page = await this.browserContext.getCurrentPage();
        await this.displaySearchResults(page, model.query, items);

        // Tạo phần summary cho extractedContent (chỉ giữ introText và summaryText)
        const introText = `🔍 Search results for query: "${model.query}"\n`;
        const summaryText = `Found ${items.length} results from Google Search API.`;

        // Kết hợp phần giới thiệu và tóm tắt
        const extractedContent = introText + summaryText;

        logger.info(`Search completed - Found ${items.length} results`);

        return new ActionResult({
          success: true,
          isDone: false,
          extractedContent: extractedContent,
          searchResults: items,
          includeInMemory: true
        });
      } catch (error) {
        logger.error(`Error during API search: ${error.message}`);
        return new ActionResult({
          success: false,
          isDone: false,
          error: `Failed to search Google API: ${error.message}`,
          includeInMemory: true
        });
      }
    });
  }

  /**
   * Go to URL
   * @param {GoToUrlAction} model - Go to URL action model
   * @returns {Promise<ActionResult>}
   */
  async goToUrl(model) {
    return await timeExecutionAsync('--go_to_url', async () => {
      try {
        await this.browserContext.goto(model.url);

        // Thêm hành vi giống người dùng thật sau khi tải trang
        const page = await this.browserContext.getCurrentPage();
        await page.waitForTimeout(500 + Math.random() * 1000);

        if (Math.random() > 0.5) {
          const scrollAmount = 100 + Math.random() * 300;
          await page.evaluate((scrollY) => {
            window.scrollBy(0, scrollY);
          }, scrollAmount);
          await page.waitForTimeout(300 + Math.random() * 500);
        }

        const msg = `🔗  Navigated to ${model.url}`;
        logger.info(msg);
        return new ActionResult({
          success: true,
          isDone: false,
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        logger.error(`Error navigating to URL: ${error.message}`);
        return new ActionResult({
          success: false,
          isDone: false,
          error: `Failed to navigate to ${model.url}: ${error.message}`,
          includeInMemory: true
        });
      }
    });
  }

  /**
   * Click element
   * @param {ClickElementAction} model - Click element action model
   * @returns {Promise<ActionResult>}
   */
  async clickElement(model) {
    return await timeExecutionAsync('--click_element', async () => {
      try {
        const element = model.xpath
          ? await this.browserContext.domService.getElementByXPath(model.xpath)
          : await this.browserContext.domService.getElementByHighlightIndex(model.index);

        if (!element) {
          throw new BrowserError(`Element not found: ${model.xpath || `highlight index ${model.index}`}`);
        }
        const elementText = await element.textContent() || 'element';
        await this.browserContext.clickElement(model.index);
        const msg = `🖱️  Clicked ${elementText} with index ${model.index}`;
        logger.info(msg);
        return new ActionResult({
          success: true,
          isDone: false,
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        logger.error(`Error clicking element: ${error.message}`);
        return new ActionResult({
          success: false,
          isDone: false,
          error: `Failed to click element: ${error.message}`,
          includeInMemory: true
        });
      }
    });
  }

  /**
   * Input text
   * @param {InputTextAction} model - Input text action model
   * @returns {Promise<ActionResult>}
   */
  async inputText(model) {
    return await timeExecutionAsync('--input_text', async () => {
      try {
        const element = model.xpath
          ? await this.browserContext.domService.getElementByXPath(model.xpath)
          : await this.browserContext.domService.getElementByHighlightIndex(model.index);

        if (!element) {
          throw new BrowserError(`Element not found: ${model.xpath || `highlight index ${model.index}`}`);
        }

        const page = await this.browserContext.getCurrentPage();
        await page.mouse.move(100 + Math.random() * 100, 100 + Math.random() * 100);
        await page.waitForTimeout(300 + Math.random() * 500);
        await element.hover({ force: true });
        await page.waitForTimeout(200 + Math.random() * 300);
        await element.click();
        await this.browserContext.inputText(model.index, model.text);
        await this.browserContext._waitForPageLoad();

        const msg = `⌨️  Input ${model.text} into index ${model.index}`;
        logger.info(msg);
        return new ActionResult({
          success: true,
          isDone: false,
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        return new ActionResult({
          success: false,
          isDone: false,
          error: `Failed to type to element: ${error.message}`,
          includeInMemory: true
        });
      }
    });
  }

  /**
   * Switch tab
   * @param {SwitchTabAction} model - Switch tab action model
   * @returns {Promise<ActionResult>}
   */
  async switchTab(model) {
    return await timeExecutionAsync('--switch_tab', async () => {
      try {
        await this.browserContext.switchToTab(model.page_id);
        const page = await this.browserContext.getCurrentPage();
        await page.waitForLoadState();
        const msg = `🔄  Switched to tab ${model.page_id}`;
        logger.info(msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        return new ActionResult({
          error: error.message
        });
      }
    });
  }

  /**
   * Open tab
   * @param {OpenTabAction} model - Open tab action model
   * @returns {Promise<ActionResult>}
   */
  async openTab(model) {
    return await timeExecutionAsync('--open_tab', async () => {
      try {
        await this.browserContext.createNewTab(model.url);
        const msg = `🔗  Opened new tab with ${model.url}`;
        logger.info(msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        return new ActionResult({
          error: error.message
        });
      }
    });
  }

  /**
   * Scroll
   * @param {ScrollAction} model - Scroll action model
   * @returns {Promise<ActionResult>}
   */
  async scroll(model) {
    return await timeExecutionAsync('--scroll', async () => {
      try {
        const page = await this.browserContext.getCurrentPage();
        if (model.amount !== null) {
          await page.evaluate(`window.scrollBy(0, ${model.amount});`);
        } else {
          await page.evaluate('window.scrollBy(0, window.innerHeight);');
        }

        const amount = model.amount !== null ? `${model.amount} pixels` : 'one page';
        const msg = `🔍  Scrolled down the page by ${amount}`;
        logger.info(msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        return new ActionResult({
          error: error.message
        });
      }
    });
  }

  /**
   * Send keys
   * @param {SendKeysAction} model - Send keys action model
   * @returns {Promise<ActionResult>}
   */
  async sendKeys(model) {
    return await timeExecutionAsync('--send_keys', async () => {
      try {
        const page = await this.browserContext.getCurrentPage();
        try {
          await page.keyboard.press(model.keys);
        } catch (error) {
          if (error.message.includes('Unknown key')) {
            for (const key of model.keys) {
              await page.keyboard.press(key);
            }
          } else {
            throw error;
          }
        }
        const msg = `⌨️  Sent keys: ${model.keys}`;
        logger.info(msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        return new ActionResult({
          error: error.message
        });
      }
    });
  }

  /**
   * Extract page content
   * @param {ExtractPageContentAction} model - Extract page content action model
   * @param  pageExtractionLlm - LLM model for content extraction
   * @returns {Promise<ActionResult>}
   */
  async extractPageContent(model, pageExtractionLlm) {
    return await timeExecutionAsync('--extract_page_content', async () => {
      try {
        const page = await this.browserContext.getCurrentPage();
        const content = await page.content();

        // Sử dụng html-to-text để chuyển đổi HTML sang text với các tùy chọn
        const textContent = convert(content, {
          wordwrap: 130,
          // Giữ lại thông tin về các liên kết
          selectors: [
            { selector: 'a', options: { hideLinkHrefIfSameAsText: false, ignoreHref: false, linkBrackets: ['[', ']'] } },
            { selector: 'img', format: 'skip' }, // Bỏ qua hình ảnh
            { selector: 'table', format: 'dataTable' }, // Định dạng bảng
          ],
          // Giữ lại định dạng
          formatters: {
            // Tùy chỉnh định dạng liên kết để dễ đọc hơn
            'linkFormatter': function (elem, walk, builder, formatOptions) {
              const href = elem.attribs.href || '';
              const text = formatOptions.getText(elem, walk, builder);
              if (href && text) {
                builder.addInline(`${text} [${href}]`);
              } else if (text) {
                builder.addInline(text);
              }
            }
          }
        });

        // Nếu có goal, sử dụng LLM để trích xuất thông tin liên quan
        if (model.goal && pageExtractionLlm) {
          try {
            const prompt = `Your task is to extract the content of the page. You will be given a page and a goal and you should extract all relevant information around this goal from the page. If the goal is vague, summarize the page. Respond in json format. Extraction goal: ${model.goal}, Page: ${textContent}`;

            const output = await pageExtractionLlm.invoke(prompt);
            const msg = `📄  Extracted from page\n: ${output.content}\n`;
            logger.info(msg);
            return new ActionResult({
              success: true,
              isDone: false,
              extractedContent: msg,
              includeInMemory: true
            });
          } catch (llmError) {
            logger.warning(`Error using LLM for extraction: ${llmError.message}. Falling back to raw content.`);
            const msg = `📄  Extracted from page (LLM extraction failed)\n: ${textContent}\n`;
            logger.info(msg);
            return new ActionResult({
              success: true, // Still consider it a success since we have fallback content
              isDone: false,
              extractedContent: msg,
              error: `LLM extraction failed: ${llmError.message}`,
              includeInMemory: true
            });
          }
        } else {
          // Nếu không có goal hoặc không có LLM, trả về toàn bộ nội dung đã chuyển đổi
          const msg = `📄  Extracted from page\n: ${textContent}\n`;
          logger.info(msg);
          return new ActionResult({
            success: true,
            isDone: false,
            extractedContent: msg,
            includeInMemory: true
          });
        }
      } catch (error) {
        logger.error(`Error extracting page content: ${error.message}`);
        return new ActionResult({
          success: false,
          isDone: false,
          error: `Failed to extract page content: ${error.message}`,
          includeInMemory: true
        });
      }
    });
  }

  /**
   * Go back
   * @param {NoParamsAction} model - Go back action model
   * @returns {Promise<ActionResult>}
   */
  async goBack(model) {
    return await timeExecutionAsync('--go_back', async () => {
      try {
        await this.browserContext.goBack();
        const msg = '🔙  Navigated back';
        logger.info(msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        return new ActionResult({
          error: error.message
        });
      }
    });
  }

  /**
   * Go forward
   * @param {NoParamsAction} model - Go forward action model
   * @returns {Promise<ActionResult>}
   */
  async goForward(model) {
    return await timeExecutionAsync('--go_forward', async () => {
      try {
        const page = await this.browserContext.getCurrentPage();
        await page.goForward();
        const msg = '➡️  Navigated forward';
        logger.info(msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        return new ActionResult({
          error: error.message
        });
      }
    });
  }

  /**
   * Refresh page
   * @param {NoParamsAction} model - Refresh page action model
   * @returns {Promise<ActionResult>}
   */
  async refreshPage(model) {
    return await timeExecutionAsync('--refresh_page', async () => {
      try {
        const page = await this.browserContext.getCurrentPage();
        await page.reload();
        const msg = '🔄  Page refreshed';
        logger.info(msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        return new ActionResult({
          error: error.message
        });
      }
    });
  }

  /**
   * Done action
   * @param {DoneAction} model - Done action model
   * @returns {Promise<ActionResult>}
   */
  async done(model) {
    return await timeExecutionAsync('--done', async () => {
      try {
        const msg = `Task completed with status: ${model.success ? 'Success' : 'Failure'}\nResult: ${model.text}`;
        logger.info(msg);
        return new ActionResult({
          success: model.success,
          isDone: true,
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        logger.error(`Error in done action: ${error.message}`);
        return new ActionResult({
          success: false,
          isDone: true,
          error: `Error in done action: ${error.message}`,
          includeInMemory: true
        });
      }
    });
  }

  /**
   * Extract links from page
   * @param {ExtractLinksAction} model - Extract links action model
   * @returns {Promise<ActionResult>}
   */
  async extractLinks(model) {
    return await timeExecutionAsync('--extract_links', async () => {
      try {
        const page = await this.browserContext.getCurrentPage();

        // Get all links using page.evaluate()
        const links = await page.evaluate(() => {
          const linkElements = document.querySelectorAll('a');
          return Array.from(linkElements).map(link => ({
            text: link.textContent.trim(),
            url: link.href,
            title: link.getAttribute('title') || '',
            // Add additional metadata that might be useful
            ariaLabel: link.getAttribute('aria-label') || '',
            className: link.className
          })).filter(link => link.url && link.text);
        });

        // Filter links based on goal if provided
        let filteredLinks = links;
        // if (model.goal) {
        //   // Use regex or string matching for basic filtering
        //   const goalLower = model.goal.toLowerCase();
        //   filteredLinks = links.filter(link => {
        //     const textLower = link.text.toLowerCase();
        //     const titleLower = link.title.toLowerCase();
        //     const ariaLower = link.ariaLabel.toLowerCase();
        //     return textLower.includes(goalLower) || 
        //            titleLower.includes(goalLower) || 
        //            ariaLower.includes(goalLower);
        //   });
        // }

        // Format the output message
        const msg = `🔗 Extracted ${filteredLinks.length} links: ${JSON.stringify(filteredLinks)}`;
        logger.info(msg);

        return new ActionResult({
          success: true,
          isDone: false,
          extractedContent: msg,
          includeInMemory: true,
          // Include raw links data for the AI to process
          links: filteredLinks
        });
      } catch (error) {
        logger.error(`Error extracting links: ${error.message}`);
        return new ActionResult({
          success: false,
          isDone: false,
          error: `Failed to extract links: ${error.message}`,
          includeInMemory: true
        });
      }
    });
  }

  /**
   * Select option from dropdown
   * @param {SelectOptionAction} model - Select option action model
   * @returns {Promise<ActionResult>}
   */
  async selectOption(model) {
    return await timeExecutionAsync('--select_option', async () => {
      try {
        // Get the select element
        const element = model.xpath
          ? await this.browserContext.domService.getElementByXPath(model.xpath)
          : await this.browserContext.domService.getElementByHighlightIndex(model.index);

        if (!element) {
          throw new BrowserError(`Select element not found: ${model.xpath || `highlight index ${model.index}`}`);
        }

        // Check if it's actually a select element
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        if (tagName !== 'select') {
          throw new BrowserError(`Element is not a <select>: ${tagName}`);
        }

        const page = await this.browserContext.getCurrentPage();

        // First click the select to open it
        await element.click();
        await page.waitForTimeout(200 + Math.random() * 300);

        // Select the option based on text or value
        let success = false;

        if (model.value !== null) {
          // Select by value
          success = await element.evaluate((el, value) => {
            for (const option of el.options) {
              if (option.value === value) {
                el.value = value;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
            }
            return false;
          }, model.value);
        } else if (model.text !== null) {
          // Select by text content
          success = await element.evaluate((el, text) => {
            for (const option of el.options) {
              if (option.text === text || option.textContent.trim() === text) {
                option.selected = true;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
            }
            return false;
          }, model.text);
        }

        if (!success) {
          throw new BrowserError(`Option not found: ${model.value || model.text}`);
        }

        // Ensure the page state is updated
        await this.browserContext._waitForPageLoad();

        const selectionType = model.value !== null ? `value="${model.value}"` : `text="${model.text}"`;
        const msg = `📋 Selected option with ${selectionType} from select element with index ${model.index}`;
        logger.info(msg);

        return new ActionResult({
          success: true,
          isDone: false,
          extractedContent: msg,
          includeInMemory: true
        });
      } catch (error) {
        logger.error(`Error selecting option: ${error.message}`);
        return new ActionResult({
          success: false,
          isDone: false,
          error: `Failed to select option: ${error.message}`,
          includeInMemory: true
        });
      }
    });
  }
}