// backend/src/utils/errors.js
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy') {
    super(message, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Không có quyền truy cập') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Bị cấm truy cập') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ValidationError extends AppError {
  constructor(message = 'Dữ liệu không hợp lệ') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

module.exports = {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError
};