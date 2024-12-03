// Custom validation middleware for password
const { body } = require('express-validator');

// Password validation middleware
const validatePassword = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long.')
  .matches(/\d/)
  .withMessage('Password must contain at least one number.');

module.exports = { validatePassword };
