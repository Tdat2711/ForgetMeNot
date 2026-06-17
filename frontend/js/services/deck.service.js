// frontend/js/services/deck.service.js
class DeckService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    /**
     * Get all decks with optional filters
     */
    async getDecks(options = {}) {
        const {
            page = 1,
            limit = 20,
            search = '',
            sortBy = 'updatedAt',
            order = 'desc',
            includeArchived = false
        } = options;

        const params = new URLSearchParams({
            page, limit, sortBy, order,
            ...(search && { search }),
            ...(includeArchived && { includeArchived: 'true' })
        });

        const cacheKey = `decks_${params.toString()}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const response = await api.get(`/decks?${params}`);
        this.setCache(cacheKey, response);
        return response;
    }

    /**
     * Get a single deck by ID
     */
    async getDeck(deckId) {
        const cacheKey = `deck_${deckId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const response = await api.get(`/decks/${deckId}`);
        this.setCache(cacheKey, response);
        return response;
    }

    /**
     * Create a new deck
     */
    async createDeck(data) {
        const response = await api.post('/decks', data);
        this.clearDeckCache();
        return response;
    }

    /**
     * Update an existing deck
     */
    async updateDeck(deckId, data) {
        const response = await api.put(`/decks/${deckId}`, data);
        this.clearDeckCache();
        this.cache.delete(`deck_${deckId}`);
        return response;
    }

    /**
     * Delete a deck
     */
    async deleteDeck(deckId) {
        const response = await api.delete(`/decks/${deckId}`);
        this.clearDeckCache();
        this.cache.delete(`deck_${deckId}`);
        return response;
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(deckId) {
        const response = await api.patch(`/decks/${deckId}/favorite`);
        this.clearDeckCache();
        this.cache.delete(`deck_${deckId}`);
        return response;
    }

    /**
     * Toggle archive status
     */
    async toggleArchive(deckId) {
        const response = await api.patch(`/decks/${deckId}/archive`);
        this.clearDeckCache();
        return response;
    }

    /**
     * Get flashcards for a deck
     */
    async getFlashcards(deckId, options = {}) {
        const { page = 1, limit = 20, search = '' } = options;
        const params = new URLSearchParams({ page, limit, ...(search && { search }) });

        return api.get(`/decks/${deckId}/flashcards?${params}`);
    }

    /**
     * Create a flashcard in a deck
     */
    async createFlashcard(deckId, data) {
        const response = await api.post(`/decks/${deckId}/flashcards`, data);
        this.clearDeckCache();
        return response;
    }

    /**
     * Get favorite decks
     */
    async getFavorites() {
        const cacheKey = 'favorites';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const response = await api.get('/decks/favorites');
        this.setCache(cacheKey, response);
        return response;
    }

    /**
     * Get decks due for review
     */
    async getDueDecks() {
        const response = await api.get('/decks?filter=due');
        return response;
    }

    /**
     * Get deck statistics
     */
    async getDeckStats(deckId) {
        return api.get(`/decks/${deckId}/stats`);
    }

    /**
     * Duplicate a deck
     */
    async duplicateDeck(deckId) {
        const original = await this.getDeck(deckId);
        const flashcards = await this.getFlashcards(deckId);
        
        const newDeck = await this.createDeck({
            name: `${original.data.name} (Bản sao)`,
            description: original.data.description,
            color: original.data.color,
            icon: original.data.icon
        });

        if (flashcards.data && flashcards.data.length > 0) {
            const createPromises = flashcards.data.map(card =>
                api.post(`/decks/${newDeck.data.id}/flashcards`, {
                    frontText: card.frontText,
                    backText: card.backText,
                    hint: card.hint,
                    difficulty: card.difficulty
                })
            );
            await Promise.all(createPromises);
        }

        this.clearDeckCache();
        return newDeck;
    }

    /**
     * Export deck as JSON
     */
    async exportDeck(deckId) {
        const deck = await this.getDeck(deckId);
        const flashcards = await this.getFlashcards(deckId);
        
        const exportData = {
            deck: deck.data,
            flashcards: flashcards.data,
            exportedAt: new Date().toISOString()
        };

        return exportData;
    }

    /**
     * Import deck from JSON
     */
    async importDeck(data) {
        const { deck, flashcards } = data;
        
        const newDeck = await this.createDeck({
            name: deck.name,
            description: deck.description,
            color: deck.color,
            icon: deck.icon
        });

        if (flashcards && flashcards.length > 0) {
            await Promise.all(flashcards.map(card =>
                this.createFlashcard(newDeck.data.id, card)
            ));
        }

        this.clearDeckCache();
        return newDeck;
    }

    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearDeckCache() {
        for (const key of this.cache.keys()) {
            if (key.startsWith('decks') || key.startsWith('deck_') || key === 'favorites') {
                this.cache.delete(key);
            }
        }
    }

    clearAllCache() {
        this.cache.clear();
    }
}

const deckService = new DeckService();
window.deckService = deckService;