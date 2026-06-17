// frontend/js/components/notification.js
class NotificationComponent {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        
        this.init();
    }

    init() {
        this.createContainer();
        this.loadNotifications();
        this.setupPolling();
    }

    createContainer() {
        // Check if container exists
        let container = document.getElementById('toastContainer');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        this.container = container;
    }

    /**
     * Show a toast notification
     * @param {string} message - Notification message
     * @param {string} type - success, error, warning, info
     * @param {Object} options - Additional options
     */
    show(message, type = 'info', options = {}) {
        const {
            duration = this.defaultDuration,
            title = '',
            icon = '',
            action = null,
            dismissible = true,
        } = options;

        // Remove oldest notification if max reached
        if (this.notifications.length >= this.maxNotifications) {
            const oldest = this.notifications.shift();
            this.removeToast(oldest.element);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        // Determine icon
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
        };

        const displayIcon = icon || iconMap[type] || 'fa-bell';

        // Build toast HTML
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${displayIcon}"></i>
            </div>
            <div class="toast-content">
                ${title ? `<strong class="toast-title">${title}</strong>` : ''}
                <p class="toast-message">${message}</p>
                ${action ? `
                    <button class="toast-action" onclick="${action.onClick}">
                        ${action.text}
                    </button>
                ` : ''}
            </div>
            ${dismissible ? `
                <button class="toast-close" aria-label="Đóng">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
            <div class="toast-progress">
                <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
            </div>
        `;

        // Add to container
        this.container.appendChild(toast);

        // Setup close button
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.removeToast(toast));
        }

        // Add to notifications array
        const notification = {
            element: toast,
            timeout: null,
        };

        this.notifications.push(notification);

        // Auto remove after duration
        if (duration > 0) {
            notification.timeout = setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }

        // Pause timer on hover
        toast.addEventListener('mouseenter', () => {
            if (notification.timeout) {
                clearTimeout(notification.timeout);
            }
            const progressBar = toast.querySelector('.toast-progress-bar');
            if (progressBar) {
                progressBar.style.animationPlayState = 'paused';
            }
        });

        toast.addEventListener('mouseleave', () => {
            if (duration > 0) {
                notification.timeout = setTimeout(() => {
                    this.removeToast(toast);
                }, duration / 2);
            }
            const progressBar = toast.querySelector('.toast-progress-bar');
            if (progressBar) {
                progressBar.style.animationPlayState = 'running';
            }
        });

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        return toast;
    }

    /**
     * Show success notification
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show error notification
     */
    error(message, options = {}) {
        return this.show(message, 'error', {
            duration: 7000, // Errors stay longer
            ...options,
        });
    }

    /**
     * Show warning notification
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Show info notification
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Remove a toast notification
     */
    removeToast(toast) {
        if (!toast || !toast.parentElement) return;

        // Remove from notifications array
        this.notifications = this.notifications.filter(n => n.element !== toast);

        // Clear timeout
        const notification = this.notifications.find(n => n.element === toast);
        if (notification?.timeout) {
            clearTimeout(notification.timeout);
        }

        // Animate out
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, { once: true });

        // Fallback removal
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 500);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach(n => this.removeToast(n.element));
    }

    /**
     * Load notifications from server
     */
    async loadNotifications() {
        try {
            const response = await api.get('/notifications');
            const serverNotifications = response.data || [];
            
            serverNotifications
                .filter(n => !n.isRead)
                .forEach(n => {
                    this.show(n.message, 'info', {
                        title: n.title,
                    });
                });

            // Update notification badge
            this.updateBadge(serverNotifications.filter(n => !n.isRead).length);
        } catch (error) {
            // Silently fail - notifications are not critical
            console.debug('Could not load notifications:', error);
        }
    }

    /**
     * Update notification badge
     */
    updateBadge(count) {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllRead() {
        try {
            await api.post('/notifications/mark-all-read');
            this.updateBadge(0);
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }

    /**
     * Setup polling for new notifications
     */
    setupPolling() {
        // Check for new notifications every 60 seconds
        setInterval(() => {
            this.loadNotifications();
        }, 60000);
    }
}

// Initialize notification component
let notifications;
document.addEventListener('DOMContentLoaded', () => {
    notifications = new NotificationComponent();
    window.notifications = notifications;
    window.NotificationComponent = NotificationComponent;
});