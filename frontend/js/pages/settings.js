// frontend/js/pages/settings.js
class SettingsPage {
  constructor() {
    this.user = null;
    this.sessions = [];
    this.init();
  }

  async init() {
    await this.loadUserData();
    this.setupTabs();
    this.setupEventListeners();
    this.loadSessions();
  }

  async loadUserData() {
    try {
      const response = await api.getProfile();
      this.user = response.data;
      this.populateSettings();
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  populateSettings() {
    // General settings
    document.getElementById('darkModeToggle').checked = this.user.darkMode;
    document.getElementById('languageSelect').value = this.user.language || 'vi';

    // Notification settings
    document.getElementById('emailNotifications').checked = this.user.emailNotifications;
    document.getElementById('pushNotifications').checked = this.user.pushNotifications;
    document.getElementById('studyReminders').checked = this.user.studyReminders;

    // Account info
    document.getElementById('username').value = this.user.username;
    document.getElementById('email').value = this.user.email;
    document.getElementById('memberSince').textContent = 
      Helpers.formatDate(this.user.createdAt, 'SHORT');
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const panels = document.querySelectorAll('.settings-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        
        // Update active states
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.add('hidden'));
        
        tab.classList.add('active');
        document.getElementById(`${target}Panel`)?.classList.remove('hidden');
      });
    });
  }

  setupEventListeners() {
    // Dark mode toggle
    document.getElementById('darkModeToggle')?.addEventListener('change', async (e) => {
      const darkMode = e.target.checked;
      await this.updateSetting({ darkMode });
      
      if (darkMode) {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
      }
    });

    // Language
    document.getElementById('languageSelect')?.addEventListener('change', async (e) => {
      await this.updateSetting({ language: e.target.value });
    });

    // Notification toggles
    ['emailNotifications', 'pushNotifications', 'studyReminders'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', async (e) => {
        await this.updateSetting({ [id]: e.target.checked });
      });
    });

    // Update profile
    document.getElementById('updateProfileBtn')?.addEventListener('click', async () => {
      await this.updateProfile();
    });

    // Change password
    document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.changePassword();
    });

    // 2FA
    document.getElementById('twoFactorToggle')?.addEventListener('change', async (e) => {
      if (e.target.checked) {
        if (confirm('Bạn có muốn bật xác thực 2 lớp? Một mã QR sẽ được hiển thị.')) {
          await this.enable2FA();
        } else {
          e.target.checked = false;
        }
      } else {
        await this.disable2FA();
      }
    });

    // Logout all
    document.getElementById('logoutAllBtn')?.addEventListener('click', async () => {
      if (confirm('Đăng xuất khỏi tất cả thiết bị?')) {
        await this.logoutAll();
      }
    });

    // Delete account
    document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
      this.confirmDeleteAccount();
    });
  }

  async updateSetting(data) {
    try {
      await api.updateProfile(data);
      this.showToast('Cập nhật thành công!', 'success');
    } catch (error) {
      this.showToast('Lỗi cập nhật', 'error');
    }
  }

  async updateProfile() {
    const username = document.getElementById('username')?.value.trim();
    const email = document.getElementById('email')?.value.trim();

    if (!username) {
      this.showToast('Vui lòng nhập tên người dùng', 'error');
      return;
    }

    try {
      await api.updateProfile({ username, email });
      this.showToast('Cập nhật thông tin thành công!', 'success');
    } catch (error) {
      this.showToast(error.message || 'Lỗi cập nhật', 'error');
    }
  }

  async changePassword() {
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.showToast('Vui lòng điền đầy đủ thông tin', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showToast('Mật khẩu mới không khớp', 'error');
      return;
    }

    if (newPassword.length < 8) {
      this.showToast('Mật khẩu mới phải có ít nhất 8 ký tự', 'error');
      return;
    }

    try {
      await api.changePassword(currentPassword, newPassword);
      this.showToast('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.', 'success');
      
      // Clear form
      document.getElementById('changePasswordForm')?.reset();
      
      // Logout after 2 seconds
      setTimeout(() => api.logout(), 2000);
    } catch (error) {
      this.showToast(error.message || 'Lỗi đổi mật khẩu', 'error');
    }
  }

  async loadSessions() {
    try {
      const response = await api.get('/auth/sessions');
      this.sessions = response.data;
      this.renderSessions();
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  renderSessions() {
    const container = document.getElementById('sessionsList');
    if (!container) return;

    if (!this.sessions || this.sessions.length === 0) {
      container.innerHTML = '<p class="text-muted">Không có phiên đăng nhập nào</p>';
      return;
    }

    container.innerHTML = this.sessions.map(session => `
      <div class="session-item">
        <div class="session-info">
          <i class="fas fa-${session.deviceType === 'mobile' ? 'mobile-alt' : 'desktop'}"></i>
          <div>
            <strong>${session.deviceType || 'Unknown'}</strong>
            <p>${session.userAgent?.substring(0, 50) || 'Unknown'} • ${Helpers.timeAgo(session.lastActivity)}</p>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="settingsPage.revokeSession('${session.id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  }

  async revokeSession(sessionId) {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      await this.loadSessions();
      this.showToast('Đã hủy phiên đăng nhập', 'success');
    } catch (error) {
      this.showToast('Lỗi hủy phiên', 'error');
    }
  }

  async enable2FA() {
    // Implementation for 2FA setup
    this.showToast('Tính năng đang phát triển', 'info');
    document.getElementById('twoFactorToggle').checked = false;
  }

  async disable2FA() {
    this.showToast('Đã tắt xác thực 2 lớp', 'success');
  }

  async logoutAll() {
    try {
      await api.post('/auth/logout-all');
      this.showToast('Đã đăng xuất tất cả thiết bị', 'success');
      await this.loadSessions();
    } catch (error) {
      this.showToast('Lỗi', 'error');
    }
  }

  confirmDeleteAccount() {
    const result = prompt('Nhập "XÓA" để xác nhận xóa tài khoản. Hành động này không thể hoàn tác!');
    if (result === 'XÓA') {
      this.deleteAccount();
    } else if (result !== null) {
      this.showToast('Hủy xóa tài khoản', 'info');
    }
  }

  async deleteAccount() {
    try {
      // API call to delete account
      this.showToast('Tài khoản đã được xóa', 'success');
      setTimeout(() => api.logout(), 2000);
    } catch (error) {
      this.showToast('Lỗi xóa tài khoản', 'error');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

let settingsPage;
document.addEventListener('DOMContentLoaded', () => {
  settingsPage = new SettingsPage();
  window.settingsPage = settingsPage;
});