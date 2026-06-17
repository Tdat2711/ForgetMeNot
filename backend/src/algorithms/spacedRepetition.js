// backend/src/algorithms/spacedRepetition.js

/**
 * SuperMemo SM-2 Algorithm Implementation
 * Enhanced with Cram Mode support for ForgetMeNot
 */
class SpacedRepetitionAlgorithm {
  constructor() {
    // Default parameters
    this.defaultEase = 2.5;
    this.minEase = 1.3;
    this.maxEase = 3.5;
    this.easyBonus = 0.15;
    this.hardPenalty = 0.15;
    this.againPenalty = 0.2;
    
    // Cram mode parameters (minutes instead of days)
    this.cramIntervals = {
      AGAIN: 1,    // 1 minute
      HARD: 5,     // 5 minutes
      GOOD: 10,    // 10 minutes
      EASY: 20,    // 20 minutes
    };
    
    // Normal mode intervals (days)
    this.normalIntervals = {
      AGAIN: 0.0416,  // ~1 hour
      HARD: 1,        // 1 day
      GOOD: 1,        // 1 day (will be multiplied)
      EASY: 4,        // 4 days (will be multiplied)
    };
  }

  /**
   * Calculate next review schedule based on user's rating
   * @param {Object} card - Current flashcard state
   * @param {number} quality - User's rating (0: Again, 1: Hard, 3: Good, 5: Easy)
   * @param {boolean} isCramMode - Whether cram mode is active
   * @returns {Object} New card state
   */
  calculate(card, quality, isCramMode = false) {
    if (isCramMode) {
      return this.calculateCramMode(card, quality);
    }
    return this.calculateNormalMode(card, quality);
  }

  /**
   * Normal mode calculation (SM-2 algorithm)
   * Based on SuperMemo's proven algorithm
   */
  calculateNormalMode(card, quality) {
    let { easeFactor, interval, repetitions } = card;
    
    // Clamp ease factor to valid range
    easeFactor = Math.max(this.minEase, Math.min(this.maxEase, easeFactor));
    
    let nextInterval;
    
    if (quality >= 3) {
      // Successful recall
      switch (repetitions) {
        case 0:
          nextInterval = 1; // 1 day
          break;
        case 1:
          nextInterval = 3; // 3 days
          break;
        case 2:
          nextInterval = 7; // 7 days
          break;
        default:
          nextInterval = Math.round(interval * easeFactor);
      }
      
      // Increment repetitions on success
      repetitions += 1;
      
      // Adjust ease factor
      easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      
      // Additional bonus for 'Easy'
      if (quality === 5) {
        easeFactor += this.easyBonus;
        nextInterval = Math.round(nextInterval * 1.3); // 30% longer interval for easy
      }
      
    } else {
      // Failed recall - reset
      repetitions = 0;
      nextInterval = 1; // Review again tomorrow
      
      // Penalize ease factor
      const penalty = quality === 0 ? this.againPenalty : this.hardPenalty;
      easeFactor = Math.max(this.minEase, easeFactor - penalty);
    }
    
    // Ensure ease factor stays in bounds
    easeFactor = Math.max(this.minEase, Math.min(this.maxEase, easeFactor));
    easeFactor = Math.round(easeFactor * 100) / 100; // Round to 2 decimals
    
    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + nextInterval);
    nextReview.setHours(Math.floor(Math.random() * 4) + 8, 0, 0, 0); // Between 8 AM - 12 PM
    
    return {
      easeFactor,
      interval: nextInterval,
      repetitions,
      nextReview,
      quality,
    };
  }

  /**
   * Cram mode calculation
   * Optimized for rapid review before exams
   */
  calculateCramMode(card, quality) {
    let { easeFactor } = card;
    let interval;
    let repetitions = card.repetitions;
    
    // Cram mode uses minute-based intervals
    switch (quality) {
      case 0: // Again - show very soon
        interval = this.cramIntervals.AGAIN;
        repetitions = 0;
        easeFactor = Math.max(this.minEase, easeFactor - this.againPenalty);
        break;
        
      case 1: // Hard - show soon
        interval = this.cramIntervals.HARD;
        repetitions = 0;
        easeFactor = Math.max(this.minEase, easeFactor - this.hardPenalty * 0.5);
        break;
        
      case 3: // Good - moderate delay
        if (repetitions === 0) {
          interval = this.cramIntervals.GOOD;
        } else {
          interval = Math.min(60, this.cramIntervals.GOOD * (repetitions + 1));
        }
        repetitions += 1;
        break;
        
      case 5: // Easy - longer delay
        if (repetitions === 0) {
          interval = this.cramIntervals.EASY;
        } else {
          interval = Math.min(120, this.cramIntervals.EASY * (repetitions + 1));
        }
        repetitions += 1;
        easeFactor += this.easyBonus;
        break;
        
      default:
        interval = 1;
    }
    
    // Clamp values
    easeFactor = Math.max(this.minEase, Math.min(this.maxEase, easeFactor));
    easeFactor = Math.round(easeFactor * 100) / 100;
    interval = Math.max(1, Math.min(1440, interval)); // Max 24 hours in cram mode
    
    // Calculate next review time (in minutes from now)
    const nextReview = new Date(Date.now() + interval * 60 * 1000);
    
    return {
      easeFactor,
      interval,
      repetitions,
      nextReview,
      quality,
    };
  }

  /**
   * Calculate initial ease factor for new cards
   */
  calculateInitialEase(difficulty) {
    switch (difficulty) {
      case 'EASY':
        return 2.8;
      case 'HARD':
        return 2.2;
      case 'MEDIUM':
      default:
        return this.defaultEase;
    }
  }

  /**
   * Determine if card is due for review
   */
  isDue(nextReview) {
    return new Date(nextReview) <= new Date();
  }

  /**
   * Get review statistics
   */
  getReviewStats(reviews) {
    if (!reviews || reviews.length === 0) {
      return {
        total: 0,
        averageQuality: 0,
        retentionRate: 0,
        easiestTime: null,
        hardestTime: null,
      };
    }

    const total = reviews.length;
    const qualitySum = reviews.reduce((sum, r) => sum + r.quality, 0);
    const averageQuality = qualitySum / total;
    const remembered = reviews.filter(r => r.quality >= 3).length;
    const retentionRate = (remembered / total) * 100;

    return {
      total,
      averageQuality: Math.round(averageQuality * 10) / 10,
      retentionRate: Math.round(retentionRate * 10) / 10,
      easiestTime: 'Morning', // Can be enhanced with actual time analysis
      hardestTime: 'Night',
    };
  }

  /**
   * Optimize review schedule for a deck
   */
  optimizeSchedule(cards, availableMinutes) {
    // Sort by priority: due cards first, then by ease factor (harder first)
    const sorted = [...cards].sort((a, b) => {
      const aDue = this.isDue(a.nextReview);
      const bDue = this.isDue(b.nextReview);
      
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      
      return a.easeFactor - b.easeFactor; // Lower ease = harder = review first
    });

    // Estimate cards that can be reviewed
    const avgTimePerCard = 0.5; // 30 seconds average
    const maxCards = Math.floor(availableMinutes / avgTimePerCard);

    return {
      cards: sorted.slice(0, maxCards),
      totalDue: sorted.filter(c => this.isDue(c.nextReview)).length,
      estimatedTime: Math.ceil(maxCards * avgTimePerCard),
      optimized: sorted.length > maxCards,
    };
  }
}

// Export singleton instance
module.exports = new SpacedRepetitionAlgorithm();