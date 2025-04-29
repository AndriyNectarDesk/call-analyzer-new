/**
 * Utility functions for number operations
 */
import _ from 'lodash';

/**
 * Check if a value is a valid number
 * @param {*} value - Value to check
 * @returns {boolean} True if value is a number, false otherwise
 */
export const isNumber = _.isNumber;

/**
 * Format a number to a specific precision
 * @param {number} value - Number to format
 * @param {number} precision - Number of decimal places
 * @returns {number} Formatted number
 */
export const formatNumber = (value, precision = 2) => {
  if (!isNumber(value)) return 0;
  return Number(value.toFixed(precision));
};

/**
 * Safely perform addition without NaN results
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Result of addition
 */
export const safeAdd = (a, b) => {
  a = isNumber(a) ? a : 0;
  b = isNumber(b) ? b : 0;
  return a + b;
};

export default {
  isNumber,
  formatNumber,
  safeAdd
}; 