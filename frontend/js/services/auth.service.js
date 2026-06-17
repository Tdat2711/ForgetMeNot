// frontend/js/services/auth.service.js
class AuthService {
    constructor() {
        this.tokenKey = CONFIG.STORAGE_KEYS.TOKEN;
        this.refreshTokenKey = CONFIG.STORAGE_KEYS.REFRESH_TOKEN;
        this.userKey = CONFIG.STORAGE_KEYS.USER;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expired = payload.exp * 1000 < Date.now();
            return !expired;
        } catch {
            return false;
        }
    }

    /**
     * Get current user from storage
     */
    getCurrentUser() {
        try {
            const userData = localStorage.getItem(this.userKey);
            return userData ? JSON.parse(userData) : null;
        } catch {
            return null;
        }
    }

    /**
     * Save user data to storage
     */
    saveUser(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    /**
     * Get access token
     */
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    /**
     * Get refresh token
     */
    getRefreshToken() {
        return localStorage.getItem(this.refreshTokenKey);
    }

    /**
     * Save tokens
     */
    saveTokens(accessToken, refreshToken) {
        localStorage.setItem(this.tokenKey, accessToken);
        if (refreshToken) {
            localStorage.setItem(this.refreshTokenKey, refreshToken);
        }
    }

    /**
     * Clear all auth data
     */
    clearAuth() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.THEME);
    }

    /**
     * Login
     */
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        
        if (response.success) {
            this.saveTokens(response.data.accessToken, response.data.refreshToken);
            this.saveUser(response.data.user);
        }
        
        return response;
    }

    /**
     * Register
     */
    async register(username, email, password) {
        const response = await api.post('/auth/register', { username, email, password });
        
        if (response.success) {
            this.saveTokens(response.data.accessToken, response.data.refreshToken);
            this.saveUser(response.data.user);
        }
        
        return response;
    }

    /**
     * Logout
     */
    async logout() {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            window.location.href = '/pages/login.html';
        }
    }

    /**
     * Refresh token
     */
    async refreshToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            this.clearAuth();
            return false;
        }

        try {
            const response = await api.post('/auth/refresh', { refreshToken });
            
            if (response.success) {
                this.saveTokens(response.data.accessToken, response.data.refreshToken);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuth();
        }
        
        return false;
    }

    /**
     * Update profile
     */
    async updateProfile(data) {
        const response = await api.put('/auth/profile', data);
        if (response.success) {
            this.saveUser(response.data);
        }
        return response;
    }

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        return api.post('/auth/change-password', {
            currentPassword,
            newPassword
        });
    }

    /**
     * Check permission
     */
    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        if (user.role === 'ADMIN') return true;
        return user.permissions?.includes(permission) || false;
    }
}

// Initialize
const authService = new AuthService();
window.authService = authService;