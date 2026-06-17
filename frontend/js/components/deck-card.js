// frontend/js/components/deck-card.js
class DeckCardComponent {
    constructor(deck) {
        this.deck = deck;
        this.element = null;
        this.render();
    }

    render() {
        const template = document.getElementById('deckCardTemplate');
        if (!template) {
            this.createFromScratch();
            return;
        }

        const clone = template.content.cloneNode(true);
        this.element = clone.querySelector('.deck-card');
        
        this.updateContent();
        this.setupEventListeners();
    }

    createFromScratch() {
        this.element = document.createElement('div');
        this.element.className = 'deck-card';
        this.element.setAttribute('data-deck-id', this.deck.id);
        
        const daysUntilExam = this.deck.examDate 
            ? Math.ceil((new Date(this.deck.examDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null;
        const isUrgent = daysUntilExam !== null && daysUntilExam <= 7 && daysUntilExam > 0;
        const cardCount = this.deck._count?.flashcards || this.deck.cardCount || 0;
        const lastStudied = this.deck.lastStudied 
            ? Helpers.timeAgo(new Date(this.deck.lastStudied))
            : 'Chưa học';

        this.element.innerHTML = `
            <div class="deck-card-header" style="background: linear-gradient(135deg, ${this.deck.color || '#3B82F6'}, ${this.adjustColor(this.deck.color || '#3B82F6', -20)})">
                <span class="deck-icon">${this.deck.icon || '📚'}</span>
                ${this.deck.isFavorite ? '<span class="favorite-badge">⭐</span>' : ''}
                ${isUrgent ? `<span class="urgent-badge">🚨 Còn ${daysUntilExam} ngày</span>` : ''}
                <button class="deck-menu-btn" onclick="event.stopPropagation()">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
            <div class="deck-card-body" onclick="window.location.href='study.html?deckId=${this.deck.id}'">
                <h3 class="deck-name">${Helpers.escapeHtml(this.deck.name)}</h3>
                <p class="deck-description">${Helpers.truncate(this.deck.description || 'Chưa có mô tả', 80)}</p>
                <div class="deck-card-stats">
                    <span><i class="fas fa-clone"></i> ${cardCount} thẻ</span>
                    <span><i class="fas fa-clock"></i> ${lastStudied}</span>
                </div>
                ${this.deck.examDate ? `
                    <div class="deck-exam-info">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Thi: ${Helpers.formatDate(this.deck.examDate, 'SHORT')}</span>
                    </div>
                ` : ''}
            </div>
        `;

        this.setupEventListeners();
    }

    updateContent() {
        if (!this.element) return;
        
        // Update header color
        const header = this.element.querySelector('.deck-card-header');
        if (header) {
            header.style.background = `linear-gradient(135deg, ${this.deck.color || '#3B82F6'}, ${this.adjustColor(this.deck.color || '#3B82F6', -20)})`;
        }

        // Update icon
        const icon = this.element.querySelector('.deck-icon');
        if (icon) icon.textContent = this.deck.icon || '📚';

        // Update name
        const name = this.element.querySelector('.deck-name');
        if (name) name.textContent = this.deck.name;

        // Update description
        const desc = this.element.querySelector('.deck-description');
        if (desc) desc.textContent = Helpers.truncate(this.deck.description || 'Chưa có mô tả', 80);

        // Update stats
        const cardCount = this.element.querySelector('.card-count');
        if (cardCount) cardCount.textContent = this.deck._count?.flashcards || this.deck.cardCount || 0;

        const lastStudied = this.element.querySelector('.last-studied-text');
        if (lastStudied) {
            lastStudied.textContent = this.deck.lastStudied 
                ? Helpers.timeAgo(new Date(this.deck.lastStudied))
                : 'Chưa học';
        }

        // Update exam date
        const examInfo = this.element.querySelector('.deck-exam-info');
        const examDateText = this.element.querySelector('.exam-date-text');
        if (examInfo && examDateText && this.deck.examDate) {
            examInfo.classList.remove('hidden');
            examDateText.textContent = `Thi: ${Helpers.formatDate(this.deck.examDate, 'SHORT')}`;
        }

        // Update favorite badge
        const favBadge = this.element.querySelector('.favorite-badge');
        if (favBadge) {
            this.deck.isFavorite ? favBadge.classList.remove('hidden') : favBadge.classList.add('hidden');
        }

        // Update urgent badge
        const urgentBadge = this.element.querySelector('.urgent-badge');
        if (urgentBadge && this.deck.examDate) {
            const daysUntil = Math.ceil((new Date(this.deck.examDate) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntil <= 7 && daysUntil > 0) {
                urgentBadge.classList.remove('hidden');
                urgentBadge.textContent = `🚨 Còn ${daysUntil} ngày`;
            } else {
                urgentBadge.classList.add('hidden');
            }
        }
    }

    setupEventListeners() {
        if (!this.element) return;

        // Click to study
        this.element.addEventListener('click', (e) => {
            if (!e.target.closest('.deck-menu-btn')) {
                window.location.href = `study.html?deckId=${this.deck.id}`;
            }
        });

        // Menu button
        const menuBtn = this.element.querySelector('.deck-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showContextMenu(e);
            });
        }
    }

    showContextMenu(event) {
        // Remove existing menus
        document.querySelectorAll('.context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <button class="context-menu-item" data-action="study">
                <i class="fas fa-play"></i> Học ngay
            </button>
            <button class="context-menu-item" data-action="edit">
                <i class="fas fa-edit"></i> Chỉnh sửa
            </button>
            <button class="context-menu-item" data-action="favorite">
                <i class="fas fa-star"></i> ${this.deck.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
            </button>
            <div class="context-menu-divider"></div>
            <button class="context-menu-item" data-action="duplicate">
                <i class="fas fa-copy"></i> Nhân bản
            </button>
            <button class="context-menu-item" data-action="export">
                <i class="fas fa-download"></i> Xuất file
            </button>
            <div class="context-menu-divider"></div>
            <button class="context-menu-item danger" data-action="delete">
                <i class="fas fa-trash"></i> Xóa
            </button>
        `;

        // Position
        menu.style.top = `${event.clientY}px`;
        menu.style.left = `${event.clientX - 180}px`;

        document.body.appendChild(menu);

        // Event delegation
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action) {
                this.handleAction(action);
                menu.remove();
            }
        });

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function close() {
                menu.remove();
                document.removeEventListener('click', close);
            }, { once: true });
        }, 0);
    }

    async handleAction(action) {
        switch (action) {
            case 'study':
                window.location.href = `study.html?deckId=${this.deck.id}`;
                break;
            case 'edit':
                this.emit('edit', this.deck);
                break;
            case 'favorite':
                await deckService.toggleFavorite(this.deck.id);
                this.deck.isFavorite = !this.deck.isFavorite;
                this.updateContent();
                this.emit('favoriteToggled', this.deck);
                break;
            case 'duplicate':
                await deckService.duplicateDeck(this.deck.id);
                this.emit('duplicated', this.deck);
                break;
            case 'export':
                const data = await deckService.exportDeck(this.deck.id);
                Helpers.downloadFile(JSON.stringify(data, null, 2), `${this.deck.name}.json`);
                break;
            case 'delete':
                if (confirm(`Xóa "${this.deck.name}"?`)) {
                    await deckService.deleteDeck(this.deck.id);
                    this.element?.remove();
                    this.emit('deleted', this.deck);
                }
                break;
        }
    }

    adjustColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, Math.min(255, (num >> 16) + amt));
        const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
        const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    on(event, callback) {
        if (!this._events) this._events = {};
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(callback);
    }

    emit(event, data) {
        if (this._events?.[event]) {
            this._events[event].forEach(cb => cb(data));
        }
    }

    mount(container) {
        if (container && this.element) {
            container.appendChild(this.element);
        }
    }

    destroy() {
        this.element?.remove();
        this.element = null;
    }
}

window.DeckCardComponent = DeckCardComponent;