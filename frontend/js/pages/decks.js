// frontend/js/pages/decks.js
class DecksPage {
    constructor() {
        this.decks = [];
        this.favorites = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.searchQuery = '';
        this.sortBy = 'updatedAt';
        this.sortOrder = 'desc';
        this.generatedCards = [];
        this.selectedFile = null;
        this.modal = null;
        this.isGenerating = false;

        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }

        this.init();
    }

    async init() {
        await this.loadDecks();
        await this.loadFavorites();
        this.setupEventListeners();
        this.checkUrlParams();
    }

    // ========== LOAD DECKS ==========
    async loadDecks(page = 1) {
        try {
            const response = await api.getDecks({
                page,
                limit: 12,
                search: this.searchQuery,
                sortBy: this.sortBy,
                order: this.sortOrder
            });
            this.decks = response.data || [];
            this.currentPage = response.pagination?.page || 1;
            this.totalPages = response.pagination?.totalPages || 1;
            this.renderDecks();
            this.renderPagination();
        } catch (error) {
            console.error('Error loading decks:', error);
            this.showToast('Không thể tải danh sách bộ thẻ', 'error');
        }
    }

    async loadFavorites() {
        try {
            const response = await api.get('/decks/favorites');
            this.favorites = response.data || [];
            this.renderFavorites();
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }

    // ========== RENDER ==========
    renderDecks() {
        const container = document.getElementById('decksGrid');
        if (!container) return;

        if (this.decks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-layer-group"></i>
                    <h3>${this.searchQuery ? 'Không tìm thấy bộ thẻ' : 'Chưa có bộ thẻ nào'}</h3>
                    <p>${this.searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Tạo bộ thẻ đầu tiên để bắt đầu học tập'}</p>
                    ${!this.searchQuery ? `
                        <div class="empty-actions">
                            <button class="btn btn-primary" onclick="decksPage.showCreateModal()"><i class="fas fa-plus"></i> Tạo Thủ Công</button>
                            <button class="btn btn-outline" onclick="decksPage.showAIGenerateModal()"><i class="fas fa-robot"></i> AI Generate</button>
                        </div>
                    ` : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = this.decks.map(deck => this.createDeckCard(deck)).join('');
    }

    createDeckCard(deck) {
        const cardCount = deck._count?.flashcards || deck.cardCount || 0;
        const lastStudied = deck.lastStudied ? Helpers.timeAgo(new Date(deck.lastStudied)) : 'Chưa học';
        const daysUntilExam = deck.examDate ? Math.ceil((new Date(deck.examDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        const isUrgent = daysUntilExam !== null && daysUntilExam <= 7 && daysUntilExam > 0;
        const isPastExam = daysUntilExam !== null && daysUntilExam <= 0;

        return `
            <div class="deck-card" data-deck-id="${deck.id}">
                <div class="deck-card-header" style="background: linear-gradient(135deg, ${deck.color || '#3B82F6'}, ${this.adjustColor(deck.color || '#3B82F6', -20)})">
                    <span class="deck-icon">${deck.icon || '📚'}</span>
                    ${isUrgent ? `<span class="urgent-badge">🚨 Còn ${daysUntilExam} ngày</span>` : ''}
                    ${isPastExam ? '<span class="urgent-badge">✅ Đã thi</span>' : ''}
                    ${deck.isFavorite ? '<span class="favorite-badge">⭐</span>' : ''}
                </div>
                <div class="deck-card-body" onclick="window.location.href='deck-detail.html?id=${deck.id}'">
                    <h3>${Helpers.escapeHtml(deck.name)}</h3>
                    <p>${Helpers.truncate(deck.description || 'Chưa có mô tả', 80)}</p>
                    <div class="deck-card-stats">
                        <span><i class="fas fa-clone"></i> ${cardCount} thẻ</span>
                        <span><i class="fas fa-clock"></i> ${lastStudied}</span>
                    </div>
                    ${deck.examDate ? `<div class="deck-exam-info"><i class="fas fa-calendar-alt"></i> Thi: ${Helpers.formatDate(deck.examDate, 'SHORT')}</div>` : ''}
                    <div class="deck-card-actions">
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); window.location.href='study.html?deckId=${deck.id}'"><i class="fas fa-play"></i> Học</button>
                        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); window.location.href='deck-detail.html?id=${deck.id}'"><i class="fas fa-eye"></i> Xem thẻ</button>
                    </div>
                </div>
                <button class="deck-menu-btn" onclick="event.stopPropagation(); decksPage.showDeckMenu(event, '${deck.id}')"><i class="fas fa-ellipsis-v"></i></button>
            </div>
        `;
    }

    renderFavorites() {
        const container = document.getElementById('favoritesList');
        if (!container) return;
        if (this.favorites.length === 0) {
            container.innerHTML = `<div class="empty-state small"><i class="fas fa-star"></i><p>Chưa có bộ thẻ yêu thích</p></div>`;
            return;
        }
        container.innerHTML = this.favorites.slice(0, 5).map(deck => `
            <div class="favorite-item" onclick="window.location.href='study.html?deckId=${deck.id}'">
                <div class="favorite-color" style="background: ${deck.color}"></div>
                <div class="favorite-info">
                    <span class="favorite-name">${Helpers.escapeHtml(deck.name)}</span>
                    <span class="favorite-count">${deck._count?.flashcards || 0} thẻ</span>
                </div>
                <i class="fas fa-chevron-right"></i>
            </div>
        `).join('');
    }

    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container || this.totalPages <= 1) { container.innerHTML = ''; return; }
        let html = '';
        html += `<button class="btn btn-secondary btn-sm" ${this.currentPage === 1 ? 'disabled' : ''} onclick="decksPage.loadDecks(${this.currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `<button class="btn btn-sm ${i === this.currentPage ? 'btn-primary' : 'btn-secondary'}" onclick="decksPage.loadDecks(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
        }
        html += `<button class="btn btn-secondary btn-sm" ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="decksPage.loadDecks(${this.currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        container.innerHTML = html;
    }

    // ========== EVENT LISTENERS ==========
    setupEventListeners() {
        document.getElementById('createDeckBtn')?.addEventListener('click', () => this.showCreateModal());
        document.getElementById('aiGenerateBtn')?.addEventListener('click', () => this.showAIGenerateModal());

        const searchInput = document.getElementById('deckSearch');
        if (searchInput) {
            const debounced = Helpers.debounce((e) => {
                this.searchQuery = e.target.value.trim();
                this.loadDecks(1);
            }, 300);
            searchInput.addEventListener('input', debounced);
        }

        document.getElementById('sortSelect')?.addEventListener('change', (e) => {
            const [sortBy, order] = e.target.value.split('-');
            this.sortBy = sortBy;
            this.sortOrder = order;
            this.loadDecks(1);
        });

        document.getElementById('gridViewBtn')?.addEventListener('click', () => {
            document.getElementById('decksGrid').classList.remove('list-view');
            document.getElementById('decksGrid').classList.add('grid-view');
        });

        document.getElementById('listViewBtn')?.addEventListener('click', () => {
            document.getElementById('decksGrid').classList.remove('grid-view');
            document.getElementById('decksGrid').classList.add('list-view');
        });
    }

    // ========== CREATE DECK (MANUAL) ==========
    showCreateModal() {
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Tạo Bộ Thẻ Mới</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="createDeckForm">
                        <div class="form-group">
                            <label class="form-label">Tên bộ thẻ <span class="text-danger">*</span></label>
                            <input type="text" class="form-input" id="deckNameInput" placeholder="VD: Toán Cao Cấp" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Mô tả</label>
                            <textarea class="form-textarea" id="deckDescriptionInput" placeholder="Mô tả ngắn..." rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ngày thi (tùy chọn)</label>
                            <input type="date" class="form-input" id="deckExamDateInput">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Màu sắc & Biểu tượng</label>
                            <div class="color-picker-wrapper">
                                <input type="color" class="color-picker" id="deckColorInput" value="#3B82F6">
                                <select class="form-select" id="deckIconInput">
                                    <option value="📚">📚 Sách</option>
                                    <option value="📐">📐 Toán</option>
                                    <option value="⚡">⚡ Vật lý</option>
                                    <option value="🧪">🧪 Hóa học</option>
                                    <option value="💻">💻 IT</option>
                                    <option value="🌐">🌐 Ngoại ngữ</option>
                                    <option value="📖">📖 Văn học</option>
                                    <option value="🧬">🧬 Sinh học</option>
                                    <option value="📊">📊 Kinh tế</option>
                                    <option value="🎯">🎯 Khác</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
                    <button class="btn btn-primary" id="submitDeckBtn"><i class="fas fa-plus"></i> Tạo Bộ Thẻ</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const submitBtn = modal.querySelector('#submitDeckBtn');
        submitBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('deckNameInput');
            const descriptionInput = document.getElementById('deckDescriptionInput');
            const examDateInput = document.getElementById('deckExamDateInput');
            const colorInput = document.getElementById('deckColorInput');
            const iconSelect = document.getElementById('deckIconInput');

            const name = nameInput ? nameInput.value.trim() : '';
            const description = descriptionInput ? descriptionInput.value.trim() : '';
            const examDate = examDateInput ? examDateInput.value : '';
            const color = colorInput ? colorInput.value : '#3B82F6';
            const icon = iconSelect ? iconSelect.value : '📚';

            if (!name) {
                this.showToast('Vui lòng nhập tên bộ thẻ', 'error');
                if (nameInput) {
                    nameInput.focus();
                    nameInput.style.borderColor = 'var(--color-danger)';
                    setTimeout(() => nameInput.style.borderColor = '', 2000);
                }
                return;
            }

            try {
                const response = await api.createDeck({ name, description, examDate, color, icon });
                if (response.success) {
                    this.showToast('Tạo bộ thẻ thành công!', 'success');
                    modal.remove();
                    await this.loadDecks();
                    await this.loadFavorites();
                } else {
                    this.showToast(response.message || 'Tạo bộ thẻ thất bại', 'error');
                }
            } catch (error) {
                console.error('Create deck error:', error);
                this.showToast(error.message || 'Lỗi tạo bộ thẻ', 'error');
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // ========== AI GENERATE ==========
    showAIGenerateModal() {
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title">🤖 Tạo Bộ Thẻ Bằng AI</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="ai-steps">
                        <div class="ai-step active" data-step="1"><div class="step-number">1</div><span>Tải file</span></div>
                        <div class="ai-step-connector"></div>
                        <div class="ai-step" data-step="2"><div class="step-number">2</div><span>Xem nội dung</span></div>
                        <div class="ai-step-connector"></div>
                        <div class="ai-step" data-step="3"><div class="step-number">3</div><span>Tạo flashcard</span></div>
                    </div>

                    <div class="file-upload-zone" id="aiUploadZone">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Kéo thả file vào đây hoặc click để chọn</p>
                        <small>Hỗ trợ: PDF, DOCX, DOC, TXT (Tối đa 10MB)</small>
                        <input type="file" id="aiFileInput" accept=".pdf,.docx,.doc,.txt" hidden>
                    </div>

                    <div id="aiFileContent" style="display: none; margin-top: 16px;">
                        <h4>📄 Nội dung file</h4>
                        <div class="ai-file-content" id="fileContentPreview"></div>
                    </div>

                    <div class="ai-flashcard-count" id="aiFlashcardCount" style="display: none; margin-top: 16px;">
                        <label for="flashcardCount">Số lượng flashcard muốn tạo:</label>
                        <input type="number" id="flashcardCount" value="10" min="1" max="50" class="form-input" style="width: 80px;">
                        <button class="btn btn-primary" id="generateBtn" style="margin-left: 12px;"><i class="fas fa-magic"></i> Tạo Flashcard</button>
                    </div>

                    <!-- API Key Input -->
                    <div id="apiKeySection" style="margin-top: 16px;">
                        <div class="form-group">
                            <label class="form-label">🔑 API Key</label>
                            <input type="text" class="form-input" id="geminiApiKeyInput" placeholder="Nhập API key của bạn (Gemini: AIzaSy... | Claude: sk-ant-...)" style="width: 100%;">
                            <span class="form-hint">
                                <strong>Hỗ trợ:</strong> Gemini (AIzaSy...) hoặc Claude (sk-ant-... hoặc AQ...)<br>
                                <a href="https://makersuite.google.com/app/apikey" target="_blank">Lấy Gemini key</a> | 
                                <a href="https://console.anthropic.com/" target="_blank">Lấy Claude key</a>
                            </span>
                        </div>
                        <button class="btn btn-sm btn-secondary" id="saveApiKeyBtn">💾 Lưu key</button>
                        <span id="apiKeyStatus" style="margin-left: 12px; font-size: 14px;"></span>
                    </div>

                    <div id="aiPreview" style="display: none; margin-top: 20px;">
                        <div class="preview-header">
                            <h4>Flashcards đã tạo (<span id="previewCount">0</span> thẻ)</h4>
                            <button class="btn btn-sm btn-secondary" id="regenerateBtn"><i class="fas fa-redo"></i> Tạo lại</button>
                        </div>
                        <div class="preview-list" id="previewList"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
                    <button class="btn btn-primary" id="saveAIBtn" style="display: none;"><i class="fas fa-save"></i> Lưu Flashcards</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.modal = modal;
        this.generatedCards = [];
        this.selectedFile = null;
        this.isGenerating = false;

        // Xử lý API key
        const apiKeyInput = modal.querySelector('#geminiApiKeyInput');
        const saveKeyBtn = modal.querySelector('#saveApiKeyBtn');
        const apiKeyStatus = modal.querySelector('#apiKeyStatus');

        // Load key đã lưu
        const savedKey = localStorage.getItem('ai_api_key');
        if (savedKey) {
            apiKeyInput.value = savedKey;
            apiKeyStatus.textContent = '✅ Đã có key';
            apiKeyStatus.style.color = 'var(--color-success)';
        }

        saveKeyBtn.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                localStorage.setItem('ai_api_key', key);
                apiKeyStatus.textContent = '✅ Đã lưu key';
                apiKeyStatus.style.color = 'var(--color-success)';
                this.showToast('Đã lưu API key!', 'success');
            } else {
                this.showToast('Vui lòng nhập API key', 'error');
            }
        });

        // Các sự kiện
        const uploadZone = modal.querySelector('#aiUploadZone');
        const fileInput = modal.querySelector('#aiFileInput');
        const previewDiv = modal.querySelector('#aiPreview');
        const saveBtn = modal.querySelector('#saveAIBtn');
        const generateBtn = modal.querySelector('#generateBtn');
        const regenerateBtn = modal.querySelector('#regenerateBtn');

        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
        uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileUpload(file, modal);
        });
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFileUpload(file, modal);
        });

        generateBtn.addEventListener('click', () => {
            if (this.selectedFile) {
                let key = apiKeyInput.value.trim() || localStorage.getItem('ai_api_key');
                if (!key) {
                    this.showToast('Vui lòng nhập API key', 'error');
                    apiKeyInput.focus();
                    return;
                }
                localStorage.setItem('ai_api_key', key);
                this.callAIApi(this.selectedFile, modal, key);
            } else {
                this.showToast('Vui lòng tải file trước', 'error');
            }
        });

        regenerateBtn.addEventListener('click', () => {
            if (this.selectedFile) {
                let key = apiKeyInput.value.trim() || localStorage.getItem('ai_api_key');
                if (!key) {
                    this.showToast('Vui lòng nhập API key', 'error');
                    return;
                }
                this.callAIApi(this.selectedFile, modal, key);
            }
        });

        saveBtn.addEventListener('click', () => this.saveAICards(modal));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    // ===================== HANDLE FILE UPLOAD =====================
    async handleFileUpload(file, modal) {
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showToast('File quá lớn. Tối đa 10MB.', 'error');
            return;
        }

        const allowedExtensions = ['pdf', 'docx', 'doc', 'txt'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            this.showToast('Định dạng file không được hỗ trợ', 'error');
            return;
        }

        this.selectedFile = file;
        const uploadZone = modal.querySelector('#aiUploadZone');
        uploadZone.innerHTML = `
            <i class="fas fa-file-alt"></i>
            <p>Đã chọn: ${file.name}</p>
            <small>${(file.size / 1024).toFixed(1)} KB</small>
        `;

        try {
            let text = await this.extractTextFromFile(file);
            const preview = modal.querySelector('#fileContentPreview');
            preview.textContent = text.substring(0, 3000) + (text.length > 3000 ? '...' : '');
            modal.querySelector('#aiFileContent').style.display = 'block';
            modal.querySelector('#aiFlashcardCount').style.display = 'flex';
        } catch (error) {
            console.error('Error reading file:', error);
            this.showToast('Không thể đọc file: ' + error.message, 'error');
        }
    }

    async extractTextFromFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'txt') {
            return await file.text();
        }

        if (ext === 'pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n';
            }
            return text;
        }

        if (ext === 'docx' || ext === 'doc') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        }

        throw new Error('Không hỗ trợ định dạng này');
    }

    // ===================== CALL AI API =====================
    async callAIApi(file, modal, apiKey) {
        if (this.isGenerating) return;
        this.isGenerating = true;

        const count = parseInt(modal.querySelector('#flashcardCount').value) || 10;
        const generateBtn = modal.querySelector('#generateBtn');
        const previewDiv = modal.querySelector('#aiPreview');
        const saveBtn = modal.querySelector('#saveAIBtn');
        const uploadZone = modal.querySelector('#aiUploadZone');

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';
        uploadZone.innerHTML = `
            <div class="spinner"></div>
            <p>Đang gửi đến AI...</p>
            <small>Phân tích nội dung và tạo flashcard</small>
        `;

        try {
            const text = await this.extractTextFromFile(file);
            if (!text || text.trim().length < 10) {
                throw new Error('Nội dung file quá ngắn hoặc không đọc được');
            }

            let flashcards = [];
            const prompt = this.buildPrompt(text, count);

            // === XÁC ĐỊNH LOẠI API ===
            if (apiKey.startsWith('AIzaSy')) {
                // GEMINI
                flashcards = await this.callGemini(prompt, apiKey);
            } else if (apiKey.startsWith('sk-ant-') || apiKey.startsWith('AQ.')) {
                // CLAUDE
                flashcards = await this.callClaude(prompt, apiKey);
            } else {
                throw new Error('API key không hợp lệ. Gemini bắt đầu bằng AIzaSy, Claude bắt đầu bằng sk-ant- hoặc AQ.');
            }

            if (flashcards.length === 0) {
                throw new Error('Không thể tạo flashcard. Vui lòng thử lại.');
            }

            this.generatedCards = flashcards;

            const previewList = modal.querySelector('#previewList');
            const previewCount = modal.querySelector('#previewCount');
            previewCount.textContent = this.generatedCards.length;

            previewList.innerHTML = this.generatedCards.map((card, index) => `
                <div class="preview-card">
                    <div class="preview-card-number">#${index + 1}</div>
                    <div class="preview-card-content">
                        <div class="preview-question"><strong>Q:</strong> ${Helpers.renderMath(card.frontText)}</div>
                        <div class="preview-answer"><strong>A:</strong> ${Helpers.renderMath(card.backText)}</div>
                        ${card.hint ? `<div class="preview-hint">💡 ${card.hint}</div>` : ''}
                        ${card.difficulty ? `<span class="badge badge-${card.difficulty === 'EASY' ? 'success' : card.difficulty === 'HARD' ? 'danger' : 'warning'}">${card.difficulty}</span>` : ''}
                    </div>
                    <div class="preview-card-actions">
                        <button class="btn-icon btn-sm" onclick="decksPage.editGeneratedCard(${index})"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-sm text-danger" onclick="decksPage.removeGeneratedCard(${index})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');

            previewDiv.style.display = 'block';
            saveBtn.style.display = 'inline-flex';
            uploadZone.innerHTML = `
                <i class="fas fa-check-circle" style="color: var(--color-success);"></i>
                <p>Đã tạo ${this.generatedCards.length} flashcard thành công!</p>
                <small>${file.name}</small>
            `;

            this.showToast(`✅ Đã tạo ${this.generatedCards.length} flashcard!`, 'success');

        } catch (error) {
            console.error('AI error:', error);
            uploadZone.innerHTML = `
                <i class="fas fa-exclamation-circle" style="color: var(--color-danger);"></i>
                <p style="color: var(--color-danger)">❌ Lỗi: ${error.message}</p>
                <button class="btn btn-sm btn-secondary" onclick="this.closest('.file-upload-zone').click()">Thử lại</button>
            `;
            this.showToast('❌ ' + error.message, 'error');
        } finally {
            this.isGenerating = false;
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-magic"></i> Tạo Flashcard';
        }
    }

    // ===== GEMINI API =====
    async callGemini(prompt, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 8192,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData.error?.message || `HTTP ${response.status}`;
            throw new Error(`Gemini API: ${msg}`);
        }

        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return this.parseJsonResponse(resultText);
    }

    // ===== CLAUDE API =====
    async callClaude(prompt, apiKey) {
        const url = 'https://api.anthropic.com/v1/messages';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 4096,
                temperature: 0.3,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData.error?.message || `HTTP ${response.status}`;
            throw new Error(`Claude API: ${msg}`);
        }

        const data = await response.json();
        const resultText = data.content?.[0]?.text || '';
        return this.parseJsonResponse(resultText);
    }

    // ===== PARSE JSON RESPONSE =====
    parseJsonResponse(text) {
        try {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('Không tìm thấy JSON trong response');
            }
            const cards = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(cards) || cards.length === 0) {
                throw new Error('Response không phải mảng hợp lệ');
            }
            return cards.map(card => ({
                frontText: card.frontText || card.question || 'Không có câu hỏi',
                backText: card.backText || card.answer || 'Không có đáp án',
                hint: card.hint || '',
                difficulty: card.difficulty || 'MEDIUM'
            }));
        } catch (error) {
            console.error('Parse error:', error);
            // Fallback: tạo flashcard từ text
            return this.fallbackGenerateCards(text, 5);
        }
    }

    fallbackGenerateCards(text, count) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const cards = [];
        for (let i = 0; i < Math.min(count, sentences.length); i++) {
            const s = sentences[i].trim();
            if (s.length > 10) {
                cards.push({
                    frontText: `Ý chính: ${s.substring(0, 80)}...`,
                    backText: s,
                    hint: 'Xem lại nội dung chi tiết',
                    difficulty: 'MEDIUM'
                });
            }
        }
        if (cards.length === 0) {
            cards.push({
                frontText: 'Nội dung từ tài liệu',
                backText: text.substring(0, 300),
                hint: 'Vui lòng kiểm tra lại nội dung',
                difficulty: 'MEDIUM'
            });
        }
        return cards;
    }

    buildPrompt(text, count) {
        return `
Bạn là trợ lý AI chuyên tạo flashcard từ tài liệu học tập.

Nội dung tài liệu:
---
${text.substring(0, 10000)}
---

Yêu cầu: Tạo ${count} flashcard từ nội dung trên.
Mỗi flashcard có:
- frontText: câu hỏi ngắn gọn
- backText: câu trả lời chi tiết
- hint: gợi ý (tùy chọn)
- difficulty: EASY, MEDIUM, hoặc HARD

Định dạng output (chỉ JSON array):
[
  {
    "frontText": "...",
    "backText": "...",
    "hint": "...",
    "difficulty": "MEDIUM"
  }
]

Chỉ trả về JSON, không giải thích thêm.
`;
    }

    // ========== SAVE AI CARDS ==========
    async saveAICards(modal) {
        if (!this.generatedCards || this.generatedCards.length === 0) {
            this.showToast('Không có flashcard để lưu', 'error');
            return;
        }

        const deckName = prompt('Đặt tên cho bộ thẻ mới:', 'Bộ thẻ từ AI - ' + new Date().toLocaleDateString('vi-VN'));
        if (!deckName) return;

        try {
            const deckResponse = await api.createDeck({ name: deckName });
            const deckId = deckResponse.data.id;

            for (const card of this.generatedCards) {
                await api.createFlashcard(deckId, {
                    frontText: card.frontText,
                    backText: card.backText,
                    hint: card.hint || '',
                    difficulty: card.difficulty || 'MEDIUM'
                });
            }

            this.showToast(`✅ Đã tạo ${this.generatedCards.length} thẻ thành công!`, 'success');
            modal.remove();
            await this.loadDecks();
            await this.loadFavorites();
        } catch (error) {
            this.showToast('❌ Lỗi lưu thẻ: ' + error.message, 'error');
        }
    }

    // ========== EDIT / REMOVE GENERATED CARD ==========
    editGeneratedCard(index) {
        const card = this.generatedCards[index];
        const newFront = prompt('Sửa câu hỏi:', card.frontText);
        if (newFront !== null) card.frontText = newFront;
        const newBack = prompt('Sửa đáp án:', card.backText);
        if (newBack !== null) card.backText = newBack;
        const newHint = prompt('Sửa gợi ý (bỏ trống nếu không):', card.hint || '');
        if (newHint !== null) card.hint = newHint;

        const previewList = document.querySelector('#previewList');
        if (previewList) {
            const items = previewList.querySelectorAll('.preview-card');
            if (items[index]) {
                items[index].querySelector('.preview-question').innerHTML = `<strong>Q:</strong> ${Helpers.renderMath(card.frontText)}`;
                items[index].querySelector('.preview-answer').innerHTML = `<strong>A:</strong> ${Helpers.renderMath(card.backText)}`;
                const hintEl = items[index].querySelector('.preview-hint');
                if (card.hint) {
                    if (hintEl) hintEl.textContent = `💡 ${card.hint}`;
                    else {
                        const content = items[index].querySelector('.preview-card-content');
                        const hintDiv = document.createElement('div');
                        hintDiv.className = 'preview-hint';
                        hintDiv.textContent = `💡 ${card.hint}`;
                        content.appendChild(hintDiv);
                    }
                } else if (hintEl) {
                    hintEl.remove();
                }
            }
        }
        this.showToast('Đã cập nhật thẻ', 'success');
    }

    removeGeneratedCard(index) {
        if (!confirm('Xóa thẻ này?')) return;
        this.generatedCards.splice(index, 1);
        const previewCount = document.getElementById('previewCount');
        if (previewCount) previewCount.textContent = this.generatedCards.length;
        const previewList = document.getElementById('previewList');
        if (!previewList) return;

        previewList.innerHTML = this.generatedCards.map((card, idx) => `
            <div class="preview-card">
                <div class="preview-card-number">#${idx + 1}</div>
                <div class="preview-card-content">
                    <div class="preview-question"><strong>Q:</strong> ${Helpers.renderMath(card.frontText)}</div>
                    <div class="preview-answer"><strong>A:</strong> ${Helpers.renderMath(card.backText)}</div>
                    ${card.hint ? `<div class="preview-hint">💡 ${card.hint}</div>` : ''}
                    ${card.difficulty ? `<span class="badge badge-${card.difficulty === 'EASY' ? 'success' : card.difficulty === 'HARD' ? 'danger' : 'warning'}">${card.difficulty}</span>` : ''}
                </div>
                <div class="preview-card-actions">
                    <button class="btn-icon btn-sm" onclick="decksPage.editGeneratedCard(${idx})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-sm text-danger" onclick="decksPage.removeGeneratedCard(${idx})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    // ========== DECK MENU ==========
    showDeckMenu(event, deckId) {
        event.preventDefault();
        event.stopPropagation();
        document.querySelectorAll('.context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <button class="context-menu-item" onclick="window.location.href='study.html?deckId=${deckId}'"><i class="fas fa-play"></i> Học ngay</button>
            <button class="context-menu-item" onclick="window.location.href='deck-detail.html?id=${deckId}'"><i class="fas fa-eye"></i> Xem thẻ</button>
            <button class="context-menu-item" onclick="decksPage.editDeck('${deckId}')"><i class="fas fa-edit"></i> Chỉnh sửa</button>
            <button class="context-menu-item" onclick="decksPage.toggleFavorite('${deckId}')"><i class="fas fa-star"></i> Yêu thích</button>
            <div class="context-menu-divider"></div>
            <button class="context-menu-item" onclick="decksPage.duplicateDeck('${deckId}')"><i class="fas fa-copy"></i> Nhân bản</button>
            <button class="context-menu-item" onclick="decksPage.exportDeck('${deckId}')"><i class="fas fa-download"></i> Xuất file</button>
            <div class="context-menu-divider"></div>
            <button class="context-menu-item danger" onclick="decksPage.deleteDeck('${deckId}')"><i class="fas fa-trash"></i> Xóa</button>
        `;

        menu.style.top = `${event.clientY}px`;
        menu.style.left = `${event.clientX}px`;
        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }, { once: true });
        }, 0);
    }

    // ========== DECK ACTIONS ==========
    async toggleFavorite(deckId) {
        try {
            await api.toggleFavorite(deckId);
            await Promise.all([this.loadDecks(), this.loadFavorites()]);
            this.showToast('Đã cập nhật yêu thích!', 'success');
        } catch (error) {
            this.showToast('Lỗi', 'error');
        }
    }

    async deleteDeck(deckId) {
        if (!confirm('Bạn có chắc muốn xóa bộ thẻ này? Hành động này không thể hoàn tác.')) return;
        try {
            await api.deleteDeck(deckId);
            this.showToast('Đã xóa bộ thẻ', 'success');
            await Promise.all([this.loadDecks(), this.loadFavorites()]);
        } catch (error) {
            this.showToast('Lỗi xóa bộ thẻ', 'error');
        }
    }

    async duplicateDeck(deckId) {
        try {
            await api.duplicateDeck(deckId);
            this.showToast('Đã nhân bản bộ thẻ', 'success');
            await this.loadDecks();
        } catch (error) {
            this.showToast('Lỗi nhân bản', 'error');
        }
    }

    async exportDeck(deckId) {
        try {
            const data = await api.exportDeck(deckId);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `deck_${deckId}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('Xuất file thành công!', 'success');
        } catch (error) {
            this.showToast('Lỗi xuất file', 'error');
        }
    }

    editDeck(deckId) {
        window.location.href = `deck-detail.html?id=${deckId}`;
    }

    // ========== UTILITY ==========
    adjustColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, Math.min(255, (num >> 16) + amt));
        const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
        const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'ai-create') {
            this.showAIGenerateModal();
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.warn('Toast container not found');
            alert(message);
            return;
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
        toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}

let decksPage;
document.addEventListener('DOMContentLoaded', () => {
    decksPage = new DecksPage();
    window.decksPage = decksPage;
});