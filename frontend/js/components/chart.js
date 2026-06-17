// frontend/js/components/chart.js
class ChartComponent {
    constructor() {
        this.charts = {};
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
        };
    }

    /**
     * Create a bar chart
     */
    createBarChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        // Destroy existing chart
        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');
        
        const chartOptions = {
            ...this.defaultOptions,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: this.getChartColor('text'),
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12,
                        }
                    }
                },
                tooltip: {
                    backgroundColor: this.getChartColor('tooltipBg'),
                    titleColor: this.getChartColor('tooltipTitle'),
                    bodyColor: this.getChartColor('tooltipBody'),
                    borderColor: this.getChartColor('border'),
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: this.getChartColor('grid'),
                    },
                    ticks: {
                        color: this.getChartColor('tick'),
                        font: {
                            size: 11,
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: this.getChartColor('tick'),
                        font: {
                            size: 11,
                        }
                    }
                }
            },
            ...options,
        };

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels || [],
                datasets: data.datasets.map(dataset => ({
                    ...dataset,
                    borderRadius: 8,
                    borderSkipped: false,
                })),
            },
            options: chartOptions,
        });

        this.charts[canvasId] = chart;
        return chart;
    }

    /**
     * Create a line chart
     */
    createLineChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

        const chartOptions = {
            ...this.defaultOptions,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: this.getChartColor('tooltipBg'),
                    titleColor: this.getChartColor('tooltipTitle'),
                    bodyColor: this.getChartColor('tooltipBody'),
                    borderColor: this.getChartColor('border'),
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                }
            },
            scales: {
                y: {
                    grid: {
                        color: this.getChartColor('grid'),
                    },
                    ticks: {
                        color: this.getChartColor('tick'),
                    }
                },
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: this.getChartColor('tick'),
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4,
                },
                point: {
                    radius: 4,
                    hoverRadius: 6,
                    backgroundColor: this.getChartColor('point'),
                    borderColor: this.getChartColor('pointBorder'),
                    borderWidth: 2,
                }
            },
            ...options,
        };

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: data.datasets.map(dataset => ({
                    ...dataset,
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: dataset.borderColor || '#3B82F6',
                    borderWidth: 3,
                    pointBackgroundColor: dataset.borderColor || '#3B82F6',
                })),
            },
            options: chartOptions,
        });

        this.charts[canvasId] = chart;
        return chart;
    }

    /**
     * Create a doughnut chart
     */
    createDoughnutChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        this.destroyChart(canvasId);

        const ctx = canvas.getContext('2d');

        const chartOptions = {
            ...this.defaultOptions,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: this.getChartColor('text'),
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12,
                        }
                    }
                },
                tooltip: {
                    backgroundColor: this.getChartColor('tooltipBg'),
                    titleColor: this.getChartColor('tooltipTitle'),
                    bodyColor: this.getChartColor('tooltipBody'),
                    borderColor: this.getChartColor('border'),
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                }
            },
            ...options,
        };

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels || [],
                datasets: [{
                    data: data.values || [],
                    backgroundColor: data.colors || [
                        '#10B981', '#3B82F6', '#F59E0B', '#EF4444',
                        '#8B5CF6', '#EC4899', '#06B6D4'
                    ],
                    borderColor: this.getChartColor('doughnutBorder'),
                    borderWidth: 2,
                    hoverBorderWidth: 3,
                }],
            },
            options: chartOptions,
        });

        this.charts[canvasId] = chart;
        return chart;
    }

    /**
     * Update chart data
     */
    updateChart(canvasId, data) {
        const chart = this.charts[canvasId];
        if (!chart) return;

        chart.data.labels = data.labels || chart.data.labels;
        
        if (data.datasets) {
            chart.data.datasets = data.datasets.map((dataset, i) => ({
                ...chart.data.datasets[i],
                ...dataset,
            }));
        }

        chart.update('active');
    }

    /**
     * Destroy a chart
     */
    destroyChart(canvasId) {
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
            delete this.charts[canvasId];
        }
    }

    /**
     * Destroy all charts
     */
    destroyAll() {
        Object.keys(this.charts).forEach(id => this.destroyChart(id));
    }

    /**
     * Resize all charts
     */
    resizeAll() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }

    /**
     * Get chart colors based on theme
     */
    getChartColor(key) {
        const isDark = !document.body.classList.contains('light-theme');
        
        const colors = {
            text: isDark ? '#CBD5E1' : '#475569',
            tick: isDark ? '#94A3B8' : '#64748B',
            grid: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)',
            border: isDark ? '#334155' : '#E2E8F0',
            tooltipBg: isDark ? '#1E293B' : '#FFFFFF',
            tooltipTitle: isDark ? '#F8FAFC' : '#0F172A',
            tooltipBody: isDark ? '#CBD5E1' : '#475569',
            point: '#3B82F6',
            pointBorder: isDark ? '#1E293B' : '#FFFFFF',
            doughnutBorder: isDark ? '#1E293B' : '#FFFFFF',
        };

        return colors[key] || colors.text;
    }

    /**
     * Export chart as image
     */
    exportChart(canvasId, format = 'png') {
        const chart = this.charts[canvasId];
        if (!chart) return;

        const url = chart.toBase64Image(`image/${format}`, 1);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chart-${canvasId}-${Date.now()}.${format}`;
        link.click();
    }

    /**
     * Generate weekly activity data
     */
    generateWeeklyData(rawData) {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const today = new Date();
        const labels = [];
        const data = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(days[date.getDay()]);
            
            const found = rawData?.find(d => 
                new Date(d.date).toDateString() === date.toDateString()
            );
            data.push(found?.cardsStudied || 0);
        }

        return { labels, data };
    }
}

// Initialize chart component
let charts;
document.addEventListener('DOMContentLoaded', () => {
    charts = new ChartComponent();
    window.charts = charts;
    window.ChartComponent = ChartComponent;

    // Handle theme changes
    const observer = new MutationObserver(() => {
        Object.keys(charts.charts).forEach(id => {
            const chart = charts.charts[id];
            if (chart) {
                chart.options.scales.y.grid.color = charts.getChartColor('grid');
                chart.options.scales.y.ticks.color = charts.getChartColor('tick');
                chart.options.scales.x.ticks.color = charts.getChartColor('tick');
                chart.update('none');
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        charts.resizeAll();
    });
});