// frontend/js/pages/register.js

// API URL
const API_URL = 'http://localhost:5000/api';

class RegisterPage {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.errorDiv = document.getElementById('errorMessage');
        this.registerBtn = document.getElementById('registerBtn');
        this.isLoading = false;
        
        this.init();
    }

    init() {
        // Nếu đã đăng nhập thì chuyển hướng
        const token = localStorage.getItem('forgetmenot_token');
        if (token) {
            window.location.href = 'dashboard.html';
            return;
        }

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.setupPasswordToggles();
        this.setupPasswordStrength();
        this.setupRealTimeValidation();
    }

    setupPasswordToggles() {
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                const icon = btn.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        });
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('password');
        const strengthDiv = document.getElementById('passwordStrength');
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');

        if (!passwordInput) return;

        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            if (!password) {
                if (strengthDiv) strengthDiv.classList.add('hidden');
                return;
            }

            if (strengthDiv) strengthDiv.classList.remove('hidden');
            const strength = this.calculateStrength(password);
            
            if (strengthFill) {
                strengthFill.style.width = `${strength.score * 25}%`;
                strengthFill.style.backgroundColor = strength.color;
            }
            if (strengthText) {
                strengthText.textContent = strength.label;
                strengthText.style.color = strength.color;
            }
        });
    }

    calculateStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score <= 1) return { score: 1, label: 'Rất yếu', color: '#EF4444' };
        if (score <= 2) return { score: 2, label: 'Yếu', color: '#F59E0B' };
        if (score <= 3) return { score: 3, label: 'Trung bình', color: '#F59E0B' };
        if (score <= 4) return { score: 4, label: 'Mạnh', color: '#10B981' };
        return { score: 4, label: 'Rất mạnh', color: '#10B981' };
    }

    setupRealTimeValidation() {
        const fields = ['username', 'email', 'password', 'confirmPassword'];
        
        fields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (!input) return;
            
            input.addEventListener('blur', () => this.validateField(fieldId));
            input.addEventListener('input', () => {
                const errorSpan = document.getElementById(`${fieldId}Error`);
                if (errorSpan && !errorSpan.classList.contains('hidden')) {
                    this.validateField(fieldId);
                }
            });
        });
    }

    validateField(fieldId) {
        const input = document.getElementById(fieldId);
        const errorSpan = document.getElementById(`${fieldId}Error`);
        if (!input) return true;
        
        const value = input.value.trim();
        let error = '';

        switch (fieldId) {
            case 'username':
                if (!value) error = 'Vui lòng nhập tên người dùng';
                else if (value.length < 3) error = 'Tên phải có ít nhất 3 ký tự';
                else if (value.length > 30) error = 'Tên không được quá 30 ký tự';
                else if (!/^[a-zA-Z0-9_]+$/.test(value)) error = 'Chỉ chấp nhận chữ cái, số và dấu gạch dưới';
                break;
                
            case 'email':
                if (!value) error = 'Vui lòng nhập email';
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Email không hợp lệ';
                break;
                
            case 'password':
                if (!value) error = 'Vui lòng nhập mật khẩu';
                else if (value.length < 8) error = 'Mật khẩu phải có ít nhất 8 ký tự';
                break;
                
            case 'confirmPassword':
                const password = document.getElementById('password')?.value || '';
                if (!value) error = 'Vui lòng xác nhận mật khẩu';
                else if (value !== password) error = 'Mật khẩu xác nhận không khớp';
                break;
        }

        if (error && errorSpan) {
            errorSpan.textContent = error;
            errorSpan.classList.remove('hidden');
            if (input) input.classList.add('error');
            return false;
        } else {
            if (errorSpan) errorSpan.classList.add('hidden');
            if (input) input.classList.remove('error');
            return true;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;
        
        // Validate all fields
        const fields = ['username', 'email', 'password', 'confirmPassword'];
        const isValid = fields.every(field => this.validateField(field));
        
        if (!isValid) return;

        // Check terms (nếu có)
        const agreeTerms = document.getElementById('agreeTerms');
        if (agreeTerms && !agreeTerms.checked) {
            this.showError('Vui lòng đồng ý với điều khoản sử dụng');
            return;
        }

        this.setLoading(true);
        this.hideError();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            console.log('Đang gửi đăng ký:', { username, email });

            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            console.log('Kết quả đăng ký:', data);

            if (data.success) {
                // LƯU TOKEN VÀ USER
                localStorage.setItem('forgetmenot_token', data.data.accessToken);
                localStorage.setItem('forgetmenot_user', JSON.stringify(data.data.user));
                
                console.log('Đã lưu! Đang chuyển hướng...');
                this.showToast('Đăng ký thành công! Đang chuyển hướng...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                this.showError(data.message || 'Đăng ký thất bại');
            }
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            let message = 'Không thể kết nối đến server. Backend đang chạy không?';
            this.showError(message);
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        
        if (loading) {
            this.registerBtn.disabled = true;
            this.registerBtn.textContent = 'Đang đăng ký...';
        } else {
            this.registerBtn.disabled = false;
            this.registerBtn.textContent = 'Tạo tài khoản';
        }
    }

    showError(message) {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.classList.remove('hidden');
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
            alert(message);
            return;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', () => {
    new RegisterPage();
});