// backend/src/utils/helpers.js
class Helpers {
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static formatDate(date) {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  static timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = {
      năm: 31536000,
      tháng: 2592000,
      tuần: 604800,
      ngày: 86400,
      giờ: 3600,
      phút: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit} trước`;
      }
    }

    return 'Vừa xong';
  }

  static truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  }

  static sanitizeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }
}

module.exports = Helpers;