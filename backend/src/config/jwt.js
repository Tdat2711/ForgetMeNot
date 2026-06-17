// backend/src/config/jwt.js
const jwt = require('jsonwebtoken');

class JWTConfig {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
    this.accessExpire = process.env.JWT_EXPIRE || '24h';
    this.refreshExpire = process.env.JWT_REFRESH_EXPIRE || '7d';
  }

  generateAccessToken(payload) {
    return jwt.sign(
      { ...payload, type: 'access' },
      this.secret,
      { expiresIn: this.accessExpire }
    );
  }

  generateRefreshToken(payload) {
    return jwt.sign(
      { ...payload, type: 'refresh' },
      this.refreshSecret,
      { expiresIn: this.refreshExpire }
    );
  }

  generateTokenPair(userId) {
    const payload = { userId };
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn: this.parseExpireTime(this.accessExpire)
    };
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.secret);
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, this.refreshSecret);
  }

  parseExpireTime(expireString) {
    const match = expireString.match(/^(\d+)([smhd])$/);
    if (!match) return 86400;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] || 3600);
  }
}

module.exports = new JWTConfig();