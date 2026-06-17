// frontend/js/components/flashcard.js
class FlashcardComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            flipOnClick: true,
            flipOnSpace: true,
            showHintButton: true,
            autoFlip: false,
            autoFlipDelay: 5,
            animationDuration: 600,
            ...options,
        };

        this.isFlipped = false;
        this.currentCard = null;
        this.autoFlipTimer = null;
        this.onFlipCallbacks = [];
        this.onRateCallbacks = [];

        this.init();
    }

    init() {
        if (!this.container) return;

        this.setupEventListeners();
        this.renderEmpty();
    }

    setupEventListeners() {
        // Click to flip
        if (this.options.flipOnClick) {
            this.container.addEventListener('click', (e) => {
                // Don't flip if clicking buttons
                if (e.target.closest('button')) return;
                this.flip();
            });
        }

        // Space key to flip
        if (this.options.flipOnSpace) {
            document.addEventListener('keydown', (e) => {
                if (e.key === ' ' && !this.isFlipped) {
                    e.preventDefault();
                    this.flip();
                }
            });
        }

        // Number keys for rating
        document.addEventListener('keydown', (e) => {
            if (!this.isFlipped) return;
            
            const ratings = {
                '1': 0, // Again
                '2': 1, // Hard
                '3': 3, // Good
                '4': 5, // Easy
            };

            if (ratings[e.key] !== undefined) {
                e.preventDefault();
                this.rate(ratings[e.key]);
            }
        });
    }

    /**
     * Load a card
     */
    loadCard(card) {
        this.currentCard = card;
        this.isFlipped = false;
        
        this.clearAutoFlip();

        const html = `
            <div class="flashcard-wrapper">
                <div class="flashcard ${this.isFlipped ? 'flipped' : ''}">
                    <!-- Front Face -->
                    <div class="flashcard-face flashcard-front">
                        <div class="flashcard-header">
                            <span class="card-number">#${card.index || 1}</span>
                            ${card.difficulty ? `
                                <span class="badge badge-${this.getDifficultyClass(card.difficulty)}">
                                    ${card.difficulty}
                                </span>
                            ` : ''}
                        </div>
                        <div class="flashcard-content">
                            ${this.renderMathContent(card.frontText || card.question)}
                        </div>
                        <div class="flashcard-footer">
                            <span class="flip-hint">
                                <i class="fas fa-sync-alt fa-spin"></i>
                                Nhấn Space hoặc Click để lật thẻ
                            </span>
                        </div>
                    </div>

                    <!-- Back Face -->
                    <div class="flashcard-face flashcard-back">
                        <div class="flashcard-header">
                            <span class="card-number">Đáp án</span>
                            ${card.id ? `
                                <button class="btn-icon btn-sm edit-card-btn" data-card-id="${card.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="flashcard-content">
                            ${this.renderMathContent(card.backText || card.answer)}
                        </div>
                        ${this.options.showHintButton && card.hint ? `
                            <div class="flashcard-footer">
                                <button class="btn btn-sm btn-ghost show-hint-btn">
                                    <i class="fas fa-lightbulb"></i>
                                    Hiện gợi ý
                                </button>
                                <span class="hint-text hidden">${card.hint}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Rating Buttons -->
            <div class="rating-buttons ${this.isFlipped ? 'visible' : ''}">
                <button class="rate-btn rate-again" data-quality="0">
                    <i class="fas fa-redo"></i>
                    <div class="rate-info">
                        <strong>Quên</strong>
                        <small>&lt; 1 phút</small>
                    </div>
                </button>
                <button class="rate-btn rate-hard" data-quality="1">
                    <i class="fas fa-meh"></i>
                    <div class="rate-info">
                        <strong>Khó</strong>
                        <small>&lt; 10 phút</small>
                    </div>
                </button>
                <button class="rate-btn rate-good" data-quality="3">
                    <i class="fas fa-check"></i>
                    <div class="rate-info">
                        <strong>Tốt</strong>
                        <small>1 ngày</small>
                    </div>
                </button>
                <button class="rate-btn rate-easy" data-quality="5">
                    <i class="fas fa-star"></i>
                    <div class="rate-info">
                        <strong>Dễ</strong>
                        <small>3 ngày</small>
                    </div>
                </button>
            </div>
        `;

        this.container.innerHTML = html;

        // Setup rating buttons
        this.container.querySelectorAll('.rate-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const quality = parseInt(btn.dataset.quality);
                this.rate(quality);
            });
        });

        // Setup hint button
        const hintBtn = this.container.querySelector('.show-hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hintText = this.container.querySelector('.hint-text');
                if (hintText) {
                    hintText.classList.toggle('hidden');
                    hintBtn.innerHTML = hintText.classList.contains('hidden')
                        ? '<i class="fas fa-lightbulb"></i> Hiện gợi ý'
                        : '<i class="fas fa-lightbulb"></i> Ẩn gợi ý';
                }
            });
        }

        // Auto flip if enabled
        if (this.options.autoFlip) {
            this.startAutoFlip();
        }

        // Render KaTeX
        this.renderKaTeX();
    }

    /**
     * Flip the card
     */
    flip() {
        if (this.isFlipped) return;

        this.isFlipped = true;
        this.clearAutoFlip();

        const flashcard = this.container.querySelector('.flashcard');
        const ratingButtons = this.container.querySelector('.rating-buttons');

        if (flashcard) {
            flashcard.classList.add('flipped');
        }

        setTimeout(() => {
            if (ratingButtons) {
                ratingButtons.classList.add('visible');
            }
        }, 300);

        // Trigger callbacks
        this.onFlipCallbacks.forEach(cb => cb(this.currentCard));
    }

    /**
     * Rate the current card
     */
    rate(quality) {
        if (!this.isFlipped || !this.currentCard) return;

        // Visual feedback
        this.showRateFeedback(quality);

        // Trigger callbacks
        this.onRateCallbacks.forEach(cb => cb(quality, this.currentCard));

        // Disable rating buttons
        const ratingButtons = this.container.querySelector('.rating-buttons');
        if (ratingButtons) {
            ratingButtons.querySelectorAll('.rate-btn').forEach(btn => {
                btn.disabled = true;
                btn.style.pointerEvents = 'none';
                if (parseInt(btn.dataset.quality) === quality) {
                    btn.style.borderColor = 'var(--color-primary)';
                    btn.style.background = 'var(--color-primary-bg)';
                } else {
                    btn.style.opacity = '0.5';
                }
            });
        }
    }

    /**
     * Show feedback animation
     */
    showRateFeedback(quality) {
        const feedbacks = {
            0: { text: 'Sẽ quay lại! 💪', color: 'var(--color-danger)' },
            1: { text: 'Cố lên! 📚', color: 'var(--color-warning)' },
            3: { text: 'Tốt! ⭐', color: 'var(--color-success)' },
            5: { text: 'Xuất sắc! 🚀', color: 'var(--color-primary)' },
        };

        const feedback = feedbacks[quality] || feedbacks[3];
        
        const element = document.createElement('div');
        element.className = 'rating-feedback';
        element.textContent = feedback.text;
        element.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.5rem;
            font-weight: bold;
            color: ${feedback.color};
            z-index: 10;
            pointer-events: none;
            animation: popIn 0.3s ease, fadeOut 0.3s ease 1.2s forwards;
        `;

        this.container.appendChild(element);

        setTimeout(() => element.remove(), 1500);
    }

    /**
     * Start auto flip timer
     */
    startAutoFlip() {
        this.clearAutoFlip();
        this.autoFlipTimer = setTimeout(() => {
            this.flip();
        }, this.options.autoFlipDelay * 1000);
    }

    /**
     * Clear auto flip timer
     */
    clearAutoFlip() {
        if (this.autoFlipTimer) {
            clearTimeout(this.autoFlipTimer);
            this.autoFlipTimer = null;
        }
    }

    /**
     * Register flip callback
     */
    onFlip(callback) {
        this.onFlipCallbacks.push(callback);
    }

    /**
     * Register rate callback
     */
    onRate(callback) {
        this.onRateCallbacks.push(callback);
    }

    /**
     * Render empty state
     */
    renderEmpty() {
        this.container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clone"></i>
                <h3>Chưa có thẻ nào</h3>
                <p>Chọn một bộ thẻ để bắt đầu ôn tập</p>
            </div>
        `;
    }

    /**
     * Render math content
     */
    renderMathContent(text) {
        if (!text) return '';
        
        // Replace math delimiters for KaTeX
        return text
            .replace(/\$\$(.*?)\$\$/g, (_, formula) => {
                try {
                    return `<div class="math-block">${katex.renderToString(formula, {
                        throwOnError: false,
                        displayMode: true
                    })}</div>`;
                } catch {
                    return `<code>${formula}</code>`;
                }
            })
            .replace(/\$(.*?)\$/g, (_, formula) => {
                try {
                    return katex.renderToString(formula, {
                        throwOnError: false,
                        displayMode: false
                    });
                } catch {
                    return `<code>${formula}</code>`;
                }
            });
    }

    /**
     * Render KaTeX elements
     */
    renderKaTeX() {
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(this.container, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                ],
                throwOnError: false
            });
        }
    }

    /**
     * Get difficulty CSS class
     */
    getDifficultyClass(difficulty) {
        const map = {
            EASY: 'success',
            MEDIUM: 'warning',
            HARD: 'danger',
        };
        return map[difficulty] || 'info';
    }

    /**
     * Update options
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Destroy component
     */
    destroy() {
        this.clearAutoFlip();
        this.onFlipCallbacks = [];
        this.onRateCallbacks = [];
        this.container.innerHTML = '';
    }
}

// Export
window.FlashcardComponent = FlashcardComponent;