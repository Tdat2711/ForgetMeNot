// backend/src/utils/validators.js
const { body, param, query } = require('express-validator');

const registerSchema = [
  body('email')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Tên người dùng phải từ 3-30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Tên người dùng chỉ chứa chữ cái, số và dấu gạch dưới'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Mật khẩu phải có ít nhất 8 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa chữ hoa, chữ thường và số')
];

const loginSchema = [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Vui lòng nhập mật khẩu')
];

const changePasswordSchema = [
  body('currentPassword').notEmpty().withMessage('Vui lòng nhập mật khẩu hiện tại'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Mật khẩu mới phải có ít nhất 8 ký tự')
];

const updateProfileSchema = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Tên người dùng phải từ 3-30 ký tự'),
  body('language')
    .optional()
    .isIn(['vi', 'en'])
    .withMessage('Ngôn ngữ không hợp lệ')
];

const createDeckSchema = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Tên bộ thẻ phải từ 1-100 ký tự')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mô tả không được quá 500 ký tự'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Màu sắc không hợp lệ'),
  body('examDate')
    .optional()
    .isISO8601()
    .withMessage('Ngày thi không hợp lệ')
];

const updateDeckSchema = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tên bộ thẻ phải từ 1-100 ký tự'),
  body('description')
    .optional()
    .isLength({ max: 500 }),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/),
  body('examDate')
    .optional()
    .isISO8601()
];

const createFlashcardSchema = [
  body('frontText')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Câu hỏi phải từ 1-2000 ký tự'),
  body('backText')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Đáp án phải từ 1-2000 ký tự'),
  body('hint')
    .optional()
    .isLength({ max: 500 }),
  body('difficulty')
    .optional()
    .isIn(['EASY', 'MEDIUM', 'HARD'])
];

const updateFlashcardSchema = [
  body('frontText')
    .optional()
    .isLength({ min: 1, max: 2000 }),
  body('backText')
    .optional()
    .isLength({ min: 1, max: 2000 }),
  body('hint')
    .optional()
    .isLength({ max: 500 })
];

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  createDeckSchema,
  updateDeckSchema,
  createFlashcardSchema,
  updateFlashcardSchema
};