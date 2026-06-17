// frontend/js/services/study.service.js
class StudyService {
    constructor() {
        this.currentSession = null;
        this.sessionStartTime = null;
        this.cardsStudied = 0;
        this.cardsLearned = 0;
        this.totalTime = 0;
    }

    /**
     * Start a study session
     */
    async startSession(deckId) {
        try {
            const response = await api.get(`/study/start/${deckId}`);
            
            if (response.success) {
                this.currentSession = {
                    deckId,
                    deck: response.data.deck,
                    cards: response.data.cards,
                    totalCards: response.data.session.totalCards,
                    isCramMode: response.data.deck.isCramMode,
                    startTime: new Date()
                };
                this.sessionStartTime = new Date();
                this.cardsStudied = 0;
                this.cardsLearned = 0;
                
                return this.currentSession;
            }
        } catch (error) {
            console.error('Error starting study session:', error);
            throw error;
        }
    }

    /**
     * Review a card
     */
    async reviewCard(cardId, quality) {
        try {
            const response = await api.post(`/study/review/${cardId}`, { quality });
            
            if (response.success) {
                this.cardsStudied++;
                if (quality >= 3) {
                    this.cardsLearned++;
                }
                return response.data;
            }
        } catch (error) {
            console.error('Error reviewing card:', error);
            throw error;
        }
    }

    /**
     * Get study statistics
     */
    async getStats() {
        try {
            const response = await api.get('/study/stats');
            return response.data;
        } catch (error) {
            console.error('Error getting study stats:', error);
            return null;
        }
    }

    /**
     * Get due cards
     */
    async getDueCards() {
        try {
            const response = await api.get('/study/due-cards');
            return response.data;
        } catch (error) {
            console.error('Error getting due cards:', error);
            return [];
        }
    }

    /**
     * Get deck progress
     */
    async getDeckProgress(deckId) {
        try {
            const response = await api.get(`/study/progress/${deckId}`);
            return response.data;
        } catch (error) {
            console.error('Error getting deck progress:', error);
            return null;
        }
    }

    /**
     * Get session summary
     */
    getSessionSummary() {
        if (!this.currentSession) return null;

        const endTime = new Date();
        const duration = Math.round((endTime - this.sessionStartTime) / 1000); // seconds
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        return {
            deckName: this.currentSession.deck.name,
            totalCards: this.currentSession.totalCards,
            cardsStudied: this.cardsStudied,
            cardsLearned: this.cardsLearned,
            retentionRate: this.cardsStudied > 0 
                ? Math.round((this.cardsLearned / this.cardsStudied) * 100) 
                : 0,
            duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            durationSeconds: duration,
            isCramMode: this.currentSession.isCramMode
        };
    }

    /**
     * End current session
     */
    endSession() {
        const summary = this.getSessionSummary();
        this.currentSession = null;
        this.sessionStartTime = null;
        return summary;
    }

    /**
     * Check if cram mode should be activated
     */
    shouldActivateCramMode(examDate) {
        if (!examDate) return false;
        const daysUntil = Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 7 && daysUntil > 0;
    }

    /**
     * Get days until exam
     */
    getDaysUntilExam(examDate) {
        if (!examDate) return null;
        return Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24));
    }

    /**
     * Get cram mode intervals
     */
    getCramIntervals() {
        return {
            AGAIN: 1,    // 1 minute
            HARD: 5,     // 5 minutes
            GOOD: 10,    // 10 minutes
            EASY: 20,    // 20 minutes
        };
    }

    /**
     * Get normal mode intervals
     */
    getNormalIntervals() {
        return {
            AGAIN: '< 1 phút',
            HARD: '< 10 phút',
            GOOD: '1 ngày',
            EASY: '3 ngày',
        };
    }

    /**
     * Shuffle cards using Fisher-Yates algorithm
     */
    shuffleCards(cards) {
        const shuffled = [...cards];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Sort cards by priority
     */
    sortByPriority(cards) {
        return [...cards].sort((a, b) => {
            // Due cards first
            const aDue = new Date(a.nextReview) <= new Date();
            const bDue = new Date(b.nextReview) <= new Date();
            
            if (aDue && !bDue) return -1;
            if (!aDue && bDue) return 1;
            
            // Lower ease factor = harder = review first
            return (a.easeFactor || 2.5) - (b.easeFactor || 2.5);
        });
    }

    /**
     * Get quality feedback message
     */
    getFeedbackMessage(quality) {
        const messages = {
            0: { text: 'Sẽ quay lại sau! 💪', color: 'var(--color-danger)' },
            1: { text: 'Cố lên nhé! 📚', color: 'var(--color-warning)' },
            3: { text: 'Tốt lắm! ⭐', color: 'var(--color-success)' },
            5: { text: 'Xuất sắc! 🚀', color: 'var(--color-primary)' },
        };
        return messages[quality] || messages[3];
    }

    /**
     * Estimate study time
     */
    estimateStudyTime(cardCount, avgTimePerCard = 30) {
        const totalSeconds = cardCount * avgTimePerCard;
        const minutes = Math.ceil(totalSeconds / 60);
        
        if (minutes < 60) {
            return `${minutes} phút`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours} giờ ${remainingMinutes > 0 ? remainingMinutes + ' phút' : ''}`;
    }

    /**
     * Track study time
     */
    startTracking() {
        this.sessionStartTime = new Date();
    }

    getElapsedTime() {
        if (!this.sessionStartTime) return '00:00';
        const elapsed = Math.floor((new Date() - this.sessionStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

const studyService = new StudyService();
window.studyService = studyService;