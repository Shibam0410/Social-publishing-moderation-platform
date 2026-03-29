// services/riskScoringService.js
// ─────────────────────────────────────────────────────────────
// Calculates a "risk score" (0–100) for a piece of content.
// A higher score means the content is more likely to be harmful
// or require moderation review.
//
// This is an intentionally simple, rule-based implementation.
// In a production system you would replace or augment this with
// a machine-learning model or a third-party moderation API.
// ─────────────────────────────────────────────────────────────

// Keywords that raise the risk score when found in content.
// Each entry has the word and how many points to add.
const RISK_KEYWORDS = [
  { word: 'spam',        points: 20 },
  { word: 'buy now',     points: 15 },
  { word: 'click here',  points: 15 },
  { word: 'hate',        points: 30 },
  { word: 'violence',    points: 35 },
  { word: 'scam',        points: 25 },
  { word: 'fake',        points: 10 },
  { word: 'free money',  points: 20 },
  { word: 'adult',       points: 15 },
  { word: 'explicit',    points: 25 },
];

/**
 * Calculate risk score for a post.
 *
 * @param {string} content - The post body/content
 * @returns {number} Risk score between 0.0 and 1.0 (AI toxicity simulation)
 */
function calculateRiskScore(content) {
  // Combine and lowercase so matching isn't case-sensitive
  const text = (content || '').toLowerCase();

  let score = 0;

  for (const { word, points } of RISK_KEYWORDS) {
    if (text.includes(word)) {
      score += points;
    }
  }

  // If content is very short, give a small bump (suspicious)
  if (text.trim().length < 20) {
    score += 10;
  }

  // Cap the score at 100, then divide by 100 to simulate 0.0 - 1.0 AI score
  return Math.min(score, 100) / 100;
}

/**
 * Returns a human-readable label for a given score.
 *
 * @param {number} score
 * @returns {string}  'low' | 'medium' | 'high'
 */
function getRiskLabel(score) {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  return 'high';
}

module.exports = { calculateRiskScore, getRiskLabel };
