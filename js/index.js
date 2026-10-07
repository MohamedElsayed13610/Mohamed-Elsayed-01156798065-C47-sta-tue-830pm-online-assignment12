import Quiz from './quiz.js';
import Question from './question.js';

const quizOptionsForm = document.getElementById('quizOptions');
const playerNameInput = document.getElementById('playerName');
const categoryInput = document.getElementById('categoryMenu');
const difficultyOptions = document.getElementById('difficultyOptions');
const questionsNumber = document.getElementById('questionsNumber');
const startQuizBtn = document.getElementById('startQuiz');
const questionsContainer = document.querySelector('.questions-container');

let currentQuiz = null;

function showLoading() {
  questionsContainer.innerHTML = `
    <div class="loading-overlay" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p class="loading-text">Loading Questions...</p>
    </div>
  `;
}

function hideLoading() {
  questionsContainer.querySelector('.loading-overlay')?.remove();
}

function showError(message) {
  questionsContainer.innerHTML = `
    <div class="game-card error-card">
      <div class="error-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3 class="error-title">Oops! Something went wrong</h3>
      <p class="error-message"></p>
      <button class="btn-play retry-btn" type="button">
        <i class="fa-solid fa-rotate-right"></i> Try Again
      </button>
    </div>
  `;

  questionsContainer.querySelector('.error-message').textContent = message;
  questionsContainer.querySelector('.retry-btn')?.addEventListener('click', resetToStart, { once: true });
}

function validateForm() {
  const rawValue = questionsNumber.value.trim();
  const amount = Number(rawValue);

  if (!rawValue) {
    return { isValid: false, error: 'Please enter the number of questions.' };
  }

  if (!Number.isInteger(amount)) {
    return { isValid: false, error: 'Number of questions must be a whole number.' };
  }

  if (amount < 1) {
    return { isValid: false, error: 'Please choose at least 1 question.' };
  }

  if (amount > 50) {
    return { isValid: false, error: 'You can request a maximum of 50 questions.' };
  }

  return { isValid: true, error: null };
}

function showFormError(message) {
  quizOptionsForm.querySelector('.form-error')?.remove();

  const errorElement = document.createElement('div');
  errorElement.className = 'form-error';
  errorElement.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i><span></span>';
  errorElement.querySelector('span').textContent = message;

  quizOptionsForm.insertBefore(errorElement, startQuizBtn);

  window.setTimeout(() => {
    errorElement.style.transition = 'opacity 0.25s ease';
    errorElement.style.opacity = '0';
    window.setTimeout(() => errorElement.remove(), 250);
  }, 2750);
}

function resetCustomSelect(selectId, hiddenId, defaultValue) {
  const select = document.getElementById(selectId);
  const hiddenInput = document.getElementById(hiddenId);
  if (!select || !hiddenInput) return;

  const options = [...select.querySelectorAll('.custom-select-option')];
  const defaultOption = options.find((option) => option.dataset.value === defaultValue) || options[0];
  const triggerText = select.querySelector('.custom-select-text');
  const triggerIcon = select.querySelector('.custom-select-icon');

  select.dataset.value = defaultValue;
  hiddenInput.value = defaultValue;
  options.forEach((option) => option.classList.toggle('selected', option === defaultOption));

  if (defaultOption) {
    if (triggerText) triggerText.textContent = defaultOption.textContent.trim();
    if (triggerIcon) triggerIcon.innerHTML = defaultOption.querySelector('i')?.outerHTML || '';
  }
}

function resetToStart() {
  questionsContainer.innerHTML = '';
  quizOptionsForm.reset();
  playerNameInput.value = '';
  questionsNumber.value = '10';

  resetCustomSelect('categorySelect', 'categoryMenu', '');
  resetCustomSelect('difficultySelect', 'difficultyOptions', 'easy');

  quizOptionsForm.classList.remove('hidden');
  currentQuiz = null;
  playerNameInput.focus();
}

async function startQuiz() {
  const validation = validateForm();

  if (!validation.isValid) {
    showFormError(validation.error);
    return;
  }

  const playerName = playerNameInput.value.trim() || 'Player';
  const category = categoryInput.value;
  const difficulty = difficultyOptions.value;
  const numberOfQuestions = Number(questionsNumber.value);

  currentQuiz = new Quiz(category, difficulty, numberOfQuestions, playerName);
  quizOptionsForm.classList.add('hidden');
  showLoading();

  try {
    const loadedQuestions = await currentQuiz.getQuestions();
    hideLoading();

    if (!loadedQuestions.length) {
      throw new Error('No questions were returned. Please try different options.');
    }

    const firstQuestion = new Question(currentQuiz, questionsContainer, resetToStart);
    firstQuestion.displayQuestion();
  } catch (error) {
    hideLoading();
    showError(error.message || 'Failed to load questions. Please try again.');
  }
}

startQuizBtn.addEventListener('click', startQuiz);

questionsNumber.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startQuiz();
  }
});

quizOptionsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  startQuiz();
});
