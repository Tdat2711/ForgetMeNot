// backend/src/services/srs.service.js
class SRSService {
  constructor() {
    // SM-2 Algorithm Parameters
    this.params = {
      defaultEase: 2.5,
      minEase: 1.3,
      maxEase: 3.5,
      easyBonus: 0.15,
      hardPenalty: 0.15,
      againPenalty: 0.20,
      
      // Intervals for first reviews (days)
      intervals: [1, 3, 7, 14, 30, 60, 120],
      
      // Cram mode intervals (minutes)
      cramIntervals: {
        AGAIN: 1,
        HARD: 5,
        GOOD: 10,
        EASY: 20,
      }
    };
  }

  /**
   * Calculate next review using SM-2 algorithm
   */
  calculate(card, quality, options = {}) {
    const { isCramMode = false, timeSpent = 0 } = options;
    
    if (isCramMode) {
      return this.calculateCramMode(card, quality);
    }
    
    return this.calculateSM2(card, quality, timeSpent);
  }

  /**
   * Standard SM-2 Algorithm
   */
  calculateSM2(card, quality, timeSpent) {
    let { easeFactor, interval, repetitions } = card;
    
    // Validate and clamp ease factor
    easeFactor = Math.max(this.params.minEase, Math.min(this.params.maxEase, easeFactor));
    
    let newInterval;
    let newRepetitions = repetitions;
    
    if (quality >= 3) {
      // Successful recall
      if (repetitions === 0) {
        newInterval = this.params.intervals[0]; // 1 day
      } else if (repetitions === 1) {
        newInterval = this.params.intervals[1]; // 3 days
      } else if (repetitions < this.params.intervals.length) {
        newInterval = this.params.intervals[repetitions];
      } else {
        newInterval = Math.round(interval * easeFactor);
      }
      
      newRepetitions += 1;
      
      // Update ease factor based on performance
      const qualityFactor = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
      easeFactor += qualityFactor;
      
      // Extra bonus for easy cards
      if (quality === 5) {
        easeFactor += this.params.easyBonus;
        newInterval = Math.round(newInterval * 1.3);
      }
      
      // Adjust for time spent
      if (timeSpent > 30) { // Took longer than 30 seconds
        easeFactor -= 0.05;
      }
      
    } else {
      // Failed recall - reset
      newRepetitions = 0;
      newInterval = this.params.intervals[0];
      
      // Penalty for failure
      const penalty = quality === 0 ? this.params.againPenalty : this.params.hardPenalty;
      easeFactor = Math.max(this.params.minEase, easeFactor - penalty);
    }
    
    // Final clamping
    easeFactor = Math.round(Math.max(this.params.minEase, easeFactor) * 100) / 100;
    newInterval = Math.max(1, Math.min(365, newInterval)); // Cap at 1 year
    
    // Calculate next review date
    const nextReview = this.calculateNextReview(newInterval, quality);
    
    return {
      easeFactor,
      interval: newInterval,
      repetitions: newRepetitions,
      nextReview,
      quality,
      isDue: false
    };
  }

  /**
   * Cram Mode Algorithm
   */
  calculateCramMode(card, quality) {
    let { easeFactor, repetitions } = card;
    let interval;
    
    switch (quality) {
      case 0: // Again
        interval = this.params.cramIntervals.AGAIN;
        repetitions = 0;
        easeFactor -= this.params.againPenalty;
        break;
        
      case 1: // Hard
        interval = this.params.cramIntervals.HARD;
        repetitions = 0;
        easeFactor -= this.params.hardPenalty * 0.5;
        break;
        
      case 3: // Good
        interval = repetitions === 0 
          ? this.params.cramIntervals.GOOD 
          : Math.min(60, this.params.cramIntervals.GOOD * (repetitions + 1));
        repetitions += 1;
        break;
        
      case 5: // Easy
        interval = repetitions === 0 
          ? this.params.cramIntervals.EASY 
          : Math.min(120, this.params.cramIntervals.EASY * (repetitions + 1));
        repetitions += 1;
        easeFactor += this.params.easyBonus;
        break;
        
      default:
        interval = 1;
    }
    
    // Clamp values
    easeFactor = Math.round(Math.max(this.params.minEase, easeFactor) * 100) / 100;
    interval = Math.max(1, Math.min(1440, interval)); // Max 24 hours in cram mode
    
    // Next review in minutes
    const nextReview = new Date(Date.now() + interval * 60 * 1000);
    
    return {
      easeFactor,
      interval,
      repetitions,
      nextReview,
      quality,
      isCramMode: true
    };
  }

  /**
   * Calculate next review date
   */
  calculateNextReview(interval, quality) {
    const now = new Date();
    const reviewDate = new Date(now);
    
    // Add interval days
    reviewDate.setDate(reviewDate.getDate() + interval);
    
    // Set review time between 8 AM and 10 AM
    const reviewHour = 8 + Math.floor(Math.random() * 2);
    reviewDate.setHours(reviewHour, 0, 0, 0);
    
    return reviewDate;
  }

  /**
   * Check if a card is due for review
   */
  isDue(nextReview) {
    if (!nextReview) return true;
    return new Date(nextReview) <= new Date();
  }

  /**
   * Get initial ease factor based on difficulty
   */
  getInitialEase(difficulty = 'MEDIUM') {
    const easeFactors = {
      EASY: 2.8,
      MEDIUM: 2.5,
      HARD: 2.2,
    };
    return easeFactors[difficulty] || this.params.defaultEase;
  }

  /**
   * Estimate next review date for preview
   */
  estimateNextReview(currentInterval, easeFactor, repetitions) {
    const estimatedInterval = repetitions === 0 
      ? 1 
      : Math.round(currentInterval * easeFactor);
    
    return this.calculateNextReview(estimatedInterval, 3);
  }

  /**
   * Get review schedule statistics
   */
  getScheduleStats(cards) {
    const now = new Date();
    const stats = {
      total: cards.length,
      due: 0,
      new: 0,
      learning: 0,
      mastered: 0,
      average: {
        ease: 0,
        interval: 0,
        repetitions: 0,
      }
    };

    let totalEase = 0;
    let totalInterval = 0;
    let totalRepetitions = 0;

    cards.forEach(card => {
      if (this.isDue(card.nextReview)) {
        if (card.repetitions === 0) {
          stats.new++;
        } else {
          stats.due++;
        }
      } else if (card.repetitions === 0) {
        stats.new++;
      } else if (card.interval >= 21) {
        stats.mastered++;
      } else {
        stats.learning++;
      }

      totalEase += card.easeFactor || this.params.defaultEase;
      totalInterval += card.interval || 0;
      totalRepetitions += card.repetitions || 0;
    });

    if (cards.length > 0) {
      stats.average.ease = Math.round((totalEase / cards.length) * 100) / 100;
      stats.average.interval = Math.round(totalInterval / cards.length);
      stats.average.repetitions = Math.round(totalRepetitions / cards.length);
    }

    return stats;
  }

  /**
   * Optimize study order
   */
  optimizeOrder(cards, timeAvailable = 30) {
    const now = new Date();
    const avgTimePerCard = 0.5; // minutes
    
    // Score each card for priority
    const scored = cards.map(card => {
      let score = 0;
      
      // Due cards get highest priority
      if (this.isDue(card.nextReview)) score += 100;
      
      // Cards with lower ease factor need more review
      score += (this.params.maxEase - (card.easeFactor || this.params.defaultEase)) * 10;
      
      // New cards should be reviewed soon
      if (card.repetitions === 0) score += 50;
      
      // Overdue cards get extra priority
      if (card.nextReview) {
        const hoursOverdue = (now - new Date(card.nextReview)) / (1000 * 60 * 60);
        if (hoursOverdue > 0) score += Math.min(hoursOverdue, 48) * 2;
      }
      
      return { card, score };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    // Calculate how many cards can be reviewed
    const maxCards = Math.floor(timeAvailable / avgTimePerCard);
    
    return {
      cards: scored.slice(0, maxCards).map(s => s.card),
      totalDue: scored.filter(s => this.isDue(s.card.nextReview)).length,
      estimatedTime: Math.ceil(maxCards * avgTimePerCard),
      hasMore: scored.length > maxCards
    };
  }
}

module.exports = new SRSService();