/**
 * Quiz class
 * Handles quiz configuration, API loading, game state and high scores.
 */
export default class Quiz {
  constructor(category, difficulty, numberOfQuestions, playerName) {
    this.category = category;
    this.difficulty = difficulty;
    this.numberOfQuestions = Number(numberOfQuestions);
    this.playerName = playerName || 'Player';

    this.score = 0;
    this.questions = [];
    this.currentQuestionIndex = 0;
  }

  async getQuestions() {
    const response = await fetch(this.buildApiUrl());

    if (!response.ok) {
      throw new Error('Failed to connect to the trivia service. Please try again.');
    }

    const data = await response.json();

    if (data.response_code !== 0) {
      const messages = {
        1: 'Not enough questions match these options. Try fewer questions or another category.',
        2: 'One of the quiz options is invalid. Please change your selections and try again.',
        3: 'The trivia session could not be found. Please try again.',
        4: 'No more questions are available for this session. Please try again.',
        5: 'Too many requests were sent to the trivia service. Please wait a moment and try again.',
      };

      throw new Error(messages[data.response_code] || 'Could not load questions. Please try again.');
    }

    this.questions = Array.isArray(data.results) ? data.results : [];

    if (!this.questions.length) {
      throw new Error('No questions were returned. Please try different options.');
    }

    // Keep calculations accurate if the API ever returns fewer questions.
    this.numberOfQuestions = this.questions.length;
    return this.questions;
  }

  buildApiUrl() {
    const params = new URLSearchParams({
      amount: String(this.numberOfQuestions),
    });

    if (this.category) params.set('category', this.category);
    if (this.difficulty) params.set('difficulty', this.difficulty);

    // Do not force a type so the API may return both MCQ and True/False questions.
    return `https://opentdb.com/api.php?${params.toString()}`;
  }

  incrementScore() {
    this.score += 1;
  }

  getCurrentQuestion() {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  nextQuestion() {
    this.currentQuestionIndex += 1;
    return !this.isComplete();
  }

  isComplete() {
    return this.currentQuestionIndex >= this.questions.length;
  }

  getScorePercentage() {
    if (!this.numberOfQuestions) return 0;
    return Math.round((this.score / this.numberOfQuestions) * 100);
  }

  saveHighScore() {
    const highScores = this.getHighScores();
    const newScore = {
      name: this.playerName,
      score: this.score,
      total: this.numberOfQuestions,
      percentage: this.getScorePercentage(),
      difficulty: this.difficulty,
      date: new Date().toISOString(),
    };

    highScores.push(newScore);
    highScores.sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.date) - new Date(a.date);
    });

    localStorage.setItem('quizHighScores', JSON.stringify(highScores.slice(0, 10)));
  }

  getHighScores() {
    try {
      const saved = localStorage.getItem('quizHighScores');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Could not read high scores:', error);
      return [];
    }
  }

  isHighScore() {
    const highScores = this.getHighScores();
    if (highScores.length < 10) return true;

    const currentPercentage = this.getScorePercentage();
    const lowestPercentage = Math.min(...highScores.map((item) => Number(item.percentage) || 0));
    return currentPercentage > lowestPercentage;
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  endQuiz() {
    const percentage = this.getScorePercentage();
    const newHighScore = this.isHighScore();

    if (newHighScore) {
      this.saveHighScore();
    }

    const highScores = this.getHighScores();
    const medals = ['gold', 'silver', 'bronze'];

    const leaderboardHtml = highScores.length
      ? highScores
          .map((item, index) => {
            const medalClass = medals[index] || '';
            return `
              <li class="leaderboard-item ${medalClass}">
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-name">${this.escapeHtml(item.name || 'Player')}</span>
                <span class="leaderboard-score">${Number(item.percentage) || 0}%</span>
              </li>
            `;
          })
          .join('')
      : `
          <li class="leaderboard-item">
            <span class="leaderboard-name">No scores yet</span>
          </li>
        `;

    let trophy = '🏆';
    if (percentage < 50) trophy = '🎯';
    else if (percentage < 80) trophy = '⭐';

    return `
      <div class="game-card results-card">
        <div class="results-trophy" aria-hidden="true">${trophy}</div>
        <h2 class="results-title">Quiz Complete!</h2>
        <p class="results-score-display">${this.score}/${this.numberOfQuestions}</p>
        <p class="results-percentage">${percentage}% Accuracy</p>

        ${
          newHighScore
            ? `<div class="new-record-badge"><i class="fa-solid fa-star"></i> New High Score!</div>`
            : ''
        }

        <div class="leaderboard">
          <h4 class="leaderboard-title">
            <i class="fa-solid fa-trophy"></i> Leaderboard
          </h4>
          <ul class="leaderboard-list">
            ${leaderboardHtml}
          </ul>
        </div>

        <div class="action-buttons">
          <button class="btn-restart" type="button">
            <i class="fa-solid fa-rotate-right"></i> Play Again
          </button>
        </div>
      </div>
    `;
  }
}
