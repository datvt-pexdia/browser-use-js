/**
 * Browser-Use DOM History Tree Processor Views
 * JavaScript ES6 version of view.py
 */

/**
 * Hash of the DOM element to be used as a unique identifier
 */
export class HashedDomElement {
  /**
   * @param {string} branchPathHash - Hash of the branch path
   * @param {string} attributesHash - Hash of the attributes
   * @param {string} xpathHash - Hash of the xpath
   */
  constructor(branchPathHash, attributesHash, xpathHash) {
    this.branchPathHash = branchPathHash;
    this.attributesHash = attributesHash;
    this.xpathHash = xpathHash;
    // this.textHash = textHash; // Commented out in original
  }
}

/**
 * Coordinates in 2D space
 */
export class Coordinates {
  /**
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toJSON() {
    return {
      x: this.x,
      y: this.y
    };
  }
}

/**
 * Set of coordinates defining a rectangle
 */
export class CoordinateSet {
  /**
   * @param {Coordinates} topLeft - Top left coordinates
   * @param {Coordinates} topRight - Top right coordinates
   * @param {Coordinates} bottomLeft - Bottom left coordinates
   * @param {Coordinates} bottomRight - Bottom right coordinates
   * @param {Coordinates} center - Center coordinates
   * @param {number} width - Width of the rectangle
   * @param {number} height - Height of the rectangle
   */
  constructor(topLeft, topRight, bottomLeft, bottomRight, center, width, height) {
    this.topLeft = topLeft;
    this.topRight = topRight;
    this.bottomLeft = bottomLeft;
    this.bottomRight = bottomRight;
    this.center = center;
    this.width = width;
    this.height = height;
  }

  toJSON() {
    return {
      top_left: this.topLeft,
      top_right: this.topRight,
      bottom_left: this.bottomLeft,
      bottom_right: this.bottomRight,
      center: this.center,
      width: this.width,
      height: this.height
    };
  }
}

/**
 * Information about the viewport
 */
export class ViewportInfo {
  /**
   * @param {number} scrollX - Horizontal scroll position
   * @param {number} scrollY - Vertical scroll position
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   */
  constructor(scrollX, scrollY, width, height) {
    this.scrollX = scrollX;
    this.scrollY = scrollY;
    this.width = width;
    this.height = height;
  }

  toJSON() {
    return {
      scroll_x: this.scrollX,
      scroll_y: this.scrollY,
      width: this.width,
      height: this.height
    };
  }
}

/**
 * DOM history element
 */
export class DOMHistoryElement {
  /**
   * @param {string} tagName - Tag name
   * @param {string} xpath - XPath
   * @param {number|null} highlightIndex - Highlight index
   * @param {string[]} entireParentBranchPath - Entire parent branch path
   * @param {Object} attributes - Attributes
   * @param {boolean} shadowRoot - Whether this is a shadow root
   * @param {string|null} cssSelector - CSS selector
   * @param {CoordinateSet|null} pageCoordinates - Page coordinates
   * @param {CoordinateSet|null} viewportCoordinates - Viewport coordinates
   * @param {ViewportInfo|null} viewportInfo - Viewport info
   */
  constructor(
    tagName,
    xpath,
    highlightIndex,
    entireParentBranchPath,
    attributes,
    shadowRoot = false,
    cssSelector = null,
    pageCoordinates = null,
    viewportCoordinates = null,
    viewportInfo = null
  ) {
    this.tagName = tagName;
    this.xpath = xpath;
    this.highlightIndex = highlightIndex;
    this.entireParentBranchPath = entireParentBranchPath;
    this.attributes = attributes;
    this.shadowRoot = shadowRoot;
    this.cssSelector = cssSelector;
    this.pageCoordinates = pageCoordinates;
    this.viewportCoordinates = viewportCoordinates;
    this.viewportInfo = viewportInfo;
  }

  /**
   * Convert to a plain object
   * @returns {Object} Plain object representation
   */
  toDict() {
    return {
      tag_name: this.tagName,
      xpath: this.xpath,
      highlight_index: this.highlightIndex,
      entire_parent_branch_path: this.entireParentBranchPath,
      attributes: this.attributes,
      shadow_root: this.shadowRoot,
      css_selector: this.cssSelector,
      page_coordinates: this.pageCoordinates ? this.pageCoordinates.toJSON() : null,
      viewport_coordinates: this.viewportCoordinates ? this.viewportCoordinates.toJSON() : null,
      viewport_info: this.viewportInfo ? this.viewportInfo.toJSON() : null
    };
  }
} 