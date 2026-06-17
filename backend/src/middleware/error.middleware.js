// backend/src/middleware/error.middleware.js
const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.userId
  });

  // Xử lý các loại lỗi khác nhau
  if (err.isOperational) {
    // Lỗi nghiệp vụ
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      code: err.code
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại',
      error: 'DUPLICATE_ENTRY'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy dữ liệu',
      error: 'NOT_FOUND'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ',
      error: 'INVALID_TOKEN'
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File quá lớn. Kích thước tối đa 10MB',
      error: 'FILE_TOO_LARGE'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Lỗi máy chủ nội bộ' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };