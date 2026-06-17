// backend/src/middleware/validator.middleware.js
const { validationResult } = require('express-validator');

const validate = (schemas) => {
  return async (req, res, next) => {
    // Chạy tất cả validators
    for (const schema of schemas) {
      await schema.run(req);
    }

    // Kiểm tra kết quả
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: formattedErrors
      });
    }

    next();
  };
};

module.exports = { validate };