// frontend/js/pages/study.js
class StudySession {
    constructor() {
        this.deck = null;
        this.cards = [];
        this.originalCards = [];
        this.currentIndex = 0;
        this.isFlipped = false;
        this.isCramMode = false;
        this.autoFlipEnabled = false;
        this.autoFlipDelay = 5;
        this.autoFlipTimer = null;
        this.showHint = true;
        this.isShuffled = false;
        this.studyStartTime = null;
        this.timerInterval = null;
        this.cardsStudied = 0;
        this.cardsLearned = 0;

        this.init();
    }

    async init() {
        await this.loadUserData();
        const params = new URLSearchParams(window.location.search);
        const deckId = params.get('deckId');

        if (deckId) {
            await this.loadDeck(deckId);
        } else {
            // Hiển thị danh sách ưu tiên
            await this.loadPriorityDecks();
        }

        this.setupEventListeners();
        this.startTimer();
        this.renderKaTeX();
    }

    async loadUserData() {
        try {
            const response = await api.getProfile();
            const user = response.data;
            document.getElementById('sidebarUsername').textContent = user.username;
            document.getElementById('sidebarEmail').textContent = user.email;
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }

    // ===================== HIỂN THỊ DANH SÁCH ƯU TIÊN =====================
    async loadPriorityDecks() {
        try {
            const response = await api.getDecks({ limit: 50 });
            let decks = response.data || [];

            // Tính điểm ưu tiên: 
            // - Có lịch thi càng gần: điểm cao
            // - Số thẻ cần ôn (chưa học hoặc due) càng nhiều: điểm cao
            // - Độ khó trung bình của thẻ càng cao: điểm cao
            const now = new Date();
            const priorityDecks = decks.map(deck => {
                let score = 0;
                if (deck.examDate) {
                    const days = Math.ceil((new Date(deck.examDate) - now) / (1000 * 60 * 60 * 24));
                    if (days > 0 && days <= 7) score += 100 - days * 10; // ưu tiên cực cao
                    else if (days > 0) score += 50 - days * 0.5;
                }
                // Số thẻ cần ôn (giả sử lấy từ cardCount)
                const cardCount = deck._count?.flashcards || deck.cardCount || 0;
                score += cardCount * 2;

                // Độ khó trung bình (nếu có dữ liệu)
                // ... có thể lấy thêm từ API

                return { ...deck, priority: score };
            });

            priorityDecks.sort((a, b) => b.priority - a.priority);

            this.renderPriorityDecks(priorityDecks);

        } catch (error) {
            console.error('Error loading priority decks:', error);
            document.getElementById('priorityDecks').innerHTML = '<p class="text-muted">Không thể tải danh sách bộ thẻ</p>';
        }
    }

    renderPriorityDecks(decks) {
        const container = document.getElementById('priorityDecks');
        if (!container) return;

        if (decks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <h3>Chưa có bộ thẻ nào</h3>
                    <p>Hãy tạo bộ thẻ đầu tiên để bắt đầu ôn tập</p>
                </div>
            `;
            return;
        }

        container.innerHTML = decks.map(deck => {
            const cardCount = deck._count?.flashcards || deck.cardCount || 0;
            const daysUntilExam = deck.examDate 
                ? Math.ceil((new Date(deck.examDate) - new Date()) / (1000 * 60 * 60 * 24))
                : null;
            const isUrgent = daysUntilExam !== null && daysUntilExam <= 7 && daysUntilExam > 0;

            return `
                <div class="priority-deck-item" data-deck-id="${deck.id}">
                    <div class="deck-icon">${deck.icon || '📚'}</div>
                    <div class="deck-info">
                        <h4>${Helpers.escapeHtml(deck.name)}</h4>
                        <p>${Helpers.truncate(deck.description || 'Chưa có mô tả', 60)}</p>
                        <div class="deck-meta">
                            <span><i class="fas fa-clone"></i> ${cardCount} thẻ</span>
                            ${deck.examDate ? `
                                <span class="${isUrgent ? 'text-danger' : 'text-muted'}">
                                    <i class="fas fa-calendar-alt"></i> 
                                    ${isUrgent ? `🚨 Còn ${daysUntilExam} ngày` : `Thi: ${Helpers.formatDate(deck.examDate, 'SHORT')}`}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="studySession.startDeck('${deck.id}')">
                        <i class="fas fa-play"></i> Ôn tập
                    </button>
                </div>
            `;
        }).join('');
    }

    // ===================== BẮT ĐẦU HỌC =====================
    async startDeck(deckId) {
        await this.loadDeck(deckId);
        // Ẩn danh sách, hiện flashcard
        document.querySelector('.priority-decks-section').style.display = 'none';
        document.getElementById('flashcardArea').classList.remove('hidden');
    }

    async loadDeck(deckId) {
        try {
            const response = await api.startStudy(deckId);
            const { deck, cards, session } = response.data;
            
            this.deck = deck;
            this.cards = cards;
            this.originalCards = [...cards];
            this.isCramMode = deck.isCramMode || false;
            
            this.updateDeckInfo();
            this.updateProgress();
            
            if (this.isCramMode) {
                this.showCramBanner();
            }
            
            if (this.isShuffled) {
                this.shuffleCards();
            }
            
            if (cards.length > 0) {
                this.loadCard(0);
            } else {
                this.showSessionComplete();
            }
            
        } catch (error) {
            console.error('Error loading deck:', error);
            this.showToast('Không thể tải bộ thẻ', 'error');
        }
    }

    updateDeckInfo() {
        document.getElementById('deckName').textContent = this.deck.name;
        document.getElementById('deckMeta').textContent = 
            `${this.cards.length} thẻ • ${this.deck.isCramMode ? 'Chế độ cấp tốc' : 'Học bình thường'}`;
        document.getElementById('totalCards').textContent = this.cards.length;
    }

    loadCard(index) {
        if (index >= this.cards.length) {
            this.showSessionComplete();
            return;
        }

        this.currentIndex = index;
        this.isFlipped = false;
        
        const card = this.cards[index];
        const flashcard = document.getElementById('flashcard');
        
        flashcard.classList.remove('flipped');
        document.getElementById('ratingButtons').classList.add('hidden');
        document.getElementById('cardHint').classList.add('hidden');
        
        document.getElementById('cardQuestion').innerHTML = Helpers.renderMath(card.frontText);
        document.getElementById('cardAnswer').innerHTML = Helpers.renderMath(card.backText);
        document.getElementById('cardHint').textContent = card.hint || 'Không có gợi ý';
        document.getElementById('cardNumber').textContent = `#${index + 1}`;
        
        const difficultyBadge = document.getElementById('cardDifficulty');
        if (card.difficulty) {
            const diff = Helpers.getDifficultyLabel(card.difficulty);
            difficultyBadge.textContent = diff.text;
            difficultyBadge.className = `badge badge-${diff.color} card-difficulty`;
            difficultyBadge.classList.remove('hidden');
        } else {
            difficultyBadge.classList.add('hidden');
        }
        
        this.updateRatingLabels();
        this.updateProgress();
        this.renderKaTeX();
        
        if (this.autoFlipEnabled) {
            this.startAutoFlipTimer();
        }
    }

    flipCard() {
        if (this.isFlipped) return;
        this.isFlipped = true;
        document.getElementById('flashcard').classList.add('flipped');
        setTimeout(() => {
            document.getElementById('ratingButtons').classList.remove('hidden');
        }, 300);
        if (this.showHint) {
            document.getElementById('showHintBtn')?.classList.remove('hidden');
        }
        if (this.autoFlipTimer) {
            clearTimeout(this.autoFlipTimer);
        }
    }

    async rateCard(quality) {
        if (!this.isFlipped) return;
        
        const card = this.cards[this.currentIndex];
        try {
            await api.reviewCard(card.id, quality);
            this.cardsStudied++;
            if (quality >= 3) this.cardsLearned++;
            this.updateFooterStats();
            this.showRatingFeedback(quality);
            setTimeout(() => {
                this.loadCard(this.currentIndex + 1);
            }, 500);
        } catch (error) {
            console.error('Error rating card:', error);
            this.loadCard(this.currentIndex + 1);
        }
    }

    showRatingFeedback(quality) {
        const feedback = {
            0: { text: 'Sẽ quay lại sau! 💪', color: 'var(--color-danger)' },
            1: { text: 'Cố lên nhé! 📚', color: 'var(--color-warning)' },
            3: { text: 'Tốt lắm! ⭐', color: 'var(--color-success)' },
            5: { text: 'Xuất sắc! 🚀', color: 'var(--color-primary)' }
        };

        const fb = feedback[quality];
        const toast = document.createElement('div');
        toast.className = 'rating-feedback';
        toast.textContent = fb.text;
        toast.style.color = fb.color;
        document.querySelector('.flashcard-area').appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 1500);
    }

    updateProgress() {
        const progress = this.cards.length > 0 
            ? ((this.currentIndex) / this.cards.length) * 100 
            : 0;
        document.getElementById('studyProgressFill').style.width = `${progress}%`;
        document.getElementById('cardsStudied').textContent = this.currentIndex;
    }

    updateFooterStats() {
        document.getElementById('learnedDisplay').textContent = `${this.cardsLearned} đã nhớ`;
    }

    updateRatingLabels() {
        const intervals = this.isCramMode 
            ? ['< 1 phút', '< 5 phút', '< 10 phút', '< 20 phút']
            : ['< 1 phút', '< 10 phút', '1 ngày', '3 ngày'];
        document.querySelectorAll('.rate-info small').forEach((el, i) => {
            el.textContent = intervals[i];
        });
    }

    showCramBanner() {
        const banner = document.getElementById('cramBanner');
        if (banner) {
            banner.classList.remove('hidden');
            const daysUntil = this.deck.examDate 
                ? Math.ceil((new Date(this.deck.examDate) - new Date()) / (1000 * 60 * 60 * 24))
                : 0;
            document.getElementById('cramDays').textContent = daysUntil;
            document.getElementById('cramDueCards').textContent = this.cards.length;
        }
    }

    setupEventListeners() {
        document.getElementById('flashcard')?.addEventListener('click', () => {
            if (!this.isFlipped) this.flipCard();
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea')) return;
            if (!this.isFlipped) {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    this.flipCard();
                }
            } else {
                switch(e.key) {
                    case '1': this.rateCard(0); break;
                    case '2': this.rateCard(1); break;
                    case '3': this.rateCard(3); break;
                    case '4': this.rateCard(5); break;
                }
            }
        });

        document.getElementById('showHintBtn')?.addEventListener('click', () => {
            document.getElementById('cardHint').classList.toggle('hidden');
        });

        document.getElementById('shuffleBtn')?.addEventListener('click', () => this.toggleShuffle());
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            document.getElementById('studySettingsModal').classList.remove('hidden');
        });

        document.getElementById('autoFlipToggle')?.addEventListener('change', (e) => {
            this.autoFlipEnabled = e.target.checked;
            document.getElementById('autoFlipStatus').textContent = `Tự động lật: ${this.autoFlipEnabled ? 'Bật' : 'Tắt'}`;
        });

        document.getElementById('autoFlipDelay')?.addEventListener('change', (e) => {
            this.autoFlipDelay = parseInt(e.target.value);
        });

        document.getElementById('showHintToggle')?.addEventListener('change', (e) => {
            this.showHint = e.target.checked;
        });

        document.getElementById('shuffleToggle')?.addEventListener('change', (e) => {
            this.toggleShuffle();
        });

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal-overlay').classList.add('hidden');
            });
        });
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        const shuffleToggle = document.getElementById('shuffleToggle');
        if (shuffleToggle) shuffleToggle.checked = this.isShuffled;
        
        if (this.isShuffled) {
            this.shuffleCards();
            this.showToast('Đã trộn thẻ ngẫu nhiên', 'info');
        } else {
            this.cards = [...this.originalCards];
            this.showToast('Đã sắp xếp theo thứ tự gốc', 'info');
        }
        if (this.cards.length > 0) this.loadCard(0);
    }

    shuffleCards() {
        const shuffled = [...this.cards];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        this.cards = shuffled;
    }

    startAutoFlipTimer() {
        if (this.autoFlipTimer) clearTimeout(this.autoFlipTimer);
        this.autoFlipTimer = setTimeout(() => {
            if (!this.isFlipped) this.flipCard();
        }, this.autoFlipDelay * 1000);
    }

    startTimer() {
        this.studyStartTime = new Date();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((new Date() - this.studyStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timeDisplay').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    showSessionComplete() {
        document.getElementById('sessionComplete').classList.remove('hidden');
        document.querySelector('.flashcard-area').style.display = 'none';
        document.getElementById('ratingButtons').classList.add('hidden');
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        const elapsed = Math.floor((new Date() - this.studyStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        document.getElementById('sessionStats').innerHTML = `
            <div class="session-stat"><span class="stat-value">${this.cardsStudied}</span><span class="stat-label">Thẻ đã học</span></div>
            <div class="session-stat"><span class="stat-value">${this.cardsLearned}</span><span class="stat-label">Thẻ đã nhớ</span></div>
            <div class="session-stat"><span class="stat-value">${minutes} phút</span><span class="stat-label">Thời gian học</span></div>
        `;
    }

    renderKaTeX() {
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(document.body, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false
            });
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

let studySession;
document.addEventListener('DOMContentLoaded', () => {
    studySession = new StudySession();
    window.studySession = studySession;
});