// frontend/js/config/config.js
const CONFIG = {
    // API Configuration - luôn dùng localhost khi dev
    API_URL: 'http://localhost:5000/api',
    
    // Application
    APP_NAME: 'ForgetMeNot',
    APP_VERSION: '2.0.0',
    APP_DESCRIPTION: 'Ứng dụng Flashcard thông minh với AI và Spaced Repetition',
    
    // Storage Keys
    STORAGE_KEYS: {
        TOKEN: 'forgetmenot_token',
        REFRESH_TOKEN: 'forgetmenot_refresh_token',
        USER: 'forgetmenot_user',
        THEME: 'forgetmenot_theme',
        LANGUAGE: 'forgetmenot_language',
        SETTINGS: 'forgetmenot_settings'
    },
    
    // Theme
    THEMES: {
        DARK: 'dark-theme',
        LIGHT: 'light-theme'
    },
    
    // Study Settings
    STUDY: {
        CARD_FLIP_ANIMATION: true,
        AUTO_FLIP_DELAY: 0,
        SHOW_HINT_BUTTON: true,
        SHOW_PROGRESS_BAR: true,
        ENABLE_KEYBOARD_SHORTCUTS: true,
        DEFAULT_DECK_LIMIT: 20
    },
    
    // SRS Settings
    SRS: {
        QUALITIES: {
            AGAIN: 0,
            HARD: 1,
            GOOD: 3,
            EASY: 5
        },
        DEFAULT_EASE: 2.5,
        MIN_EASE: 1.3,
        MAX_INTERVAL: 365
    },
    
    // Cram Mode
    CRAM_MODE: {
        DAYS_BEFORE_EXAM: 7,
        MINUTE_INTERVALS: {
            AGAIN: 1,
            HARD: 5,
            GOOD: 10,
            EASY: 20
        }
    },
    
    // AI Settings
    AI: {
        MAX_TEXT_LENGTH: 50000,
        DEFAULT_CARD_COUNT: 20,
        MAX_FILE_SIZE: 10 * 1024 * 1024,
        SUPPORTED_FORMATS: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ]
    },
    
    // Gemini AI
    GEMINI_API_KEY: 'AQ.Ab8RN6JcNUztpTiuwhxyYwIUyXBcajtl0APRFhntkqJf2dpB-g',
    GEMINI_MODEL: 'gemini-1.5-flash',
    GEMINI_MAX_TOKENS: 8192,
    
    // Pagination
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 20,
        MAX_PAGE_SIZE: 100
    },
    
    // Date Formats
    DATE_FORMATS: {
        FULL: 'DD/MM/YYYY HH:mm',
        SHORT: 'DD/MM/YYYY',
        TIME: 'HH:mm',
        RELATIVE: 'relative'
    },
    
    // Colors
    DECK_COLORS: [
        '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
        '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1'
    ],
    
    // Chart Colors
    CHART_COLORS: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#06B6D4',
        gray: '#94A3B8'
    }
};

// Log API_URL để debug
console.log('🔗 API_URL:', CONFIG.API_URL);

// Freeze config
Object.freeze(CONFIG);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.SRS);
Object.freeze(CONFIG.CRAM_MODE);
Object.freeze(CONFIG.AI);

window.CONFIG = CONFIG;