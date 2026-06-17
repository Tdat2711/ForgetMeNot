// frontend/js/services/stats.service.js
class StatsService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
    }

    /**
     * Get dashboard statistics
     */
    async getDashboardStats() {
        const cacheKey = 'dashboard';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await api.get('/stats/dashboard');
            const data = response.data;
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return this.getDefaultDashboardStats();
        }
    }

    /**
     * Get weekly statistics
     */
    async getWeeklyStats(days = 7) {
        const cacheKey = `weekly_${days}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await api.get('/stats/weekly', { days });
            const data = response.data;
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error getting weekly stats:', error);
            return this.getDefaultWeeklyStats(days);
        }
    }

    /**
     * Get monthly statistics
     */
    async getMonthlyStats() {
        const cacheKey = 'monthly';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await api.get('/stats/monthly');
            const data = response.data;
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error getting monthly stats:', error);
            return this.getDefaultMonthlyStats();
        }
    }

    /**
     * Get deck performance statistics
     */
    async getDeckPerformance() {
        const cacheKey = 'performance';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await api.get('/stats/performance');
            const data = response.data;
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error getting deck performance:', error);
            return [];
        }
    }

    /**
     * Get streak information
     */
    async getStreakInfo() {
        try {
            const response = await api.get('/stats/streak');
            return response.data;
        } catch (error) {
            console.error('Error getting streak info:', error);
            return this.getDefaultStreakInfo();
        }
    }

    /**
     * Get activity log
     */
    async getActivityLog(days = 30, limit = 20) {
        try {
            const response = await api.get('/stats/activity', { days, limit });
            return response.data;
        } catch (error) {
            console.error('Error getting activity log:', error);
            return [];
        }
    }

    /**
     * Get study time statistics
     */
    async getStudyTimeStats(period = 'weekly') {
        try {
            const response = await api.get('/stats/study-time', { period });
            return response.data;
        } catch (error) {
            console.error('Error getting study time:', error);
            return this.getDefaultStudyTime(period);
        }
    }

    /**
     * Calculate retention rate
     */
    calculateRetention(cards) {
        if (!cards || cards.length === 0) return 0;
        
        const remembered = cards.filter(c => c.quality >= 3).length;
        return Math.round((remembered / cards.length) * 100);
    }

    /**
     * Calculate average ease factor
     */
    calculateAverageEase(cards) {
        if (!cards || cards.length === 0) return 2.5;
        
        const total = cards.reduce((sum, c) => sum + (c.easeFactor || 2.5), 0);
        return Math.round((total / cards.length) * 100) / 100;
    }

    /**
     * Generate chart data for weekly activity
     */
    generateWeeklyChartData(rawData) {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const today = new Date();
        const labels = [];
        const studiedData = [];
        const learnedData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(days[date.getDay()]);

            const dayData = rawData?.find(d => {
                const dDate = new Date(d.date);
                return dDate.toDateString() === date.toDateString();
            });

            studiedData.push(dayData?.cardsStudied || 0);
            learnedData.push(dayData?.cardsLearned || 0);
        }

        return {
            labels,
            datasets: [
                {
                    label: 'Thẻ đã học',
                    data: studiedData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3B82F6',
                },
                {
                    label: 'Thẻ đã nhớ',
                    data: learnedData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10B981',
                }
            ]
        };
    }

    /**
     * Generate trend chart data
     */
    generateTrendChartData(rawData, weeks = 6) {
        const labels = [];
        const data = [];

        for (let i = weeks - 1; i >= 0; i--) {
            labels.push(`Tuần ${weeks - i}`);
            
            const weekData = rawData?.filter(d => {
                const date = new Date(d.date);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - (i + 1) * 7);
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() - i * 7);
                return date >= weekAgo && date < nextWeek;
            });

            if (weekData?.length > 0) {
                const retention = this.calculateRetention(weekData);
                data.push(retention);
            } else {
                data.push(data.length > 0 ? data[data.length - 1] : 0);
            }
        }

        return {
            labels,
            datasets: [{
                label: 'Tỷ lệ ghi nhớ (%)',
                data,
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
            }]
        };
    }

    /**
     * Generate rating distribution data
     */
    generateRatingDistribution(reviews) {
        const distribution = { 0: 0, 1: 0, 3: 0, 5: 0 };
        
        reviews?.forEach(r => {
            if (distribution[r.quality] !== undefined) {
                distribution[r.quality]++;
            }
        });

        return {
            labels: ['Quên', 'Khó', 'Tốt', 'Dễ'],
            values: Object.values(distribution),
            colors: [
                'rgba(239, 68, 68, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(59, 130, 246, 0.8)',
            ]
        };
    }

    /**
     * Get motivation message based on stats
     */
    getMotivationMessage(stats) {
        const streak = stats?.streak?.current || 0;
        const retention = stats?.averageRetention || 0;
        const cardsToday = stats?.today?.cardsStudied || 0;

        if (streak >= 30) return '🏆 Bạn là huyền thoại học tập!';
        if (streak >= 14) return '🌟 Phong độ xuất sắc!';
        if (streak >= 7) return '🔥 Một tuần liên tục! Tuyệt vời!';
        if (streak >= 3) return '💪 Đang có đà tốt!';
        if (cardsToday >= 50) return '⚡ Hôm nay bạn học rất chăm chỉ!';
        if (retention >= 90) return '🧠 Trí nhớ của bạn thật tuyệt vời!';
        if (cardsToday > 0) return '👍 Tiếp tục phát huy nhé!';
        return '📚 Bắt đầu học ngay hôm nay!';
    }

    /**
     * Get next milestone
     */
    getNextMilestone(currentStreak) {
        const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
        const next = milestones.find(m => m > currentStreak);
        
        if (!next) return null;
        
        const labels = {
            3: '3 ngày',
            7: '1 tuần',
            14: '2 tuần',
            30: '1 tháng',
            60: '2 tháng',
            90: '3 tháng',
            180: '6 tháng',
            365: '1 năm',
        };

        return {
            target: next,
            remaining: next - currentStreak,
            label: labels[next],
        };
    }

    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Default stats
     */
    getDefaultDashboardStats() {
        return {
            today: {
                cardsStudied: 0,
                cardsLearned: 0,
                reviewsCompleted: 0,
                studyTime: 0,
            },
            totals: {
                cards: 0,
                decks: 0,
                dueCards: 0,
            },
            streak: {
                current: 0,
                longest: 0,
            },
            weekly: [],
        };
    }

    getDefaultWeeklyStats(days = 7) {
        const result = [];
        for (let i = 0; i < days; i++) {
            result.push({
                date: new Date().toISOString(),
                cardsStudied: 0,
                cardsLearned: 0,
                reviewsCompleted: 0,
            });
        }
        return result;
    }

    getDefaultMonthlyStats() {
        return {
            totalReviews: 0,
            averageQuality: 0,
            totalCardsLearned: 0,
            dailyBreakdown: [],
        };
    }

    getDefaultStreakInfo() {
        return {
            currentStreak: 0,
            longestStreak: 0,
            decksWithStreak: 0,
            nextMilestone: null,
        };
    }

    getDefaultStudyTime(period) {
        const count = period === 'weekly' ? 7 : 30;
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push({ date: new Date().toISOString(), minutes: 0 });
        }
        return result;
    }
}

// Initialize stats service
let statsService;
document.addEventListener('DOMContentLoaded', () => {
    statsService = new StatsService();
    window.statsService = statsService;
    window.StatsService = StatsService;
});