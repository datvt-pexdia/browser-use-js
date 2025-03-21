/**
 * Browser-Use DOM Views
 * JavaScript ES6 version of views.py
 */

import { CoordinateSet, HashedDomElement, ViewportInfo } from './history_tree_processor/view.js';
import { timeExecutionSync } from '../utils.js';

/**
 * Base class for DOM nodes
 */
export class DOMBaseNode {
  /**
   * @param {boolean} isVisible - Whether the node is visible
   * @param {DOMElementNode|null} parent - Parent element node
   */
  constructor(isVisible, parent = null) {
    this.isVisible = isVisible;
    this.parent = parent;
  }
}

/**
 * Text node in the DOM
 */
export class DOMTextNode extends DOMBaseNode {
  /**
   * @param {boolean} isVisible - Whether the node is visible
   * @param {DOMElementNode|null} parent - Parent element node
   * @param {string} text - Text content
   */
  constructor(isVisible, parent, text) {
    super(isVisible, parent);
    this.text = text;
    this.type = 'TEXT_NODE';
  }

  /**
   * Check if any parent has a highlight index
   * @returns {boolean} Whether any parent has a highlight index
   */
  hasParentWithHighlightIndex() {
    let current = this.parent;
    while (current !== null) {
      // stop if the element has a highlight index (will be handled separately)
      if (current.highlightIndex !== null) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Check if parent is in viewport
   * @returns {boolean} Whether parent is in viewport
   */
  isParentInViewport() {
    if (this.parent === null) {
      return false;
    }
    return this.parent.isInViewport;
  }

  /**
   * Check if parent is a top element
   * @returns {boolean} Whether parent is a top element
   */
  isParentTopElement() {
    if (this.parent === null) {
      return false;
    }
    return this.parent.isTopElement;
  }
}

/**
 * Element node in the DOM
 */
export class DOMElementNode extends DOMBaseNode {
  /**
   * Constructor không tham số
   */
  constructor() {
    if (arguments.length === 0) {
      super(false, null);
      this.tagName = 'div';
      this.xpath = '';
      this.attributes = {};
      this.children = [];
      this.isInteractive = false;
      this.isTopElement = false;
      this.isInViewport = false;
      this.shadowRoot = false;
      this.highlightIndex = null;
      this.viewportCoordinates = null;
      this.pageCoordinates = null;
      this.viewportInfo = null;
      this.type = 'ELEMENT_NODE';
      return;
    }
    
    // Constructor với tham số
    const [
      isVisible,
      parent,
      tagName,
      xpath,
      attributes,
      children,
      isInteractive = false,
      isTopElement = false,
      isInViewport = false,
      shadowRoot = false,
      highlightIndex = null,
      viewportCoordinates = null,
      pageCoordinates = null,
      viewportInfo = null
    ] = arguments;
    
    super(isVisible, parent);
    this.tagName = tagName || '';
    this.xpath = xpath || '';
    this.attributes = attributes || {};
    // Đảm bảo children luôn là một mảng
    this.children = Array.isArray(children) ? children : [];
    this.isInteractive = isInteractive;
    this.isTopElement = isTopElement;
    this.isInViewport = isInViewport;
    this.shadowRoot = shadowRoot;
    this.highlightIndex = highlightIndex;
    this.viewportCoordinates = viewportCoordinates;
    this.pageCoordinates = pageCoordinates;
    this.viewportInfo = viewportInfo;
    this.type = 'ELEMENT_NODE';
  }

  /**
   * String representation of the element
   * @returns {string} String representation
   */
  toString() {
    let tagStr = `<${this.tagName}`;

    // Add attributes
    for (const [key, value] of Object.entries(this.attributes)) {
      tagStr += ` ${key}="${value}"`;
    }
    tagStr += '>';

    // Add extra info
    const extras = [];
    if (this.isInteractive) {
      extras.push('interactive');
    }
    if (this.isTopElement) {
      extras.push('top');
    }
    if (this.shadowRoot) {
      extras.push('shadow-root');
    }
    if (this.highlightIndex !== null) {
      extras.push(`highlight:${this.highlightIndex}`);
    }
    if (this.isInViewport) {
      extras.push('in-viewport');
    }

    if (extras.length > 0) {
      tagStr += ` [${extras.join(', ')}]`;
    }

    return tagStr;
  }

  /**
   * Get hash of the element
   * @returns {HashedDomElement} Hashed DOM element
   */
  get hash() {
    // This would normally be imported from the service
    // For now, we'll create a placeholder implementation
    const hashDomElement = (element) => {
      const branchPathHash = `branch-${element.tagName}-${element.children.length}`;
      const attributesHash = `attr-${Object.keys(element.attributes).join('-')}`;
      const xpathHash = `xpath-${element.xpath}`;
      return new HashedDomElement(branchPathHash, attributesHash, xpathHash);
    };
    
    return hashDomElement(this);
  }

  /**
   * Get all text until the next clickable element
   * @param {number} maxDepth - Maximum depth to search
   * @returns {string} Concatenated text
   */
  getAllTextTillNextClickableElement(maxDepth = -1) {
    return timeExecutionSync('--get_all_text_till_next_clickable_element', () => {
      const textParts = [];

      const collectText = (node, currentDepth) => {
        if (maxDepth !== -1 && currentDepth > maxDepth) {
          return;
        }

        // Skip this branch if we hit a highlighted element (except for the current node)
        if (node instanceof DOMElementNode && node !== this && node.highlightIndex !== null) {
          return;
        }

        if (node instanceof DOMTextNode) {
          // Chỉ thêm text nếu nó không rỗng sau khi trim
          const trimmedText = node.text.trim();
          if (trimmedText) {
            textParts.push(trimmedText);
          }
        } else if (node instanceof DOMElementNode) {
          for (const child of node.children) {
            collectText(child, currentDepth + 1);
          }
        }
      };

      collectText(this, 0);
      return textParts.join('\n').trim();
    });
  }

  /**
   * Convert clickable elements to string
   * @param {string[]|null} includeAttributes - Attributes to include
   * @returns {string} String representation of clickable elements
   */
  clickableElementsToString(includeAttributes = null) {
    return timeExecutionSync('--clickable_elements_to_string', () => {
      const formattedText = [];

      const processNode = (node, depth) => {
        if (node instanceof DOMElementNode) {
          // Add element with highlight_index
          if (node.highlightIndex !== null) {
            let attributesStr = '';
            const text = node.getAllTextTillNextClickableElement();
            if (includeAttributes) {
              const attributes = [...new Set(
                Object.entries(node.attributes)
                  .filter(([key, value]) => includeAttributes.includes(key) && value !== node.tagName)
                  .map(([key, value]) => String(value))
              )];
              
              // Nếu text có trong attributes, loại bỏ nó (khớp với Python)
              if (text && attributes.includes(text)) {
                attributes.splice(attributes.indexOf(text), 1);
              }
              attributesStr = attributes.join(';');
            }
            
            // Định dạng output giống hệt Python
            let line = `[${node.highlightIndex}]<${node.tagName} `;
            if (attributesStr) {
              line += `${attributesStr}`;
            }
            if (text) {
              if (attributesStr) {
                line += `>${text}`;
              } else {
                line += `${text}`;
              }
            }
            line += '/>'; 
            formattedText.push(line);
          }

          // Process children regardless
          for (const child of node.children) {
            processNode(child, depth + 1);
          }
        } else if (node instanceof DOMTextNode) {
          // Add text only if it doesn't have a highlighted parent
          if (!node.hasParentWithHighlightIndex() && node.isVisible) {
            formattedText.push(`${node.text}`);
          }
        }
      };

      processNode(this, 0);
      return formattedText.join('\n');
    });
  }

  /**
   * Get file upload element
   * @param {boolean} checkSiblings - Whether to check siblings
   * @returns {DOMElementNode|null} File upload element
   */
  getFileUploadElement(checkSiblings = true) {
    // Check if current element is a file input
    if (this.tagName === 'input' && this.attributes.type === 'file') {
      return this;
    }

    // Check children
    for (const child of this.children) {
      if (child instanceof DOMElementNode) {
        const result = child.getFileUploadElement(false);
        if (result) {
          return result;
        }
      }
    }

    // Check siblings only for the initial call
    if (checkSiblings && this.parent) {
      for (const sibling of this.parent.children) {
        if (sibling !== this && sibling instanceof DOMElementNode) {
          const result = sibling.getFileUploadElement(false);
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  }
}

/**
 * DOM state
 */
export class DOMState {
  /**
   * @param {DOMElementNode} elementTree - Element tree
   * @param {Object<number, DOMElementNode>} selectorMap - Selector map
   */
  constructor(elementTree, selectorMap) {
    this.elementTree = elementTree;
    this.selectorMap = selectorMap;
  }
} 