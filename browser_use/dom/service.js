/**
 * Browser-Use DOM Service
 * JavaScript ES6 version of service.py
 */

import fs from 'fs';
import path from 'path';
import { DOMBaseNode, DOMElementNode, DOMState, DOMTextNode } from './views.js';
import { timeExecutionAsync, logger } from '../utils.js';
// import { buildDomTree } from './buildDomTree.js';

/**
 * Viewport information
 */
export class ViewportInfo {
    /**
     * @param {number} width - Viewport width
     * @param {number} height - Viewport height
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
}

/**
 * Service for DOM operations
 */
export class DomService {
    /**
     * @param {import('playwright').Page} page - Playwright page
     */
    constructor(page) {
        this.page = page;
        this.xpathCache = {};

        // Đọc nội dung của file buildDomTree.js sử dụng import.meta.url (ES modules)
        const __filename = new URL(import.meta.url).pathname;
        const __dirname = path.dirname(__filename);
        // Xử lý đường dẫn cho Windows (chuyển /D:/path thành D:/path)
        const normalizedDirname = __dirname.replace(/^\/([A-Z]:)/, '$1');
        const buildDomTreePath = path.join(normalizedDirname, 'buildDomTree.js');
        this.jsCode = fs.readFileSync(buildDomTreePath, 'utf-8');
    }

    /**
     * Get clickable elements from the page
     * @param {boolean} highlightElements - Whether to highlight elements
     * @param {number} focusElement - Element to focus
     * @param {number} viewportExpansion - Viewport expansion
     * @returns {Promise<DOMState>} DOM state
     */
    async getClickableElements(
        highlightElements = true,
        focusElement = -1,
        viewportExpansion = 0
    ) {
        const [elementTree, selectorMap] = await this._buildDomTree(
            highlightElements,
            focusElement,
            viewportExpansion
        );
        return new DOMState(elementTree, selectorMap);
    }

    /**
     * Build DOM tree
     * @param {boolean} highlightElements - Whether to highlight elements
     * @param {number} focusElement - Element to focus
     * @param {number} viewportExpansion - Viewport expansion
     * @returns {Promise<[DOMElementNode, Object<number, DOMElementNode>]>} Element tree and selector map
     * @private
     */
    async _buildDomTree(
        highlightElements,
        focusElement,
        viewportExpansion
    ) {
        try {
            // Kiểm tra xem trang có thể thực thi JavaScript không
            try {
                if (await this.page.evaluate('1+1') !== 2) {
                    logger.error('The page cannot evaluate javascript code properly');
                    return [new DOMElementNode(), {}];
                }
            } catch (error) {
                logger.error(`Error evaluating basic JavaScript: ${error.message}`);
                return [new DOMElementNode(), {}];
            }

            // Execute the buildDomTree function in the browser context
            const debugMode = logger.level === 'debug';
            const args = {
                doHighlightElements: highlightElements,
                focusHighlightIndex: focusElement,
                viewportExpansion: viewportExpansion,
                debugMode: debugMode,
            };

            try {
                // Evaluate the JavaScript code as a string with the provided arguments
                console.log("addHighlights: ", focusElement)
                const evalPage = await this.page.evaluate(`(${this.jsCode})(${JSON.stringify(args)})`);
                if (debugMode && evalPage && evalPage.perfMetrics) {
                    logger.debug('DOM Tree Building Performance Metrics:\n' + JSON.stringify(evalPage.perfMetrics, null, 2));
                }

                return await this._constructDomTree(evalPage);
            } catch (e) {
                logger.error('Error evaluating JavaScript: ' + e);
                return [new DOMElementNode(), {}];
            }
        } catch (error) {
            logger.error(`Unexpected error in _buildDomTree: ${error.message}`);
            return [new DOMElementNode(), {}];
        }
    }
    /**
   * Remove highlights from the page
   * @returns {Promise<void>}
   */
    async removeHighlights() {
        console.log("removeHighlights on page");
        try {
            await this.page.evaluate(`
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
     * Construct DOM tree from evaluated page
     * @param {Object} evalPage - Evaluated page
     * @returns {Promise<[DOMElementNode, Object<number, DOMElementNode>]>} Element tree and selector map
     * @private
     */
    async _constructDomTree(evalPage) {
        // Kiểm tra evalPage có tồn tại không
        if (!evalPage || !evalPage.map || !evalPage.rootId) {
            logger.error('Invalid evalPage data: missing map or rootId');
            return [new DOMElementNode(false, null, 'body', '//body', {}, [], false, false, false, false, null, null, null,
                null), {}]; // Trả về cây rỗng và selector map rỗng
        }

        const jsNodeMap = evalPage.map;
        const jsRootId = evalPage.rootId;
        const nodeMap = {};
        const selectorMap = {};

        // Bước 1: Tạo tất cả các node trước (không thiết lập quan hệ cha-con)
        for (const [id, nodeData] of Object.entries(jsNodeMap)) {
            // Kiểm tra nodeData có tồn tại không
            if (!nodeData) {
                logger.debug(`Node data for ID ${id} is undefined or null`);
                continue;
            }

            const [node, childrenIds] = this._parseNode(nodeData);
            if (node === null) {
                continue;
            }

            nodeMap[id] = node;
            if (node instanceof DOMElementNode && node.highlightIndex !== null) {
                selectorMap[node.highlightIndex] = node;
            }
        }

        // Bước 2: Xây dựng cây từ dưới lên (bottom-up) như trong Python
        for (const [id, nodeData] of Object.entries(jsNodeMap)) {
            if (!nodeData || !nodeData.children) {
                continue;
            }

            const node = nodeMap[id];
            if (!node) {
                continue;
            }

            // Xử lý các con của node hiện tại
            for (const childId of nodeData.children) {
                if (!childId || !nodeMap[childId]) {
                    continue;
                }

                const childNode = nodeMap[childId];

                // Thiết lập quan hệ cha-con
                childNode.parent = node;

                // Đảm bảo node.children đã được khởi tạo
                if (!node.children) {
                    node.children = [];
                }

                node.children.push(childNode);
            }
        }

        // Kiểm tra nếu root node tồn tại
        if (!jsNodeMap[jsRootId]) {
            logger.error(`Root node with ID ${jsRootId} not found in node map`);
            return [new DOMElementNode(false, null, 'body', '//body', {}, [], false, false, false, false, null, null, null,
                null), selectorMap];
        }

        const rootNode = nodeMap[jsRootId];

        // Giải phóng bộ nhớ
        // Không cần thiết trong JavaScript nhưng giữ lại để tương đồng với Python
        // delete nodeMap;
        // delete jsNodeMap;
        // delete jsRootId;
        return [rootNode, selectorMap];
    }

    /**
     * Parse node data
     * @param {Object} nodeData - Node data
     * @returns {[DOMBaseNode|null, string[]]} Node and children IDs
     * @private
     */
    _parseNode(nodeData) {
        // Check if nodeData is valid
        if (!nodeData) {
            return [null, []];
        }

        const childrenIds = nodeData.children || [];

        // Xử lý text node - giống như trong Python
        if (nodeData.type === 'TEXT_NODE') {
            // Kiểm tra text có rỗng không
            if (!nodeData.text || nodeData.text.trim() === '') {
                return [null, childrenIds];
            }

            // Tạo text node
            const textNode = new DOMTextNode(
                nodeData.isVisible || false,
                null, // Parent will be set later
                nodeData.text
            );

            return [textNode, childrenIds];
        }

        // Xử lý element node (mặc định) - giống như trong Python
        // Xử lý viewport info nếu có
        let viewportInfo = null;
        if (nodeData.viewport) {
            viewportInfo = new ViewportInfo(
                nodeData.viewport.width,
                nodeData.viewport.height
            );
        }

        // Tạo element node
        const elementNode = new DOMElementNode(
            nodeData.isVisible || false,
            null, // Parent will be set later
            nodeData.tagName,
            nodeData.xpath,
            nodeData.attributes || {},
            [], // Children sẽ được thiết lập sau
            nodeData.isInteractive || false,
            nodeData.isTopElement || false,
            nodeData.isInViewport || false,
            nodeData.shadowRoot || false,
            nodeData.highlightIndex !== undefined ? nodeData.highlightIndex : null,
            nodeData.viewportCoordinates || null,
            nodeData.pageCoordinates || null,
            viewportInfo
        );

        return [elementNode, childrenIds];
    }

    /**
     * Get element by XPath
     * @param {string} xpath - XPath
     * @returns {Promise<import('playwright').ElementHandle|null>} Element handle
     */
    async getElementByXPath(xpath) {
        if (this.xpathCache[xpath]) {
            try {
                // Check if the element is still attached to the DOM
                await this.xpathCache[xpath].evaluate('1+1');
                return this.xpathCache[xpath];
            } catch (e) {
                // Element is no longer attached, remove from cache
                delete this.xpathCache[xpath];
            }
        }

        try {
            const elements = await this.page.$$(`//${xpath}`);
            if (elements.length > 0) {
                this.xpathCache[xpath] = elements[0];
                return elements[0];
            }
        } catch (e) {
            logger.error(`Error finding element by XPath ${xpath}: ${e}`);
        }

        return null;
    }

    /**
     * Get element by highlight index
     * @param {number} highlightIndex - Highlight index
     * @returns {Promise<import('playwright').ElementHandle|null>} Element handle
     */
    /**
     * Get element by highlight index
     * @param {number} highlightIndex - Highlight index
     * @returns {Promise<import('playwright').ElementHandle|null>} Element handle
     */
    async getElementByHighlightIndex(highlightIndex) {
        await this.removeHighlights();
        const state = await this.getClickableElements(true, highlightIndex);

        const element = state.selectorMap[highlightIndex];

        if (!element) {
            logger.error(`Element with highlight index ${highlightIndex} not found`);
            return null;
        }

        let elementHandle = await this.getElementByXPath(element.xpath);

        if (!elementHandle) {
            function findIframeParent(elem) {
                let current = elem.parent;
                while (current) {
                    if (current.tagName && current.tagName.toLowerCase() === 'iframe') {
                        return current;
                    }
                    current = current.parent;
                }
                return null;
            }

            const iframeParent = findIframeParent(element);
            if (iframeParent) {
                // Nếu có parent là iframe, lấy xpath của iframe
                const iframeXPath = iframeParent.xpath; // Giả sử đối tượng cha có trường xpath
                logger.info(`Element with highlight index ${highlightIndex} is inside an iframe: ${iframeXPath}`);

                // Chuyển đổi full xpath của iframe thành selector tương đối (giả sử có helper getRelativeXPath)
                const iframeElements = await this.page.$$(`//${iframeXPath}`);

                if (iframeElements.length === 0) {
                    logger.error(`Iframe with XPath "${xpath}" not found`);
                    return null;
                }

                // Lấy frame từ iframe element
                const frameLocator = await iframeElements[0].contentFrame();


                try {
                    const elements = await frameLocator.$$(`//${element.xpath}`)

                    if (elements.length > 0) {
                        this.xpathCache[element.xpath] = elements[0];
                        return elements[0];
                    }
                    logger.error(`Element with XPath ${finalXPath} not found in iframe`);
                    return null;
                } catch (error) {
                    logger.error(`Error locating element inside iframe: ${error.message}`);
                    return null;
                }
            } else {
                return null
            }
        } else {
            return elementHandle
        }
    }
}