/**
 * Browser-Use DOM History Tree Processor Service
 * JavaScript ES6 version of service.py
 */

import crypto from 'crypto';
import { DOMHistoryElement, HashedDomElement } from './view.js';
import { DOMElementNode } from '../views.js';

/**
 * Operations on the DOM elements
 * 
 * @dev be careful - text nodes can change even if elements stay the same
 */
export class HistoryTreeProcessor {
  /**
   * Convert DOM element to history element
   * @param {DOMElementNode} domElement - DOM element
   * @returns {DOMHistoryElement} DOM history element
   */
  static convertDomElementToHistoryElement(domElement) {
    const parentBranchPath = HistoryTreeProcessor._getParentBranchPath(domElement);
    
    // In a real implementation, this would be imported from BrowserContext
    // For now, we'll create a simple implementation
    const enhancedCssSelectorForElement = (element) => {
      return `${element.tagName}${element.highlightIndex !== null ? `[data-highlight="${element.highlightIndex}"]` : ''}`;
    };
    
    const cssSelector = enhancedCssSelectorForElement(domElement);
    
    return new DOMHistoryElement(
      domElement.tagName,
      domElement.xpath,
      domElement.highlightIndex,
      parentBranchPath,
      domElement.attributes,
      domElement.shadowRoot,
      cssSelector,
      domElement.pageCoordinates,
      domElement.viewportCoordinates,
      domElement.viewportInfo
    );
  }

  /**
   * Find history element in tree
   * @param {DOMHistoryElement} domHistoryElement - DOM history element
   * @param {DOMElementNode} tree - DOM element tree
   * @returns {DOMElementNode|null} Found DOM element
   */
  static findHistoryElementInTree(domHistoryElement, tree) {
    const hashedDomHistoryElement = HistoryTreeProcessor._hashDomHistoryElement(domHistoryElement);

    const processNode = (node) => {
      if (node.highlightIndex !== null) {
        const hashedNode = HistoryTreeProcessor._hashDomElement(node);
        if (
          hashedNode.branchPathHash === hashedDomHistoryElement.branchPathHash &&
          hashedNode.attributesHash === hashedDomHistoryElement.attributesHash &&
          hashedNode.xpathHash === hashedDomHistoryElement.xpathHash
        ) {
          return node;
        }
      }
      
      for (const child of node.children) {
        if (child instanceof DOMElementNode) {
          const result = processNode(child);
          if (result !== null) {
            return result;
          }
        }
      }
      
      return null;
    };

    return processNode(tree);
  }

  /**
   * Compare history element and DOM element
   * @param {DOMHistoryElement} domHistoryElement - DOM history element
   * @param {DOMElementNode} domElement - DOM element
   * @returns {boolean} Whether they match
   */
  static compareHistoryElementAndDomElement(domHistoryElement, domElement) {
    const hashedHistoryElement = HistoryTreeProcessor._hashDomHistoryElement(domHistoryElement);
    const hashedDomElement = HistoryTreeProcessor._hashDomElement(domElement);
    
    return (
      hashedHistoryElement.branchPathHash === hashedDomElement.branchPathHash &&
      hashedHistoryElement.attributesHash === hashedDomElement.attributesHash &&
      hashedHistoryElement.xpathHash === hashedDomElement.xpathHash
    );
  }

  /**
   * Hash DOM history element
   * @param {DOMHistoryElement} domHistoryElement - DOM history element
   * @returns {HashedDomElement} Hashed DOM element
   * @private
   */
  static _hashDomHistoryElement(domHistoryElement) {
    const branchPathHash = HistoryTreeProcessor._parentBranchPathHash(domHistoryElement.entireParentBranchPath);
    const attributesHash = HistoryTreeProcessor._attributesHash(domHistoryElement.attributes);
    const xpathHash = HistoryTreeProcessor._xpathHash(domHistoryElement.xpath);
    
    return new HashedDomElement(branchPathHash, attributesHash, xpathHash);
  }

  /**
   * Hash DOM element
   * @param {DOMElementNode} domElement - DOM element
   * @returns {HashedDomElement} Hashed DOM element
   * @private
   */
  static _hashDomElement(domElement) {
    const parentBranchPath = HistoryTreeProcessor._getParentBranchPath(domElement);
    const branchPathHash = HistoryTreeProcessor._parentBranchPathHash(parentBranchPath);
    const attributesHash = HistoryTreeProcessor._attributesHash(domElement.attributes);
    const xpathHash = HistoryTreeProcessor._xpathHash(domElement.xpath);
    
    return new HashedDomElement(branchPathHash, attributesHash, xpathHash);
  }

  /**
   * Get parent branch path
   * @param {DOMElementNode} domElement - DOM element
   * @returns {string[]} Parent branch path
   * @private
   */
  static _getParentBranchPath(domElement) {
    const path = [];
    let current = domElement;
    
    while (current !== null) {
      // Add tag name and index to path
      path.unshift(`${current.tagName}:${current.highlightIndex !== null ? current.highlightIndex : 'null'}`);
      current = current.parent;
    }
    
    return path;
  }

  /**
   * Hash parent branch path
   * @param {string[]} parentBranchPath - Parent branch path
   * @returns {string} Hashed parent branch path
   * @private
   */
  static _parentBranchPathHash(parentBranchPath) {
    return HistoryTreeProcessor._createHash(parentBranchPath.join('->'));
  }

  /**
   * Hash attributes
   * @param {Object} attributes - Attributes
   * @returns {string} Hashed attributes
   * @private
   */
  static _attributesHash(attributes) {
    const sortedKeys = Object.keys(attributes).sort();
    const attributeString = sortedKeys.map(key => `${key}:${attributes[key]}`).join(';');
    return HistoryTreeProcessor._createHash(attributeString);
  }

  /**
   * Hash XPath
   * @param {string} xpath - XPath
   * @returns {string} Hashed XPath
   * @private
   */
  static _xpathHash(xpath) {
    return HistoryTreeProcessor._createHash(xpath);
  }

  /**
   * Hash text content
   * @param {DOMElementNode} domElement - DOM element
   * @returns {string} Hashed text content
   * @private
   */
  static _textHash(domElement) {
    const text = domElement.getAllTextTillNextClickableElement();
    return HistoryTreeProcessor._createHash(text);
  }

  /**
   * Create hash
   * @param {string} input - Input string
   * @returns {string} Hash
   * @private
   */
  static _createHash(input) {
    return crypto.createHash('md5').update(input).digest('hex');
  }
}

export default HistoryTreeProcessor; 