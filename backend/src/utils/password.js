const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 * @param {String} plainPassword - Plain text password
 * @returns {Promise<String>} Hashed password
 */
const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare plain password with hashed password
 * @param {String} plainPassword - Plain text password
 * @param {String} hashedPassword - Hashed password
 * @returns {Promise<Boolean>} True if passwords match
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};

