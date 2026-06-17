// frontend/js/pages/login.js

const API_URL = 'http://localhost:5000/api';

class LoginPage {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.errorDiv = document.getElementById('errorMessage');
        this.loginBtn = document.getElementById('loginBtn');
        
        this.init();
    }

    init() {
        // Kiểm tra đã đăng nhập
        const token = localStorage.getItem('forgetmenot_token');
        if (token) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Xử lý form submit
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Toggle password visibility
        const toggleBtn = document.querySelector('.toggle-password');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const passwordInput = document.getElementById('password');
                const icon = toggleBtn.querySelector('i');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    if (icon) icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    if (icon) icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        }

        // Xử lý demo login (click 5 lần vào logo)
        const logo = document.querySelector('.auth-logo');
        if (logo) {
            let clickCount = 0;
            logo.addEventListener('click', () => {
                clickCount++;
                if (clickCount >= 5) {
                    const emailInput = document.getElementById('email');
                    const passwordInput = document.getElementById('password');
                    if (emailInput) emailInput.value = 'demo@forgetmenot.com';
                    if (passwordInput) passwordInput.value = 'Demo1234';
                    clickCount = 0;
                    this.showToast('Đã điền thông tin demo!', 'info');
                }
                setTimeout(() => clickCount = 0, 2000);
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validation
        if (!email || !password) {
            this.showError('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showError('Email không hợp lệ');
            return;
        }

        // Show loading
        this.setLoading(true);
        this.hideError();

        try {
            console.log('Đang đăng nhập:', { email });

            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log('Kết quả đăng nhập:', data);

            if (data.success) {
                // LƯU TOKEN VÀ USER
                localStorage.setItem('forgetmenot_token', data.data.accessToken);
                localStorage.setItem('forgetmenot_user', JSON.stringify(data.data.user));
                
                console.log('Đăng nhập thành công! Đang chuyển hướng...');
                this.showToast('Đăng nhập thành công!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 500);
            } else {
                this.showError(data.message || 'Đăng nhập thất bại');
            }
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            this.showError('Không thể kết nối đến server. Backend đang chạy không? (http://localhost:5000)');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        if (loading) {
            this.loginBtn.disabled = true;
            this.loginBtn.textContent = 'Đang đăng nhập...';
        } else {
            this.loginBtn.disabled = false;
            this.loginBtn.textContent = 'Đăng nhập';
        }
    }

    showError(message) {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.classList.remove('hidden');
            this.errorDiv.style.animation = 'none';
            this.errorDiv.offsetHeight;
            this.errorDiv.style.animation = 'shake 0.5s ease';
        } else {
            alert(message);
        }
    }

    hideError() {
        if (this.errorDiv) {
            this.errorDiv.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.log(message);
            return;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
});