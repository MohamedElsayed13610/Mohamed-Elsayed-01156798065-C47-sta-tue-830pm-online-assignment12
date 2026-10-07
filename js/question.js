/**
 * Question class
 * Displays one question, handles answers, keyboard input, timer and transitions.
 */
export default class Question {
  constructor(quiz, container, onQuizEnd) {
    this.quiz = quiz;
    this.container = container;
    this.onQuizEnd = onQuizEnd;

    this.questionData = quiz.getCurrentQuestion();
    this.index = quiz.currentQuestionIndex;

    this.question = this.decodeHtml(this.questionData.question);
    this.correctAnswer = this.decodeHtml(this.questionData.correct_answer);
    this.category = this.decodeHtml(this.questionData.category);
    this.wrongAnswers = this.questionData.incorrect_answers.map((answer) => this.decodeHtml(answer));
    this.allAnswers = this.shuffleAnswers();

    this.answered = false;
    this.timerInterval = null;
    this.timeRemaining = 15;

    this.handleKeyboard = this.handleKeyboard.bind(this);
  }

  decodeHtml(html) {
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    return doc.documentElement.textContent || '';
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  shuffleAnswers() {
    const answers = [...this.wrongAnswers, this.correctAnswer];

    for (let i = answers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    return answers;
  }

  getProgress() {
    return Math.round(((this.index + 1) / this.quiz.numberOfQuestions) * 100);
  }

  getDifficultyIcon() {
    const icons = {
      easy: 'fa-face-smile',
      medium: 'fa-face-meh',
      hard: 'fa-skull',
    };

    return icons[this.quiz.difficulty] || 'fa-gauge-high';
  }

  displayQuestion() {
    const answersHtml = this.allAnswers
      .map(
        (answer, answerIndex) => `
          <button class="answer-btn" type="button" data-answer="${this.escapeHtml(answer)}">
            <span class="answer-key">${answerIndex + 1}</span>
            <span class="answer-text">${this.escapeHtml(answer)}</span>
          </button>
        `,
      )
      .join('');

    this.container.innerHTML = `
      <div class="game-card question-card">
        <div class="xp-bar-container">
          <div class="xp-bar-header">
            <span class="xp-label"><i class="fa-solid fa-bolt"></i> Progress</span>
            <span class="xp-value">Question ${this.index + 1}/${this.quiz.numberOfQuestions}</span>
          </div>
          <div class="xp-bar">
            <div class="xp-bar-fill" style="width: ${this.getProgress()}%"></div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-badge category">
            <i class="fa-solid fa-bookmark"></i>
            <span>${this.escapeHtml(this.category)}</span>
          </div>
          <div class="stat-badge difficulty ${this.escapeHtml(this.quiz.difficulty)}">
            <i class="fa-solid ${this.getDifficultyIcon()}"></i>
            <span>${this.escapeHtml(this.quiz.difficulty)}</span>
          </div>
          <div class="stat-badge timer">
            <i class="fa-solid fa-stopwatch"></i>
            <span class="timer-value">${this.timeRemaining}</span>s
          </div>
          <div class="stat-badge counter">
            <i class="fa-solid fa-gamepad"></i>
            <span>${this.index + 1}/${this.quiz.numberOfQuestions}</span>
          </div>
        </div>

        <h2 class="question-text">${this.escapeHtml(this.question)}</h2>

        <div class="answers-grid">
          ${answersHtml}
        </div>

        <p class="keyboard-hint">
          <i class="fa-regular fa-keyboard"></i> Press 1-${this.allAnswers.length} to select
        </p>

        <div class="score-panel">
          <div class="score-item">
            <div class="score-item-label">Score</div>
            <div class="score-item-value">${this.quiz.score}</div>
          </div>
        </div>
      </div>
    `;

    this.addEventListeners();
    this.startTimer();
  }

  addEventListeners() {
    this.answerButtons = [...this.container.querySelectorAll('.answer-btn')];

    this.answerButtons.forEach((button) => {
      button.addEventListener('click', () => this.checkAnswer(button));
    });

    document.addEventListener('keydown', this.handleKeyboard);
  }

  handleKeyboard(event) {
    if (this.answered) return;

    const selectedIndex = Number(event.key) - 1;
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= this.answerButtons.length) {
      return;
    }

    event.preventDefault();
    this.checkAnswer(this.answerButtons[selectedIndex]);
  }

  removeEventListeners() {
    document.removeEventListener('keydown', this.handleKeyboard);
  }

  startTimer() {
    const timerValue = this.container.querySelector('.timer-value');
    const timerBadge = this.container.querySelector('.stat-badge.timer');

    this.timerInterval = window.setInterval(() => {
      this.timeRemaining -= 1;

      if (timerValue) timerValue.textContent = String(Math.max(this.timeRemaining, 0));
      if (this.timeRemaining <= 5 && timerBadge) timerBadge.classList.add('warning');

      if (this.timeRemaining <= 0) {
        this.stopTimer();
        this.handleTimeUp();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeUp() {
    if (this.answered) return;

    this.answered = true;
    this.removeEventListeners();
    this.highlightCorrectAnswer();
    this.disableAnswers();
    this.playFeedbackSound('wrong');

    const answersGrid = this.container.querySelector('.answers-grid');
    answersGrid?.insertAdjacentHTML(
      'afterend',
      `<div class="time-up-message"><i class="fa-solid fa-clock"></i> TIME'S UP!</div>`,
    );

    this.animateQuestion();
  }

  checkAnswer(choiceElement) {
    if (this.answered || !choiceElement) return;

    this.answered = true;
    this.stopTimer();
    this.removeEventListeners();

    const selectedAnswer = choiceElement.dataset.answer || '';
    const isCorrect = selectedAnswer === this.correctAnswer;

    if (isCorrect) {
      choiceElement.classList.add('correct');
      this.quiz.incrementScore();
      this.playFeedbackSound('correct');

      const scoreValue = this.container.querySelector('.score-item-value');
      if (scoreValue) scoreValue.textContent = String(this.quiz.score);
    } else {
      choiceElement.classList.add('wrong');
      this.highlightCorrectAnswer();
      this.playFeedbackSound('wrong');
    }

    this.disableAnswers(choiceElement);
    this.animateQuestion();
  }

  disableAnswers(selectedButton = null) {
    this.answerButtons.forEach((button) => {
      button.disabled = true;
      if (button !== selectedButton && !button.classList.contains('correct-reveal')) {
        button.classList.add('disabled');
      }
    });
  }

  highlightCorrectAnswer() {
    const correctButton = this.answerButtons.find(
      (button) => (button.dataset.answer || '') === this.correctAnswer,
    );

    if (correctButton) correctButton.classList.add('correct-reveal');
  }

  getNextQuestion() {
    if (this.quiz.nextQuestion()) {
      const nextQuestion = new Question(this.quiz, this.container, this.onQuizEnd);
      nextQuestion.displayQuestion();
      return;
    }

    this.container.innerHTML = this.quiz.endQuiz();
    const restartButton = this.container.querySelector('.btn-restart');
    restartButton?.addEventListener('click', this.onQuizEnd, { once: true });
  }

  animateQuestion(duration = 400) {
    window.setTimeout(() => {
      const card = this.container.querySelector('.question-card');
      card?.classList.add('exit');

      window.setTimeout(() => this.getNextQuestion(), duration);
    }, 1100);
  }

  playFeedbackSound(type) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.connect(gain);
      gain.connect(context.destination);

      if (type === 'correct') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(990, context.currentTime + 0.16);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(130, context.currentTime + 0.2);
      }

      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.25);
      oscillator.addEventListener('ended', () => context.close());
    } catch (error) {
      // Sound is a bonus enhancement; the quiz should still work if audio is blocked.
      console.warn('Sound effect unavailable:', error);
    }
  }
}
