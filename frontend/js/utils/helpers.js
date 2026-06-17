// frontend/js/utils/helpers.js
class Helpers {
    /**
     * Format date to Vietnamese locale
     */
    static formatDate(date, format = 'FULL') {
        if (!date) return '';
        const d = new Date(date);
        
        switch (format) {
            case 'FULL':
                return d.toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            case 'SHORT':
                return d.toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            case 'TIME':
                return d.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            case 'RELATIVE':
                return this.timeAgo(d);
            default:
                return d.toISOString();
        }
    }

    /**
     * Calculate time ago string
     */
    static timeAgo(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Vừa xong';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút trước`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} ngày trước`;
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks} tuần trước`;
        
        const months = Math.floor(days / 30);
        if (months < 12) return `${months} tháng trước`;
        
        const years = Math.floor(days / 365);
        return `${years} năm trước`;
    }

    /**
     * Truncate text with ellipsis
     */
    static truncate(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * Generate random color
     */
    static randomColor() {
        const colors = CONFIG.DECK_COLORS;
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Debounce function
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function
     */
    static throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render math expressions using KaTeX
     */
    static renderMath(text) {
        if (!text || typeof text !== 'string') return text;
        
        // Render display math: $$...$$
        text = text.replace(/\$\$(.*?)\$\$/g, (match, formula) => {
            try {
                return katex.renderToString(formula.trim(), {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                return match;
            }
        });
        
        // Render inline math: $...$
        text = text.replace(/\$(.*?)\$/g, (match, formula) => {
            try {
                return katex.renderToString(formula.trim(), {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                return match;
            }
        });
        
        return text;
    }

    /**
     * Get quality label
     */
    static getQualityLabel(quality) {
        const labels = {
            0: { text: 'Quên', color: 'danger', icon: 'redo' },
            1: { text: 'Khó', color: 'warning', icon: 'meh' },
            3: { text: 'Tốt', color: 'success', icon: 'check' },
            5: { text: 'Dễ', color: 'primary', icon: 'star' }
        };
        return labels[quality] || { text: '?', color: 'gray', icon: 'question' };
    }

    /**
     * Get difficulty label
     */
    static getDifficultyLabel(difficulty) {
        const labels = {
            EASY: { text: 'Dễ', color: 'success' },
            MEDIUM: { text: 'Trung bình', color: 'warning' },
            HARD: { text: 'Khó', color: 'danger' }
        };
        return labels[difficulty] || { text: '?', color: 'gray' };
    }

    /**
     * Format number with commas
     */
    static formatNumber(num) {
        return new Intl.NumberFormat('vi-VN').format(num);
    }

    /**
     * Calculate percentage
     */
    static percentage(value, total, decimals = 0) {
        if (total === 0) return 0;
        return Number(((value / total) * 100).toFixed(decimals));
    }

    /**
     * Generate unique ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Get streak message
     */
    static getStreakMessage(streak) {
        if (streak >= 100) return '🔥 Huyền thoại!';
        if (streak >= 50) return '🌟 Siêu đẳng!';
        if (streak >= 30) return '💎 Kim cương!';
        if (streak >= 14) return '🏆 Vàng!';
        if (streak >= 7) return '⚡ Bạc!';
        if (streak >= 3) return '💪 Đồng!';
        if (streak >= 1) return '🌱 Bắt đầu!';
        return '😴 Chưa có';
    }

    /**
     * Copy to clipboard
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Copy failed:', err);
            return false;
        }
    }

    /**
     * Download file
     */
    static downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Export to window
window.Helpers = Helpers;