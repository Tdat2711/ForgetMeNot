// frontend/js/pages/statistics.js
class StatisticsPage {
  constructor() {
    this.stats = null;
    this.weeklyChart = null;
    this.trendChart = null;
    this.performanceChart = null;
    
    this.init();
  }

  async init() {
    await this.loadStats();
    this.initCharts();
    this.setupEventListeners();
  }

  async loadStats() {
    try {
      const response = await api.getStudyStats();
      this.stats = response.data;
      this.updateStatCards();
      this.updateCharts();
      this.renderPerformanceTable();
      this.renderActivityLog();
    } catch (error) {
      console.error('Error loading stats:', error);
      this.showError('Không thể tải thống kê');
    }
  }

  updateStatCards() {
    if (!this.stats) return;

    // Streak
    document.getElementById('streakCount').textContent = this.stats.streak?.current || 0;
    document.getElementById('longestStreak').textContent = this.stats.streak?.longest || 0;

    // Today
    document.getElementById('cardsToday').textContent = this.stats.today?.cardsStudied || 0;
    document.getElementById('reviewsToday').textContent = this.stats.today?.reviewsCompleted || 0;

    // Retention
    const retention = this.stats.today?.cardsStudied > 0
      ? Math.round((this.stats.today.cardsLearned / this.stats.today.cardsStudied) * 100)
      : 0;
    document.getElementById('retentionRate').textContent = `${retention}%`;

    // All time
    document.getElementById('totalCards').textContent = Helpers.formatNumber(this.stats.totals?.cards || 0);
    document.getElementById('totalReviews').textContent = Helpers.formatNumber(this.stats.allTime?.totalReviews || 0);
  }

  initCharts() {
    this.initWeeklyChart();
    this.initTrendChart();
    this.initPerformanceChart();
  }

  initWeeklyChart() {
    const ctx = document.getElementById('weeklyChart')?.getContext('2d');
    if (!ctx) return;

    this.weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
        datasets: [{
          label: 'Thẻ đã học',
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: '#3B82F6',
          borderWidth: 1,
          borderRadius: 8,
        }, {
          label: 'Thẻ ghi nhớ',
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: '#10B981',
          borderWidth: 1,
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94A3B8',
              usePointStyle: true,
              padding: 20,
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94A3B8' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8' }
          }
        }
      }
    });
  }

  initTrendChart() {
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5', 'Tuần 6'],
        datasets: [{
          label: 'Tỷ lệ ghi nhớ',
          data: [0, 0, 0, 0, 0, 0],
          borderColor: '#8B5CF6',
          backgroundColor: gradient,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#8B5CF6',
          pointBorderColor: '#1E293B',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { 
              color: '#94A3B8',
              callback: (value) => `${value}%`
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8' }
          }
        }
      }
    });
  }

  initPerformanceChart() {
    const ctx = document.getElementById('performanceChart')?.getContext('2d');
    if (!ctx) return;

    this.performanceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Dễ', 'Tốt', 'Khó', 'Quên'],
        datasets: [{
          data: [30, 40, 20, 10],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderColor: '#1E293B',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94A3B8',
              padding: 20,
            }
          }
        }
      }
    });
  }

  updateCharts() {
    // Update with real data when available
    if (this.stats?.weekly && this.weeklyChart) {
      this.weeklyChart.data.datasets[0].data = this.stats.weekly.map(d => d.cardsStudied);
      this.weeklyChart.data.datasets[1].data = this.stats.weekly.map(d => d.cardsLearned);
      this.weeklyChart.update();
    }
  }

  renderPerformanceTable() {
    const container = document.getElementById('performanceTable');
    if (!container) return;

    if (!this.stats?.deckPerformance || this.stats.deckPerformance.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">Chưa có dữ liệu</p>';
      return;
    }

    container.innerHTML = `
      <table class="performance-table">
        <thead>
          <tr>
            <th>Bộ thẻ</th>
            <th>Số thẻ</th>
            <th>Đã ôn</th>
            <th>Tỷ lệ nhớ</th>
            <th>Độ khó TB</th>
          </tr>
        </thead>
        <tbody>
          ${this.stats.deckPerformance.map(deck => `
            <tr>
              <td>
                <div class="deck-name-cell">
                  <span class="deck-color-dot" style="background: ${deck.color}"></span>
                  ${Helpers.escapeHtml(deck.name)}
                </div>
              </td>
              <td>${deck.cardCount}</td>
              <td>${Helpers.formatNumber(deck.totalReviews)}</td>
              <td>
                <div class="progress-cell">
                  <div class="progress-bar small">
                    <div class="progress-fill" style="width: ${deck.retentionRate}%"></div>
                  </div>
                  <span>${deck.retentionRate}%</span>
                </div>
              </td>
              <td>
                <span class="badge badge-${deck.averageEase > 2.5 ? 'success' : 'warning'}">
                  ${deck.averageEase.toFixed(1)}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  renderActivityLog() {
    const container = document.getElementById('activityLog');
    if (!container) return;

    if (!this.stats?.activity || this.stats.activity.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">Chưa có hoạt động nào</p>';
      return;
    }

    container.innerHTML = this.stats.activity.slice(0, 20).map(activity => `
      <div class="activity-item">
        <div class="activity-icon activity-${activity.quality}">
          <i class="fas fa-${this.getQualityIcon(activity.quality)}"></i>
        </div>
        <div class="activity-content">
          <p class="activity-text">${Helpers.truncate(activity.cardPreview, 60)}</p>
          <span class="activity-meta">
            ${activity.deckName} • ${Helpers.timeAgo(activity.date)}
          </span>
        </div>
        <span class="activity-quality ${this.getQualityClass(activity.quality)}">
          ${activity.qualityLabel}
        </span>
      </div>
    `).join('');
  }

  getQualityIcon(quality) {
    const icons = { 0: 'redo', 1: 'meh', 3: 'check', 5: 'star' };
    return icons[quality] || 'question';
  }

  getQualityClass(quality) {
    const classes = { 0: 'again', 1: 'hard', 3: 'good', 5: 'easy' };
    return classes[quality] || '';
  }

  setupEventListeners() {
    // Refresh button
    document.getElementById('refreshStatsBtn')?.addEventListener('click', () => {
      this.loadStats();
    });

    // Period selector
    document.getElementById('periodSelect')?.addEventListener('change', (e) => {
      this.loadStatsByPeriod(e.target.value);
    });
  }

  async loadStatsByPeriod(period) {
    try {
      const response = await api.get(`/stats/activity?days=${period}`);
      this.stats.activity = response.data;
      this.renderActivityLog();
    } catch (error) {
      console.error('Error loading period stats:', error);
    }
  }

  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

let statisticsPage;
document.addEventListener('DOMContentLoaded', () => {
  statisticsPage = new StatisticsPage();
  window.statisticsPage = statisticsPage;
});