// frontend/js/pages/dashboard.js
class DashboardPage {
  constructor() {
    this.user = null;
    this.stats = null;
    this.decks = [];
    this.weeklyChart = null;
    this.trendChart = null;
    
    this.init();
  }

  async init() {
    try {
      // Show loading state
      this.showSkeletonLoading();
      
      // Load user data
      await this.loadUserData();
      
      // Load dashboard data
      await Promise.all([
        this.loadStats(),
        this.loadDecks(),
        this.loadWeeklyActivity()
      ]);
      
      // Initialize charts
      this.initCharts();
      
      // Setup UI
      this.setupUI();
      this.setupEventListeners();
      this.checkCramMode();
      
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      this.showError('Không thể tải dữ liệu. Vui lòng thử lại.');
    }
  }

  async loadUserData() {
    try {
      const response = await api.getProfile();
      this.user = response.data;
      
      // Update UI with user data
      document.getElementById('welcomeName').textContent = this.user.username;
      document.getElementById('sidebarUsername').textContent = this.user.username;
      document.getElementById('sidebarUserId').textContent = `#${this.user.id.slice(0, 8)}`;
      
      // Set avatar
      const avatarUrl = this.user.avatar || '../assets/default-avatar.png';
      document.querySelectorAll('.user-avatar').forEach(img => {
        img.src = avatarUrl;
      });
      
    } catch (error) {
      console.error('Error loading user:', error);
      if (error.statusCode === 401) {
        window.location.href = 'login.html';
      }
    }
  }

  async loadStats() {
    try {
      const response = await api.get('/stats/dashboard');
      this.stats = response.data;
      
      // Update stat cards
      this.updateStatCards();
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  updateStatCards() {
    if (!this.stats) return;
    
    // Streak
    document.getElementById('streakCount').textContent = 
      this.stats.streak?.current || 0;
    document.querySelector('#streakCount').nextElementSibling.textContent = 
      this.stats.streak?.current > 1 ? 'Ngày liên tiếp' : 'Ngày';
    
    // Today's cards
    document.getElementById('cardsToday').textContent = 
      this.stats.today?.cardsStudied || 0;
    
    // Retention rate
    const retention = this.stats.today?.cardsLearned && this.stats.today?.cardsStudied
      ? Math.round((this.stats.today.cardsLearned / this.stats.today.cardsStudied) * 100)
      : 0;
    document.getElementById('retentionRate').textContent = `${retention}%`;
    
    // Total cards
    document.getElementById('totalCards').textContent = 
      Helpers.formatNumber(this.stats.totals?.cards || 0);
  }

  async loadDecks() {
    try {
      const response = await api.getDecks({ limit: 6, sortBy: 'updatedAt', order: 'desc' });
      this.decks = response.data;
      
      this.renderDecks();
      
    } catch (error) {
      console.error('Error loading decks:', error);
    }
  }

  renderDecks() {
    const container = document.getElementById('decksGrid');
    
    if (!this.decks || this.decks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-layer-group"></i>
          <h3>Chưa có bộ thẻ nào</h3>
          <p>Tạo bộ thẻ đầu tiên của bạn để bắt đầu học tập!</p>
          <button class="btn btn-primary" onclick="document.getElementById('createDeckBtn').click()">
            <i class="fas fa-plus"></i>
            Tạo Bộ Thẻ
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.decks.map(deck => {
      const cardCount = deck._count?.flashcards || 0;
      const lastStudied = deck.lastStudied 
        ? Helpers.timeAgo(new Date(deck.lastStudied))
        : 'Chưa học';
      const daysUntilExam = deck.examDate 
        ? Math.ceil((new Date(deck.examDate) - new Date()) / (1000 * 60 * 60 * 24))
        : null;
      const isUrgent = daysUntilExam !== null && daysUntilExam <= 7 && daysUntilExam > 0;
      
      return `
        <div class="deck-card" onclick="window.location.href='study.html?deckId=${deck.id}'">
          <div class="deck-card-header" style="background: linear-gradient(135deg, ${deck.color}, ${deck.color}dd)">
            <span class="deck-icon">${deck.icon || '📚'}</span>
            ${isUrgent ? `<span class="urgent-badge">🚨 ${daysUntilExam} ngày</span>` : ''}
          </div>
          <div class="deck-card-body">
            <h3>${Helpers.escapeHtml(deck.name)}</h3>
            <p>${Helpers.truncate(deck.description || 'Chưa có mô tả', 60)}</p>
            <div class="deck-card-stats">
              <span><i class="fas fa-clone"></i> ${cardCount} thẻ</span>
              <span><i class="fas fa-clock"></i> ${lastStudied}</span>
            </div>
          </div>
          <div class="deck-card-menu" onclick="event.stopPropagation()">
            <button class="icon-btn deck-menu-trigger" data-deck-id="${deck.id}">
              <i class="fas fa-ellipsis-v"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async loadWeeklyActivity() {
    try {
      const response = await api.get('/stats/weekly');
      this.weeklyData = response.data;
      
      if (this.weeklyChart) {
        this.updateWeeklyChart();
      }
      
    } catch (error) {
      console.error('Error loading weekly activity:', error);
    }
  }

  initCharts() {
    this.initWeeklyChart();
    this.initTrendChart();
  }

  initWeeklyChart() {
    const ctx = document.getElementById('weeklyChart')?.getContext('2d');
    if (!ctx) return;

    const labels = this.weeklyData?.map(d => d.day) || 
      ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const data = this.weeklyData?.map(d => d.cardsStudied) || 
      [0, 0, 0, 0, 0, 0, 0];

    this.weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Thẻ đã học',
          data,
          backgroundColor: (context) => {
            const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
            return gradient;
          },
          borderColor: '#3B82F6',
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
              color: '#94A3B8',
              font: { size: 12 }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#94A3B8',
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  initTrendChart() {
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (!ctx) return;

    // Generate mock trend data if real data not available
    const labels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5', 'Tuần 6'];
    const data = [65, 72, 78, 82, 85, 88];

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Tỷ lệ ghi nhớ (%)',
          data,
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#8B5CF6',
          pointBorderColor: '#1E293B',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
              color: '#94A3B8',
              callback: (value) => `${value}%`
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#94A3B8'
            }
          }
        }
      }
    });
  }

  updateWeeklyChart() {
    if (!this.weeklyChart || !this.weeklyData) return;
    
    this.weeklyChart.data.labels = this.weeklyData.map(d => d.day);
    this.weeklyChart.data.datasets[0].data = this.weeklyData.map(d => d.cardsStudied);
    this.weeklyChart.update();
  }

  checkCramMode() {
    if (!this.decks) return;
    
    const urgentDecks = this.decks.filter(deck => {
      if (!deck.examDate) return false;
      const daysUntil = Math.ceil((new Date(deck.examDate) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7 && daysUntil > 0;
    });

    if (urgentDecks.length > 0) {
      this.showCramAlert(urgentDecks);
    }
  }

  showCramAlert(decks) {
    const alert = document.getElementById('cramAlert');
    if (!alert) return;

    const totalDueCards = decks.reduce((sum, d) => sum + (d._count?.flashcards || 0), 0);
    const nextExam = decks[0]; // Show nearest exam
    
    document.getElementById('cramDays').textContent = 
      Math.ceil((new Date(nextExam.examDate) - new Date()) / (1000 * 60 * 60 * 24));
    document.getElementById('cramCards').textContent = totalDueCards;
    
    alert.classList.remove('hidden');
    
    // Pulse animation
    alert.querySelector('.cram-banner').style.animation = 'pulse 2s infinite';
  }

  setupUI() {
    // Apply theme
    if (this.user?.darkMode === false) {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }

    // Update sidebar active state
    document.querySelector('.nav-item[href="dashboard.html"]')?.classList.add('active');
  }

  setupEventListeners() {
    // Create deck button
    document.getElementById('createDeckBtn')?.addEventListener('click', () => {
      this.showCreateDeckModal();
    });

    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('collapsed');
    });

    // Notifications button
    document.getElementById('notificationsBtn')?.addEventListener('click', () => {
      this.showNotifications();
    });

    // Deck menu handlers
    document.addEventListener('click', (e) => {
      const menuTrigger = e.target.closest('.deck-menu-trigger');
      if (menuTrigger) {
        const deckId = menuTrigger.dataset.deckId;
        this.showDeckMenu(menuTrigger, deckId);
      }
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      if (confirm('Bạn có chắc muốn đăng xuất?')) {
        await api.logout();
      }
    });
  }

  showCreateDeckModal() {
    const modal = document.getElementById('createDeckModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    // Reset form
    const form = document.getElementById('createDeckForm');
    if (form) {
      form.reset();
      form.classList.add('hidden');
    }
    
    // Show options
    document.querySelector('.create-options')?.classList.remove('hidden');
    
    // Setup option handlers
    document.getElementById('manualCreateBtn')?.addEventListener('click', () => {
      document.querySelector('.create-options')?.classList.add('hidden');
      document.getElementById('createDeckForm')?.classList.remove('hidden');
    });

    document.getElementById('aiCreateBtn')?.addEventListener('click', () => {
      window.location.href = 'decks.html?action=ai-create';
    });

    // Close handler
    modal.querySelector('.modal-close')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    // Form submit
    document.getElementById('createDeckForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.createDeck();
    });
  }

  async createDeck() {
    const name = document.getElementById('deckName')?.value.trim();
    const description = document.getElementById('deckDescription')?.value.trim();
    const examDate = document.getElementById('deckExamDate')?.value;
    const color = document.getElementById('deckColor')?.value;

    if (!name) {
      this.showToast('Vui lòng nhập tên bộ thẻ', 'error');
      return;
    }

    try {
      const response = await api.createDeck({
        name,
        description,
        examDate: examDate || null,
        color: color || '#3B82F6'
      });

      if (response.success) {
        this.showToast('Tạo bộ thẻ thành công!', 'success');
        document.getElementById('createDeckModal')?.classList.add('hidden');
        
        // Reload decks
        await this.loadDecks();
      }
    } catch (error) {
      this.showToast(error.message || 'Lỗi tạo bộ thẻ', 'error');
    }
  }

  showDeckMenu(trigger, deckId) {
    // Remove existing menus
    document.querySelectorAll('.deck-context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'deck-context-menu';
    menu.innerHTML = `
      <button onclick="window.location.href='study.html?deckId=${deckId}'">
        <i class="fas fa-play"></i> Học ngay
      </button>
      <button onclick="dashboard.editDeck('${deckId}')">
        <i class="fas fa-edit"></i> Chỉnh sửa
      </button>
      <button onclick="dashboard.toggleFavorite('${deckId}')">
        <i class="fas fa-star"></i> Yêu thích
      </button>
      <hr>
      <button onclick="dashboard.deleteDeck('${deckId}')" class="danger">
        <i class="fas fa-trash"></i> Xóa
      </button>
    `;

    const rect = trigger.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left - 100}px`;

    document.body.appendChild(menu);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
  }

  async toggleFavorite(deckId) {
    try {
      await api.toggleFavorite(deckId);
      await this.loadDecks();
      this.showToast('Đã cập nhật yêu thích!', 'success');
    } catch (error) {
      this.showToast('Lỗi cập nhật', 'error');
    }
  }

  async deleteDeck(deckId) {
    if (!confirm('Bạn có chắc muốn xóa bộ thẻ này? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      await api.deleteDeck(deckId);
      this.showToast('Đã xóa bộ thẻ', 'success');
      await this.loadDecks();
    } catch (error) {
      this.showToast('Lỗi xóa bộ thẻ', 'error');
    }
  }

  showSkeletonLoading() {
    document.getElementById('decksGrid').innerHTML = `
      <div class="skeleton" style="height: 200px"></div>
      <div class="skeleton" style="height: 200px"></div>
      <div class="skeleton" style="height: 200px"></div>
    `;
  }

  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize dashboard
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new DashboardPage();
  window.dashboard = dashboard;
});