// frontend/js/pages/deck-detail.js
class DeckDetailPage {
    constructor() {
        this.deckId = null;
        this.deck = null;
        this.cards = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.searchQuery = '';
        this.editingCardId = null;
        this.init();
    }

    async init() {
        const params = new URLSearchParams(window.location.search);
        this.deckId = params.get('id');
        if (!this.deckId) {
            window.location.href = 'decks.html';
            return;
        }

        await this.loadUserData();
        await this.loadDeck();
        await this.loadCards();
        this.setupEventListeners();
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

    async loadDeck() {
        try {
            const response = await api.getDeck(this.deckId);
            this.deck = response.data;
            this.renderDeckHeader();
        } catch (error) {
            console.error('Error loading deck:', error);
            window.location.href = 'decks.html';
        }
    }

    renderDeckHeader() {
        const header = document.getElementById('deckHeader');
        document.getElementById('deckNameBreadcrumb').textContent = this.deck.name;

        const daysUntilExam = this.deck.examDate 
            ? Math.ceil((new Date(this.deck.examDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null;
        const isUrgent = daysUntilExam !== null && daysUntilExam <= 7 && daysUntilExam > 0;

        header.innerHTML = `
            <div class="deck-header-content">
                <div class="deck-header-top">
                    <div class="deck-header-icon" style="background: ${this.deck.color}20; color: ${this.deck.color}">
                        ${this.deck.icon || '📚'}
                    </div>
                    <div class="deck-header-info">
                        <h1>${Helpers.escapeHtml(this.deck.name)}</h1>
                        <p>${Helpers.escapeHtml(this.deck.description || 'Chưa có mô tả')}</p>
                        <div class="deck-header-meta">
                            <span class="meta-item"><i class="fas fa-clone"></i> ${this.deck.cardCount || 0} thẻ</span>
                            ${this.deck.lastStudied ? `<span class="meta-item"><i class="fas fa-clock"></i> Học lần cuối: ${Helpers.timeAgo(this.deck.lastStudied)}</span>` : ''}
                            ${this.deck.examDate ? `
                                <span class="meta-item ${isUrgent ? 'urgent' : ''}">
                                    <i class="fas fa-calendar-alt"></i>
                                    ${isUrgent ? `🚨 Còn ${daysUntilExam} ngày` : `Thi: ${Helpers.formatDate(this.deck.examDate, 'SHORT')}`}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="deck-header-actions">
                    <button class="btn btn-primary" onclick="window.location.href='study.html?deckId=${this.deckId}'"><i class="fas fa-play"></i> Học Ngay</button>
                    <button class="btn btn-outline" id="editDeckBtn"><i class="fas fa-edit"></i> Chỉnh sửa</button>
                    <button class="btn btn-outline" id="deleteDeckBtn"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }

    async loadCards(page = 1) {
        try {
            const response = await api.get(`/decks/${this.deckId}/flashcards`, {
                page,
                limit: 20,
                search: this.searchQuery,
                sortBy: 'createdAt',
                order: 'desc'
            });
            this.cards = response.data.cards || response.data || [];
            this.currentPage = response.data.pagination?.page || page;
            this.totalPages = response.data.pagination?.totalPages || 1;
            this.renderCards();
            this.renderPagination();
            this.updateDeckStats();
        } catch (error) {
            console.error('Error loading cards:', error);
        }
    }

    renderCards() {
        const container = document.getElementById('cardsList');
        const emptyState = document.getElementById('emptyCards');

        if (this.cards.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        emptyState.classList.add('hidden');

        container.innerHTML = this.cards.map((card, index) => `
            <div class="card-item" data-card-id="${card.id}">
                <div class="card-item-number">#${(this.currentPage - 1) * 20 + index + 1}</div>
                <div class="card-item-content">
                    <div class="card-item-front"><strong>Q:</strong> ${Helpers.renderMath(card.frontText)}</div>
                    <div class="card-item-back"><strong>A:</strong> ${Helpers.renderMath(card.backText)}</div>
                    ${card.hint ? `<div class="card-item-hint">💡 ${card.hint}</div>` : ''}
                </div>
                <div class="card-item-meta">
                    <span class="badge badge-${card.difficulty === 'EASY' ? 'success' : card.difficulty === 'HARD' ? 'danger' : 'warning'}">${Helpers.getDifficultyLabel(card.difficulty).text}</span>
                    <span class="card-stats"><i class="fas fa-redo"></i> ${card.totalReviews || 0} <i class="fas fa-check"></i> ${card.correctCount || 0}</span>
                </div>
                <div class="card-item-actions">
                    <button class="btn-icon btn-sm" onclick="deckDetailPage.editCard('${card.id}')" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-sm" onclick="deckDetailPage.deleteCard('${card.id}')" title="Xóa"><i class="fas fa-trash" style="color: var(--color-danger)"></i></button>
                </div>
            </div>
        `).join('');
    }

    renderPagination() {
        const container = document.getElementById('cardsPagination');
        if (!container || this.totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        let html = '';
        html += `<button class="btn btn-sm btn-secondary" ${this.currentPage === 1 ? 'disabled' : ''} onclick="deckDetailPage.loadCards(${this.currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `<button class="btn btn-sm ${i === this.currentPage ? 'btn-primary' : 'btn-secondary'}" onclick="deckDetailPage.loadCards(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span>...</span>';
            }
        }
        html += `<button class="btn btn-sm btn-secondary" ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="deckDetailPage.loadCards(${this.currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        container.innerHTML = html;
    }

    updateDeckStats() {
        const total = this.cards.length;
        const newCards = this.cards.filter(c => c.repetitions === 0).length;
        const learning = this.cards.filter(c => c.repetitions > 0 && c.interval < 21).length;
        const mastered = this.cards.filter(c => c.interval >= 21).length;
        document.getElementById('totalCards').textContent = total;
        document.getElementById('newCards').textContent = newCards;
        document.getElementById('learningCards').textContent = learning;
        document.getElementById('masteredCards').textContent = mastered;
    }

    setupEventListeners() {
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.toggle('collapsed');
        });
        document.getElementById('mobileSidebarToggle')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.toggle('mobile-open');
        });

        document.getElementById('addCardBtn')?.addEventListener('click', () => this.showCardModal());
        document.getElementById('editDeckBtn')?.addEventListener('click', () => this.editDeck());
        document.getElementById('deleteDeckBtn')?.addEventListener('click', () => this.confirmDeleteDeck());

        const searchInput = document.getElementById('cardSearch');
        if (searchInput) {
            const debounced = Helpers.debounce((e) => {
                this.searchQuery = e.target.value.trim();
                this.loadCards(1);
            }, 300);
            searchInput.addEventListener('input', debounced);
        }

        document.getElementById('cardFront')?.addEventListener('input', () => this.updateCardPreview());
        document.getElementById('cardBack')?.addEventListener('input', () => this.updateCardPreview());
        document.getElementById('saveCardBtn')?.addEventListener('click', () => this.saveCard());
    }

    showCardModal(cardId = null) {
        const modal = document.getElementById('cardModal');
        const form = document.getElementById('cardForm');
        const title = document.getElementById('cardModalTitle');
        form.reset();
        
        if (cardId) {
            title.textContent = 'Chỉnh Sửa Thẻ';
            const card = this.cards.find(c => c.id === cardId);
            if (card) {
                document.getElementById('cardFront').value = card.frontText;
                document.getElementById('cardBack').value = card.backText;
                document.getElementById('cardHint').value = card.hint || '';
                document.getElementById('cardDifficulty').value = card.difficulty || 'MEDIUM';
                form.dataset.cardId = cardId;
            }
        } else {
            title.textContent = 'Thêm Thẻ Mới';
            delete form.dataset.cardId;
        }
        modal.classList.remove('hidden');
        this.updateCardPreview();
    }

    updateCardPreview() {
        const frontText = document.getElementById('cardFront')?.value || '';
        const backText = document.getElementById('cardBack')?.value || '';
        document.getElementById('previewFront').innerHTML = Helpers.renderMath(frontText) || '<em>Chưa có nội dung</em>';
        document.getElementById('previewBack').innerHTML = Helpers.renderMath(backText) || '<em>Chưa có nội dung</em>';
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(document.getElementById('cardPreview'));
        }
    }

    async saveCard() {
        const form = document.getElementById('cardForm');
        const cardId = form.dataset.cardId;
        const data = {
            frontText: document.getElementById('cardFront').value.trim(),
            backText: document.getElementById('cardBack').value.trim(),
            hint: document.getElementById('cardHint').value.trim(),
            difficulty: document.getElementById('cardDifficulty').value
        };

        if (!data.frontText || !data.backText) {
            this.showToast('Vui lòng điền câu hỏi và đáp án', 'error');
            return;
        }

        try {
            if (cardId) {
                await api.updateFlashcard(cardId, data);
                this.showToast('Cập nhật thẻ thành công!', 'success');
            } else {
                await api.createFlashcard(this.deckId, data);
                this.showToast('Thêm thẻ mới thành công!', 'success');
            }
            document.getElementById('cardModal').classList.add('hidden');
            await this.loadCards();
        } catch (error) {
            this.showToast('Lỗi lưu thẻ: ' + error.message, 'error');
        }
    }

    editCard(cardId) {
        this.showCardModal(cardId);
    }

    async deleteCard(cardId) {
        if (!confirm('Bạn có chắc muốn xóa thẻ này?')) return;
        try {
            await api.deleteFlashcard(cardId);
            this.showToast('Đã xóa thẻ', 'success');
            await this.loadCards();
        } catch (error) {
            this.showToast('Lỗi xóa thẻ', 'error');
        }
    }

    editDeck() {
        // Mở modal chỉnh sửa deck (có thể mở rộng)
        alert('Chức năng chỉnh sửa deck sẽ được cập nhật');
    }

    async confirmDeleteDeck() {
        if (!confirm(`Bạn có chắc muốn xóa bộ thẻ "${this.deck.name}"? Hành động này không thể hoàn tác.`)) return;
        try {
            await api.deleteDeck(this.deckId);
            this.showToast('Đã xóa bộ thẻ', 'success');
            setTimeout(() => window.location.href = 'decks.html', 1000);
        } catch (error) {
            this.showToast('Lỗi xóa bộ thẻ', 'error');
        }
    }

    renderKaTeX() {
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(document.body, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                ],
                throwOnError: false
            });
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

let deckDetailPage;
document.addEventListener('DOMContentLoaded', () => {
    deckDetailPage = new DeckDetailPage();
    window.deckDetailPage = deckDetailPage;
});