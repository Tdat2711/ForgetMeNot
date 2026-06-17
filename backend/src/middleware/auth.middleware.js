// backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AuthMiddleware {
  async authenticate(req, res, next) {
    try {
      // Lấy token từ header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập để tiếp tục'
        });
      }

      const token = authHeader.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'access') {
        return res.status(401).json({
          success: false,
          message: 'Token không hợp lệ'
        });
      }

      // Kiểm tra session
      const session = await prisma.session.findFirst({
        where: {
          userId: decoded.userId,
          token,
          isValid: true,
          expiresAt: { gt: new Date() }
        }
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Phiên đăng nhập đã hết hạn'
        });
      }

      // Cập nhật last activity
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActivity: new Date() }
      });

      // Gán userId vào request
      req.userId = decoded.userId;
      req.sessionId = session.id;
      
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: 'Token đã hết hạn',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          message: 'Token không hợp lệ',
          code: 'INVALID_TOKEN'
        });
      }

      next(error);
    }
  }

  optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return this.authenticate(req, res, next);
    }
    next();
  }

  authorize(...roles) {
    return async (req, res, next) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: req.userId }
        });

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Người dùng không tồn tại'
          });
        }

        if (!roles.includes(user.role)) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền thực hiện hành động này'
          });
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = new AuthMiddleware();