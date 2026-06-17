// backend/src/services/auth.service.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.jwtExpire = process.env.JWT_EXPIRE || '24h';
    this.jwtRefreshExpire = process.env.JWT_REFRESH_EXPIRE || '7d';
    this.saltRounds = 12;
  }

  /**
   * Đăng ký người dùng mới
   */
  async register({ email, username, password }) {
    // Kiểm tra email đã tồn tại
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      throw new AppError('Email đã được sử dụng', 400, 'EMAIL_EXISTS');
    }

    // Kiểm tra username đã tồn tại
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      throw new AppError('Tên người dùng đã tồn tại', 400, 'USERNAME_EXISTS');
    }

    // Mã hóa mật khẩu
    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    // Tạo user mới
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=200&bold=true`,
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        darkMode: true,
        language: true,
        createdAt: true,
      }
    });

    // Tạo tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user,
      ...tokens
    };
  }

  /**
   * Đăng nhập
   */
  async login({ email, password, ipAddress, userAgent }) {
    // Tìm user theo email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401, 'INVALID_CREDENTIALS');
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401, 'INVALID_CREDENTIALS');
    }

    // Cập nhật last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Tạo tokens
    const tokens = await this.generateTokens(user.id, ipAddress, userAgent);

    // Lấy thông tin user (không bao gồm password)
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        darkMode: true,
        language: true,
        emailNotifications: true,
        pushNotifications: true,
        studyReminders: true,
        createdAt: true,
        lastLoginAt: true,
      }
    });

    return {
      user: userData,
      ...tokens
    };
  }

  /**
   * Tạo access token và refresh token
   */
  async generateTokens(userId, ipAddress = null, userAgent = null) {
    // Access token
    const accessToken = jwt.sign(
      { 
        userId,
        type: 'access'
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpire }
    );

    // Refresh token
    const refreshToken = jwt.sign(
      {
        userId,
        type: 'refresh'
      },
      this.jwtRefreshSecret,
      { expiresIn: this.jwtRefreshExpire }
    );

    // Lưu session
    const session = await prisma.session.create({
      data: {
        userId,
        token: accessToken,
        refreshToken,
        ipAddress,
        userAgent,
        deviceType: this.detectDevice(userAgent),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpireTime(this.jwtExpire)
    };
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);

      if (decoded.type !== 'refresh') {
        throw new AppError('Token không hợp lệ', 401, 'INVALID_TOKEN');
      }

      // Kiểm tra session
      const session = await prisma.session.findFirst({
        where: {
          userId: decoded.userId,
          refreshToken,
          isValid: true,
        }
      });

      if (!session) {
        throw new AppError('Session không tồn tại hoặc đã hết hạn', 401, 'SESSION_EXPIRED');
      }

      // Tạo tokens mới
      const tokens = await this.generateTokens(decoded.userId);

      // Vô hiệu hóa session cũ
      await prisma.session.update({
        where: { id: session.id },
        data: { isValid: false }
      });

      return tokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Token không hợp lệ hoặc đã hết hạn', 401, 'INVALID_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Đăng xuất
   */
  async logout(userId, accessToken) {
    // Vô hiệu hóa tất cả sessions của user
    await prisma.session.updateMany({
      where: {
        userId,
        token: accessToken,
        isValid: true
      },
      data: {
        isValid: false
      }
    });

    return { message: 'Đăng xuất thành công' };
  }

  /**
   * Đăng xuất tất cả thiết bị
   */
  async logoutAll(userId) {
    await prisma.session.updateMany({
      where: {
        userId,
        isValid: true
      },
      data: {
        isValid: false
      }
    });

    return { message: 'Đã đăng xuất khỏi tất cả thiết bị' };
  }

  /**
   * Đổi mật khẩu
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Kiểm tra mật khẩu hiện tại
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError('Mật khẩu hiện tại không chính xác', 400, 'INVALID_PASSWORD');
    }

    // Mã hóa mật khẩu mới
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

    // Cập nhật
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    // Đăng xuất tất cả thiết bị
    await this.logoutAll(userId);

    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  /**
   * Cập nhật thông tin cá nhân
   */
  async updateProfile(userId, data) {
    const allowedFields = ['username', 'avatar', 'darkMode', 'language', 
                          'emailNotifications', 'pushNotifications', 'studyReminders'];
    
    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (updateData.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: updateData.username,
          NOT: { id: userId }
        }
      });
      if (existing) {
        throw new AppError('Tên người dùng đã tồn tại', 400, 'USERNAME_EXISTS');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        darkMode: true,
        language: true,
        emailNotifications: true,
        pushNotifications: true,
        studyReminders: true,
      }
    });

    return user;
  }

  /**
   * Lấy danh sách phiên đăng nhập
   */
  async getSessions(userId) {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isValid: true
      },
      select: {
        id: true,
        deviceType: true,
        userAgent: true,
        ipAddress: true,
        lastActivity: true,
        createdAt: true,
      },
      orderBy: {
        lastActivity: 'desc'
      }
    });

    return sessions;
  }

  /**
   * Hủy một phiên đăng nhập cụ thể
   */
  async revokeSession(userId, sessionId) {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
        isValid: true
      }
    });

    if (!session) {
      throw new AppError('Phiên đăng nhập không tồn tại', 404, 'SESSION_NOT_FOUND');
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { isValid: false }
    });

    return { message: 'Đã hủy phiên đăng nhập' };
  }

  // Helper methods
  detectDevice(userAgent) {
    if (!userAgent) return 'unknown';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    if (/windows|mac|linux/i.test(userAgent)) return 'desktop';
    return 'unknown';
  }

  parseExpireTime(expireString) {
    const match = expireString.match(/^(\d+)([hd])$/);
    if (!match) return 86400; // Default 24h in seconds
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    if (unit === 'h') return value * 3600;
    if (unit === 'd') return value * 86400;
    return 86400;
  }
}

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AuthService, AppError };