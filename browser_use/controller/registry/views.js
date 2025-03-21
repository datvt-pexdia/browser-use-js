/**
 * Browser-Use Controller Registry Views
 * JavaScript ES6 version of views.py
 */

/**
 * Registered function
 */
export class RegisteredFunction {
  /**
   * @param {string} name - Function name
   * @param {string} description - Function description
   * @param {Object} parameters - Function parameters
   */
  constructor(name, description, parameters) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    };
  }

  /**
   * Create from JSON
   * @param {Object} json - JSON representation
   * @returns {RegisteredFunction} Registered function
   */
  static fromJSON(json) {
    return new RegisteredFunction(
      json.name,
      json.description,
      json.parameters
    );
  }
}

/**
 * Function parameter
 */
export class FunctionParameter {
  /**
   * @param {string} name - Parameter name
   * @param {string} type - Parameter type
   * @param {string} description - Parameter description
   * @param {boolean} [required=true] - Whether the parameter is required
   */
  constructor(name, type, description, required = true) {
    this.name = name;
    this.type = type;
    this.description = description;
    this.required = required;
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      description: this.description,
      required: this.required
    };
  }

  /**
   * Create from JSON
   * @param {Object} json - JSON representation
   * @returns {FunctionParameter} Function parameter
   */
  static fromJSON(json) {
    return new FunctionParameter(
      json.name,
      json.type,
      json.description,
      json.required
    );
  }
} 