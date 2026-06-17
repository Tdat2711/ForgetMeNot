// frontend/js/components/modal.js
class ModalComponent {
    constructor() {
        this.activeModals = [];
        this.init();
    }

    init() {
        // Close modals on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                const lastModal = this.activeModals[this.activeModals.length - 1];
                this.close(lastModal);
            }
        });

        // Close modals when clicking overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.close(e.target);
            }
        });
    }

    /**
     * Create and show a modal
     * @param {Object} options - Modal options
     * @param {string} options.title - Modal title
     * @param {string} options.content - HTML content
     * @param {string} options.size - Modal size (sm, md, lg, xl)
     * @param {Array} options.buttons - Footer buttons
     * @param {boolean} options.closeOnOverlay - Close when clicking overlay
     * @param {Function} options.onClose - Callback on close
     */
    show(options = {}) {
        const {
            title = '',
            content = '',
            size = 'md',
            buttons = [],
            closeOnOverlay = true,
            onClose = null,
            className = '',
        } = options;

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        if (!closeOnOverlay) {
            overlay.dataset.closeOnOverlay = 'false';
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = `modal modal-${size} ${className}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'modal-title');

        // Build modal HTML
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title" id="modal-title">${title}</h3>
                <button class="modal-close" aria-label="Đóng">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            ${buttons.length > 0 ? `
                <div class="modal-footer">
                    ${buttons.map(btn => this.renderButton(btn)).join('')}
                </div>
            ` : ''}
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Add to active modals stack
        this.activeModals.push(overlay);

        // Setup close handlers
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close(overlay, onClose));
        }

        if (closeOnOverlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close(overlay, onClose);
                }
            });
        }

        // Setup button handlers
        buttons.forEach((btn, index) => {
            if (btn.onClick) {
                const btnElement = modal.querySelectorAll('.modal-footer .btn')[index];
                if (btnElement) {
                    btnElement.addEventListener('click', () => {
                        const result = btn.onClick(overlay);
                        if (result !== false && btn.closeOnClick !== false) {
                            this.close(overlay, onClose);
                        }
                    });
                }
            }
        });

        // Animation
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
            modal.style.opacity = '1';
        });

        return overlay;
    }

    /**
     * Close a modal
     */
    close(overlay, callback = null) {
        if (!overlay) return;

        const modal = overlay.querySelector('.modal');
        
        // Animation out
        overlay.style.opacity = '0';
        if (modal) {
            modal.style.transform = 'scale(0.95)';
            modal.style.opacity = '0';
        }

        setTimeout(() => {
            overlay.remove();
            
            // Remove from active modals
            this.activeModals = this.activeModals.filter(m => m !== overlay);
            
            // Restore body scroll if no more modals
            if (this.activeModals.length === 0) {
                document.body.style.overflow = '';
            }

            // Callback
            if (callback) {
                callback();
            }
        }, 200);
    }

    /**
     * Close all modals
     */
    closeAll() {
        [...this.activeModals].forEach(modal => this.close(modal));
    }

    /**
     * Show confirmation dialog
     */
    confirm(options = {}) {
        const {
            title = 'Xác nhận',
            message = 'Bạn có chắc chắn?',
            confirmText = 'Xác nhận',
            cancelText = 'Hủy',
            confirmClass = 'btn-primary',
            onConfirm = null,
            onCancel = null,
        } = options;

        return this.show({
            title,
            size: 'sm',
            content: `<p>${message}</p>`,
            buttons: [
                {
                    text: cancelText,
                    class: 'btn-secondary',
                    onClick: (modal) => {
                        if (onCancel) onCancel();
                        return true;
                    }
                },
                {
                    text: confirmText,
                    class: confirmClass,
                    onClick: (modal) => {
                        if (onConfirm) onConfirm();
                        return true;
                    }
                }
            ],
            closeOnOverlay: false,
        });
    }

    /**
     * Show alert dialog
     */
    alert(options = {}) {
        const {
            title = 'Thông báo',
            message = '',
            buttonText = 'OK',
            onClose = null,
        } = options;

        return this.show({
            title,
            size: 'sm',
            content: `<p>${message}</p>`,
            buttons: [
                {
                    text: buttonText,
                    class: 'btn-primary',
                    onClick: () => true
                }
            ],
            closeOnOverlay: false,
            onClose,
        });
    }

    /**
     * Show loading modal
     */
    showLoading(message = 'Đang tải...') {
        return this.show({
            size: 'sm',
            content: `
                <div style="text-align: center; padding: 20px;">
                    <div class="spinner" style="margin: 0 auto 16px;"></div>
                    <p>${message}</p>
                </div>
            `,
            closeOnOverlay: false,
            className: 'modal-loading',
        });
    }

    /**
     * Render button HTML
     */
    renderButton(btn) {
        const {
            text = '',
            class: btnClass = 'btn-secondary',
            icon = '',
            disabled = false,
        } = btn;

        return `
            <button class="btn ${btnClass}" ${disabled ? 'disabled' : ''}>
                ${icon ? `<i class="fas fa-${icon}"></i>` : ''}
                ${text}
            </button>
        `;
    }
}

// Initialize modal component
let modal;
document.addEventListener('DOMContentLoaded', () => {
    modal = new ModalComponent();
    window.modal = modal;
    window.ModalComponent = ModalComponent;
});