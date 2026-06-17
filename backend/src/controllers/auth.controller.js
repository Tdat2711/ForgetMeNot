// backend/src/controllers/auth.controller.js
const { AuthService } = require('../services/auth.service');

const authService = new AuthService();

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công! Chào mừng đến với ForgetMeNot.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      res.json({
        success: true,
        message: 'Đăng nhập thành công!',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getProfile(req.userId);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await authService.updateProfile(req.userId, req.body);
      res.json({
        success: true,
        message: 'Cập nhật thông tin thành công!',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const result = await authService.changePassword(req.userId, req.body);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      const result = await authService.logout(req.userId, token);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req, res, next) {
    try {
      const result = await authService.logoutAll(req.userId);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req, res, next) {
    try {
      const sessions = await authService.getSessions(req.userId);
      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req, res, next) {
    try {
      const result = await authService.revokeSession(req.userId, req.params.sessionId);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();