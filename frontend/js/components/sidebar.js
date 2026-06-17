// frontend/js/components/sidebar.js
class SidebarComponent {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.toggleBtn = document.getElementById('sidebarToggle');
        this.mobileToggle = document.getElementById('mobileSidebarToggle');
        this.overlay = document.getElementById('sidebarOverlay');
        this.isCollapsed = false;
        this.isMobileOpen = false;
        
        this.init();
    }

    init() {
        // Restore sidebar state from localStorage
        const savedState = localStorage.getItem('sidebar_collapsed');
        if (savedState === 'true') {
            this.collapse();
        }

        // Setup toggle button
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Setup mobile toggle
        if (this.mobileToggle) {
            this.mobileToggle.addEventListener('click', () => this.toggleMobile());
        }

        // Close sidebar when clicking overlay on mobile
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeMobile());
        }

        // Close mobile sidebar on route change
        window.addEventListener('popstate', () => this.closeMobile());

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // Keyboard shortcut: Ctrl+B to toggle sidebar
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                this.toggle();
            }
        });

        // Set active nav item based on current page
        this.setActiveNavItem();
        
        // Update user info in sidebar
        this.updateUserInfo();
    }

    toggle() {
        if (window.innerWidth <= 768) {
            this.toggleMobile();
            return;
        }

        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    collapse() {
        this.isCollapsed = true;
        this.sidebar?.classList.add('collapsed');
        localStorage.setItem('sidebar_collapsed', 'true');
        
        // Update toggle icon
        const icon = this.toggleBtn?.querySelector('i');
        if (icon) {
            icon.style.transform = 'rotate(180deg)';
        }

        // Dispatch event
        this.dispatchEvent('collapsed');
    }

    expand() {
        this.isCollapsed = false;
        this.sidebar?.classList.remove('collapsed');
        localStorage.setItem('sidebar_collapsed', 'false');
        
        // Update toggle icon
        const icon = this.toggleBtn?.querySelector('i');
        if (icon) {
            icon.style.transform = 'rotate(0deg)';
        }

        // Dispatch event
        this.dispatchEvent('expanded');
    }

    toggleMobile() {
        if (this.isMobileOpen) {
            this.closeMobile();
        } else {
            this.openMobile();
        }
    }

    openMobile() {
        this.isMobileOpen = true;
        this.sidebar?.classList.add('mobile-open');
        if (this.overlay) this.overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        this.dispatchEvent('mobileOpened');
    }

    closeMobile() {
        this.isMobileOpen = false;
        this.sidebar?.classList.remove('mobile-open');
        if (this.overlay) this.overlay.style.display = 'none';
        document.body.style.overflow = '';
        
        this.dispatchEvent('mobileClosed');
    }

    handleResize() {
        if (window.innerWidth > 768) {
            this.closeMobile();
        }
    }

    setActiveNavItem() {
        const currentPath = window.location.pathname;
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.classList.remove('active');
            const href = item.getAttribute('href');
            if (href && currentPath.includes(href.replace('.html', ''))) {
                item.classList.add('active');
            }
        });
    }

    async updateUserInfo() {
        try {
            const response = await api.getProfile();
            const user = response.data;
            
            // Update sidebar user info
            const username = document.getElementById('sidebarUsername');
            const email = document.getElementById('sidebarEmail');
            const avatars = document.querySelectorAll('.user-avatar, #sidebarAvatar');
            
            if (username) username.textContent = user.username;
            if (email) email.textContent = user.email;
            
            avatars.forEach(img => {
                img.src = user.avatar || '../assets/images/default-avatar.png';
                img.alt = user.username;
                img.onerror = () => {
                    img.src = '../assets/images/default-avatar.png';
                };
            });

        } catch (error) {
            console.error('Error updating sidebar user info:', error);
        }
    }

    dispatchEvent(name) {
        const event = new CustomEvent(`sidebar:${name}`, {
            detail: {
                isCollapsed: this.isCollapsed,
                isMobileOpen: this.isMobileOpen
            }
        });
        document.dispatchEvent(event);
    }

    // Update due cards badge
    async updateDueCardsBadge() {
        try {
            const response = await api.get('/study/due-cards');
            const badge = document.getElementById('dueCardsBadge');
            const count = response.data?.total || 0;
            
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Error updating due cards badge:', error);
        }
    }
}

// Initialize sidebar
let sidebar;
document.addEventListener('DOMContentLoaded', () => {
    sidebar = new SidebarComponent();
    window.sidebar = sidebar;
    
    // Update due cards badge periodically
    sidebar.updateDueCardsBadge();
    setInterval(() => sidebar.updateDueCardsBadge(), 60000); // Every minute
});