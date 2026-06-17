// frontend/js/services/api.service.js
class ApiService {
    constructor() {
        this.baseURL = CONFIG.API_URL;
        this.tokenKey = 'forgetmenot_token';
        this.refreshTokenKey = 'forgetmenot_refresh_token';
        this.userKey = 'forgetmenot_user';
        this.isConnected = false;
    }

    // ==================== KIỂM TRA KẾT NỐI ====================
    async checkConnection() {
        try {
            const response = await fetch(`${this.baseURL}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                this.isConnected = true;
                console.log('✅ Backend connected:', this.baseURL);
                return true;
            } else {
                console.warn('⚠️ Backend responded with status:', response.status);
                this.isConnected = false;
                return false;
            }
        } catch (error) {
            console.error('❌ Cannot connect to backend:', {
                url: this.baseURL,
                error: error.message
            });
            this.isConnected = false;
            return false;
        }
    }

    // ==================== TOKEN ====================
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    getRefreshToken() {
        return localStorage.getItem(this.refreshTokenKey);
    }

    setRefreshToken(token) {
        localStorage.setItem(this.refreshTokenKey, token);
    }

    clearTokens() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.userKey);
    }

    // ==================== HTTP REQUEST ====================
    async request(endpoint, options = {}) {
        // Kiểm tra kết nối trước mỗi request
        if (!this.isConnected) {
            const connected = await this.checkConnection();
            if (!connected) {
                throw new Error(`Không thể kết nối đến server tại ${this.baseURL}. Vui lòng kiểm tra backend.`);
            }
        }

        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        if (config.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        console.log(`🚀 Request: ${config.method || 'GET'} ${url}`);

        try {
            const response = await fetch(url, config);
            console.log(`📡 Response status: ${response.status}`);

            // Handle 401
            if (response.status === 401 && token) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    config.headers['Authorization'] = `Bearer ${this.getToken()}`;
                    const retryResponse = await fetch(url, config);
                    return this.handleResponse(retryResponse);
                }
            }

            return this.handleResponse(response);
        } catch (error) {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                console.error('❌ Failed to fetch:', {
                    url,
                    method: config.method || 'GET',
                    baseURL: this.baseURL,
                    error: error.message
                });
                throw new Error(`Không thể kết nối đến server tại ${this.baseURL}. Hãy đảm bảo backend đang chạy.`);
            }
            throw error;
        }
    }

    async handleResponse(response) {
        let data;
        const text = await response.text();
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = null;
        }

        if (!response.ok) {
            const message = data?.message || `Lỗi ${response.status}: ${response.statusText}`;
            const error = new Error(message);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    async refreshAccessToken() {
        try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
                this.clearTokens();
                window.location.href = '/pages/login.html';
                return false;
            }

            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                this.setToken(data.data.accessToken);
                this.setRefreshToken(data.data.refreshToken);
                return true;
            } else {
                this.clearTokens();
                window.location.href = '/pages/login.html';
                return false;
            }
        } catch {
            this.clearTokens();
            return false;
        }
    }

    // ==================== HTTP SHORTCUTS ====================
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    async upload(endpoint, formData) {
        return this.request(endpoint, {
            method: 'POST',
            body: formData,
        });
    }

    // ==================== AUTH ====================
    async login(email, password) {
        const data = await this.post('/auth/login', { email, password });
        if (data.success) {
            this.setToken(data.data.accessToken);
            this.setRefreshToken(data.data.refreshToken);
            localStorage.setItem(this.userKey, JSON.stringify(data.data.user));
        }
        return data;
    }

    async register(username, email, password) {
        const data = await this.post('/auth/register', { username, email, password });
        if (data.success) {
            this.setToken(data.data.accessToken);
            this.setRefreshToken(data.data.refreshToken);
            localStorage.setItem(this.userKey, JSON.stringify(data.data.user));
        }
        return data;
    }

    async logout() {
        try {
            await this.post('/auth/logout');
        } finally {
            this.clearTokens();
            window.location.href = '/pages/login.html';
        }
    }

    async getProfile() {
        return this.get('/auth/me');
    }

    async updateProfile(userData) {
        return this.put('/auth/profile', userData);
    }

    async changePassword(currentPassword, newPassword) {
        return this.post('/auth/change-password', { currentPassword, newPassword });
    }

    // ==================== DECK ====================
    async getDecks(params = {}) {
        return this.get('/decks', params);
    }

    async getDeck(deckId) {
        return this.get(`/decks/${deckId}`);
    }

    async createDeck(deckData) {
        return this.post('/decks', deckData);
    }

    async updateDeck(deckId, deckData) {
        return this.put(`/decks/${deckId}`, deckData);
    }

    async deleteDeck(deckId) {
        return this.delete(`/decks/${deckId}`);
    }

    async toggleFavorite(deckId) {
        return this.patch(`/decks/${deckId}/favorite`);
    }

    // ==================== FLASHCARD ====================
    async getFlashcards(deckId, params = {}) {
        return this.get(`/decks/${deckId}/flashcards`, params);
    }

    async createFlashcard(deckId, cardData) {
        return this.post(`/decks/${deckId}/flashcards`, cardData);
    }

    async updateFlashcard(cardId, cardData) {
        return this.put(`/flashcards/${cardId}`, cardData);
    }

    async deleteFlashcard(cardId) {
        return this.delete(`/flashcards/${cardId}`);
    }

    // ==================== STUDY ====================
    async startStudy(deckId) {
        return this.get(`/study/start/${deckId}`);
    }

    async reviewCard(cardId, quality) {
        return this.post(`/study/review/${cardId}`, { quality });
    }

    async getStudyStats() {
        return this.get('/study/stats');
    }

    // ==================== AI ====================
    async generateFromFile(deckId, file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.upload(`/ai/generate/${deckId}`, formData);
    }

    async saveGeneratedCards(deckId, flashcards) {
        return this.post(`/ai/save/${deckId}`, { flashcards });
    }

    // ==================== EXTRA ====================
    async exportDeck(deckId) {
        return this.get(`/decks/${deckId}/export`);
    }

    async duplicateDeck(deckId) {
        return this.post(`/decks/${deckId}/duplicate`);
    }
}

// Khởi tạo và export
const api = new ApiService();
window.api = api;

// Tự động kiểm tra kết nối khi tải trang
document.addEventListener('DOMContentLoaded', async () => {
    const connected = await api.checkConnection();
    if (!connected) {
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = 'toast toast-error';
            toast.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <span>⚠️ Không thể kết nối đến server tại ${CONFIG.API_URL}. Vui lòng kiểm tra backend.</span>
            `;
            toastContainer.appendChild(toast);
            setTimeout(() => toast.remove(), 8000);
        }
        console.error('❌ Backend không khả dụng. Một số chức năng sẽ không hoạt động.');
    }
});