// frontend/js/app.js
class App {
  constructor() {
    this.user = null;
    this.theme = 'dark';
    this.init();
  }

  async init() {
    // Check authentication
    await this.checkAuth();
    
    // Load theme
    this.loadTheme();
    
    // Initialize components
    this.initSidebar();
    this.initNotifications();
    this.initKeyboardShortcuts();
    
    // Global error handling
    this.setupErrorHandling();
  }

  async checkAuth() {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    
    if (!token) {
      // Not authenticated, redirect to login if not already there
      const isAuthPage = window.location.pathname.includes('login.html') || 
                        window.location.pathname.includes('register.html');
      if (!isAuthPage) {
        window.location.href = '/pages/login.html';
      }
      return;
    }

    try {
      const response = await api.getProfile();
      this.user = response.data;
      
      // Update UI
      this.updateUserUI();
      
    } catch (error) {
      if (error.statusCode === 401) {
        api.clearTokens();
        window.location.href = '/pages/login.html';
      }
    }
  }

  updateUserUI() {
    if (!this.user) return;
    
    // Update sidebar user info
    const sidebarUsername = document.getElementById('sidebarUsername');
    const sidebarUserId = document.getElementById('sidebarUserId');
    const userAvatars = document.querySelectorAll('.user-avatar');
    
    if (sidebarUsername) sidebarUsername.textContent = this.user.username;
    if (sidebarUserId) sidebarUserId.textContent = `#${this.user.id.slice(0, 8)}`;
    
    userAvatars.forEach(img => {
      img.src = this.user.avatar || '/assets/default-avatar.png';
      img.alt = this.user.username;
    });
  }

  loadTheme() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      this.theme = savedTheme;
    } else {
      this.theme = prefersDark ? 'dark' : 'light';
    }
    
    this.applyTheme();
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(CONFIG.STORAGE_KEYS.THEME)) {
        this.theme = e.matches ? 'dark' : 'light';
        this.applyTheme();
      }
    });
  }

  applyTheme() {
    if (this.theme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, this.theme);
    this.applyTheme();
  }

  initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle) {
      toggle.addEventListener('click', () => {
        sidebar?.classList.toggle('collapsed');
        localStorage.setItem('sidebar_collapsed', sidebar?.classList.contains('collapsed'));
      });
    }

    // Restore sidebar state
    const savedState = localStorage.getItem('sidebar_collapsed');
    if (savedState === 'true') {
      sidebar?.classList.add('collapsed');
    }

    // Mobile: close sidebar on overlay click
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar?.classList.remove('mobile-open');
      });
    }

    // Mobile: toggle sidebar
    const mobileToggle = document.getElementById('mobileSidebarToggle');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        sidebar?.classList.toggle('mobile-open');
      });
    }
  }

  initNotifications() {
    // Request notification permission
    if ('Notification' in window && this.user?.pushNotifications) {
      Notification.requestPermission();
    }
  }

  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.matches('input, textarea, [contenteditable]')) return;

      // Ctrl/Cmd + shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            // Focus search
            document.querySelector('.search-input-wrapper input')?.focus();
            break;
          case 'n':
            e.preventDefault();
            // Create new deck
            document.getElementById('createDeckBtn')?.click();
            break;
          case 'd':
            e.preventDefault();
            // Toggle dark mode
            this.toggleTheme();
            break;
          case 'b':
            e.preventDefault();
            // Toggle sidebar
            document.getElementById('sidebar')?.classList.toggle('collapsed');
            break;
        }
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        document.querySelectorAll('.context-menu').forEach(m => m.remove());
      }
    });
  }

  setupErrorHandling() {
    // Global fetch error handling
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Show toast for network errors
      if (event.reason?.message?.includes('Failed to fetch')) {
        this.showToast('Mất kết nối mạng. Vui lòng kiểm tra lại.', 'error');
      }
    });

    // Global error handling
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });
  }

  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer') || this.createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  logout() {
    api.logout();
  }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new App();
  window.app = app;
});