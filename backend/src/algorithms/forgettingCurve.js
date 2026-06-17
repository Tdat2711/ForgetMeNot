// backend/src/algorithms/forgettingCurve.js

/**
 * Forgetting Curve Algorithm Implementation
 * Based on Ebbinghaus Forgetting Curve and SM-2 Algorithm
 * 
 * The forgetting curve hypothesizes the decline of memory retention over time.
 * This algorithm calculates optimal review intervals based on:
 * - User's performance (quality of recall)
 * - Current memory strength (ease factor)
 * - Time since last review
 */

class ForgettingCurve {
  constructor() {
    // Default parameters based on research
    this.initialMemoryStrength = 100; // 100% after first learning
    this.decayRate = 0.5; // Memory decay rate
    this.minRetention = 0.6; // Minimum retention before review (60%)
    
    // Optimal review points (days) based on forgetting curve
    this.optimalReviewPoints = [1, 3, 7, 14, 30, 60, 120, 365];
    
    // Quality multipliers
    this.qualityMultipliers = {
      0: 0.0,   // Complete blackout - restart
      1: 0.3,   // Incorrect but remembered after seeing
      2: 0.6,   // Incorrect but seemed easy to recall
      3: 0.8,   // Correct with serious difficulty
      4: 0.9,   // Correct after hesitation
      5: 1.0,   // Perfect response
    };
  }

  /**
   * Calculate current retention based on time elapsed
   * @param {number} initialStrength - Initial memory strength (0-100)
   * @param {number} timeElapsed - Time elapsed in days
   * @param {number} decayRate - Memory decay rate
   * @returns {number} Current retention percentage
   */
  calculateRetention(initialStrength, timeElapsed, decayRate = this.decayRate) {
    // R = e^(-t/S) where S is the stability
    const stability = 1 / decayRate;
    const retention = initialStrength * Math.exp(-timeElapsed / stability);
    return Math.max(0, Math.min(100, retention));
  }

  /**
   * Calculate optimal review interval
   * @param {number} easeFactor - Current ease factor
   * @param {number} repetitions - Number of successful repetitions
   * @param {number} quality - Quality of last recall (0-5)
   * @returns {number} Optimal interval in days
   */
  calculateOptimalInterval(easeFactor, repetitions, quality) {
    const qualityMultiplier = this.qualityMultipliers[quality] || 0;
    
    if (repetitions === 0) {
      return 1; // First review after 1 day
    }
    
    if (repetitions === 1) {
      return 3 * qualityMultiplier; // Second review after ~3 days
    }
    
    // For subsequent reviews, use the optimal review points
    const baseIndex = Math.min(repetitions, this.optimalReviewPoints.length - 1);
    const baseInterval = this.optimalReviewPoints[baseIndex];
    
    // Adjust based on ease factor and quality
    const adjustedInterval = baseInterval * easeFactor * qualityMultiplier;
    
    return Math.round(Math.max(1, Math.min(365, adjustedInterval)));
  }

  /**
   * Calculate new ease factor based on performance
   * @param {number} currentEase - Current ease factor
   * @param {number} quality - Quality of recall (0-5)
   * @returns {number} New ease factor
   */
  calculateNewEase(currentEase, quality) {
    // SM-2 ease factor formula
    const newEase = currentEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Clamp between 1.3 and 3.5
    return Math.max(1.3, Math.min(3.5, Math.round(newEase * 100) / 100));
  }

  /**
   * Predict when memory will drop below threshold
   * @param {number} currentStrength - Current memory strength
   * @param {number} threshold - Minimum acceptable retention
   * @returns {number} Days until threshold is reached
   */
  predictNextReviewDate(currentStrength, threshold = this.minRetention) {
    const stability = 1 / this.decayRate;
    
    // Solve for t: threshold = currentStrength * e^(-t/stability)
    // t = -stability * ln(threshold / currentStrength)
    if (currentStrength <= threshold) {
      return 0; // Already below threshold
    }
    
    const days = -stability * Math.log(threshold / currentStrength);
    return Math.ceil(Math.max(1, Math.min(365, days)));
  }

  /**
   * Calculate memory strength after review
   * @param {number} currentStrength - Current memory strength
   * @param {number} quality - Quality of review
   * @returns {number} New memory strength
   */
  calculateNewStrength(currentStrength, quality) {
    const qualityMultiplier = this.qualityMultipliers[quality] || 0;
    
    // Boosting memory strength based on review quality
    const boost = 20 * qualityMultiplier; // Max 20% boost
    const newStrength = Math.min(100, currentStrength + boost);
    
    return Math.round(newStrength * 100) / 100;
  }

  /**
   * Get forgetting curve data for visualization
   * @param {number} initialStrength - Initial memory strength
   * @param {number} days - Number of days to simulate
   * @returns {Array} Array of {day, retention} objects
   */
  getCurveData(initialStrength = 100, days = 30) {
    const data = [];
    for (let day = 0; day <= days; day++) {
      data.push({
        day,
        retention: Math.round(this.calculateRetention(initialStrength, day) * 100) / 100
      });
    }
    return data;
  }

  /**
   * Find optimal review schedule
   * @param {number} easeFactor - Current ease factor
   * @param {number} repetitions - Number of successful repetitions
   * @returns {Array} Array of recommended review dates
   */
  getOptimalSchedule(easeFactor, repetitions) {
    const schedule = [];
    let currentEase = easeFactor;
    let currentReps = repetitions;
    
    for (let i = 0; i < 12; i++) {
      const interval = this.calculateOptimalInterval(currentEase, currentReps, 4);
      const reviewDate = new Date();
      reviewDate.setDate(reviewDate.getDate() + interval);
      
      schedule.push({
        reviewNumber: i + 1,
        daysFromNow: interval,
        reviewDate: reviewDate,
        estimatedRetention: this.calculateRetention(80, interval) // Assuming 80% after review
      });
      
      currentReps++;
      currentEase += 0.1;
    }
    
    return schedule;
  }

  /**
   * Calculate total review time saved
   * @param {number} cardsLearned - Number of cards learned
   * @param {number} averageEase - Average ease factor
   * @returns {Object} Time saved statistics
   */
  calculateTimeSaved(cardsLearned, averageEase) {
    const avgReviewTime = 30; // seconds per card
    const reviewsPerCard = Math.round(365 / (averageEase * 7)); // Estimated reviews per year
    
    const totalReviews = cardsLearned * reviewsPerCard;
    const totalMinutes = (totalReviews * avgReviewTime) / 60;
    
    return {
      totalReviews,
      totalHours: Math.round(totalMinutes / 60),
      reviewsPerCard,
      efficiency: Math.round(averageEase * 100) / 100
    };
  }
}

module.exports = new ForgettingCurve();