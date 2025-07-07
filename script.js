const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCount = canvas.width / gridSize;
let snake = [{ x: 10, y: 10 }];
let food = { x: 15, y: 15 };
let obstacles = [];
let dx = 0;
let dy = 0;
let score = 0;
let level = 1;
let gameSpeed = 150; // Starting speed at Level 1 (ms)
let gameLoop;
let isGameRunning = false;
let isPaused = false;
let highestLevel = parseInt(localStorage.getItem('highestLevel')) || 1;
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false'; // Default to true

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
function playSound() {
    if (soundEnabled) {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    }
}

const startButton = document.getElementById('startButton');
const pausePlayButton = document.getElementById('pausePlayButton');
const menuButton = document.getElementById('menuButton');
const restartButton = document.getElementById('restartButton');
const replayButton = document.getElementById('replayButton');
const nextLevelButton = document.getElementById('nextLevelButton');
const settingsButton = document.getElementById('settingsButton');
const levelSelectButton = document.getElementById('levelSelectButton');
const resetProgressButton = document.getElementById('resetProgressButton');
const closeMenuButton = document.getElementById('closeMenuButton');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const soundToggle = document.getElementById('soundToggle');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const levelModal = document.getElementById('levelModal');
const levelList = document.getElementById('levelList');
const levelCompleteModal = document.getElementById('levelCompleteModal');
const levelCompleteMessage = document.getElementById('levelCompleteMessage');
const menuModal = document.getElementById('menuModal');
const settingsModal = document.getElementById('settingsModal');
const modalOverlay = document.getElementById('modalOverlay');

// Initialize sound toggle
soundToggle.checked = soundEnabled;

// Speed settings for each level (decreases by 2ms per level)
const levelSpeeds = {};
for (let i = 1; i <= 10; i++) {
    levelSpeeds[i] = 150 - (i - 1) * 2; // 150ms at Level 1, 148ms at Level 2, ..., 132ms at Level 10
}

// Score thresholds for each level (10 points per level)
const levelThresholds = {};
for (let i = 1; i <= 10; i++) {
    levelThresholds[i] = i * 10; // Level 1: 10, Level 2: 20, ..., Level 10: 100
}

// Generate obstacles for a given level
function generateObstacles(level) {
    obstacles = [];
    if (level === 1) return; // No obstacles on Level 1
    const numObstacles = level; // Number of obstacles equals level number
    const initialSnake = [{ x: 10, y: 10 }]; // Initial snake position
    const initialFood = { x: 15, y: 15 }; // Initial food position

    for (let i = 0; i < numObstacles; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * tileCount);
            y = Math.floor(Math.random() * tileCount);
        } while (
            (x === initialSnake[0].x && y === initialSnake[0].y) ||
            (x === initialFood.x && y === initialFood.y) ||
            obstacles.some(obstacle => obstacle.x === x && obstacle.y === y)
        );
        obstacles.push({ x, y });
    }
}

// Populate level selection elicited
function populateLevelModal() {
    levelList.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const button = document.createElement('button');
        button.textContent = `Level ${i}`;
        if (i <= highestLevel) {
            button.onclick = () => {
                startGame(i);
            };
        } else {
            button.classList.add('locked');
            button.disabled = true;
        }
        levelList.appendChild(button);
    }
}

// Show level selection modal on page load
window.onload = () => {
    populateLevelModal();
    levelModal.classList.add('show');
    modalOverlay.classList.add('show');
};

function startGame(selectedLevel) {
    levelModal.classList.remove('show');
    levelCompleteModal.classList.remove('show');
    menuModal.classList.remove('show');
    settingsModal.classList.remove('show');
    modalOverlay.classList.remove('show');
    
    if (!isGameRunning) {
        isGameRunning = true;
        isPaused = false;
        startButton.style.display = 'none';
        pausePlayButton.style.display = 'block';
        menuButton.style.display = 'block';
        pausePlayButton.textContent = 'Pause';
        resetGame(selectedLevel);
        clearInterval(gameLoop);
        gameLoop = setInterval(game, gameSpeed);
    }
}

function resetGame(selectedLevel) {
    snake = [{ x: 10, y: 10 }];
    food = { x: 15, y: 15 };
    dx = 0;
    dy = 0;
    score = 0;
    level = selectedLevel;
    gameSpeed = levelSpeeds[level];
    generateObstacles(level);
    scoreDisplay.textContent = `Score: ${score}`;
    levelDisplay.textContent = `Level: ${level}`;
    restartButton.style.display = 'none';
    pausePlayButton.style.display = 'block';
    menuButton.style.display = 'block';
    pausePlayButton.textContent = 'Pause';
    clearInterval(gameLoop);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGame();
}

function togglePausePlay() {
    if (isGameRunning) {
        if (isPaused) {
            isPaused = false;
            pausePlayButton.textContent = 'Pause';
            gameLoop = setInterval(game, gameSpeed);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawGame();
        } else {
            isPaused = true;
            pausePlayButton.textContent = 'Play';
            clearInterval(gameLoop);
            ctx.fillStyle = 'black';
            ctx.font = '30px Arial';
            ctx.fillText('Paused', canvas.width / 2 - 50, canvas.height / 2);
        }
    }
}

function showMenu() {
    if (isGameRunning && !isPaused) {
        togglePausePlay();
    }
    menuModal.classList.add('show');
    modalOverlay.classList.add('show');
}

function game() {
    if (!isPaused) {
        updateSnake();
        if (checkCollision()) {
            endGame();
            return;
        }
        checkFood();
        if (checkLevelUp()) {
            return;
        }
        drawGame();
    }
}

function updateSnake() {
    let head = { x: snake[0].x + dx, y: snake[0].y + dy };
    if (head.x < 0) head.x = tileCount - 1;
    if (head.x >= tileCount) head.x = 0;
    if (head.y < 0) head.y = tileCount - 1;
    if (head.y >= tileCount) head.y = 0;
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score += 1;
        scoreDisplay.textContent = `Score: ${score}`;
        playSound();
        generateFood();
    } else {
        snake.pop();
    }
}

function checkCollision() {
    const head = snake[0];
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    for (let obstacle of obstacles) {
        if (head.x === obstacle.x && head.y === obstacle.y) {
            return true;
        }
    }
    return false;
}

function generateFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    for (let segment of snake) {
        if (food.x === segment.x && food.y === segment.y) {
            generateFood();
            return;
        }
    }
    for (let obstacle of obstacles) {
        if (food.x === obstacle.x && food.y === obstacle.y) {
            generateFood();
            return;
        }
    }
}

function checkFood() {
    if (snake[0].x === food.x && snake[0].y === food.y) {
        generateFood();
    }
}

function checkLevelUp() {
    if (score >= levelThresholds[level]) {
        isGameRunning = false;
        isPaused = false;
        clearInterval(gameLoop);
        pausePlayButton.style.display = 'none';
        menuButton.style.display = 'none';
        ctx.fillStyle = 'black';
        ctx.font = '30px Arial';
        ctx.fillText('Level Complete!', canvas.width / 2 - 80, canvas.height / 2);
        if (level + 1 > highestLevel) {
            highestLevel = level + 1;
            localStorage.setItem('highestLevel', highestLevel);
        }
        levelCompleteMessage.textContent = `You completed Level ${level}!`;
        nextLevelButton.style.display = level < 10 ? 'inline-block' : 'none';
        levelCompleteModal.classList.add('show');
        modalOverlay.classList.add('show');
        return true;
    }
    return false;
}

function drawGame() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'gray';
    obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x * gridSize, obstacle.y * gridSize, gridSize - 2, gridSize - 2);
    });
    ctx.fillStyle = 'green';
    snake.forEach(segment => {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

function endGame() {
    isGameRunning = false;
    isPaused = false;
    clearInterval(gameLoop);
    restartButton.style.display = 'block';
    pausePlayButton.style.display = 'none';
    menuButton.style.display = 'none';
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    ctx.fillText('Game Over', canvas.width / 2 - 80, canvas.height / 2);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && dy !== 1) {
        dx = 0;
        dy = -1;
    } else if (e.key === 'ArrowDown' && dy !== -1) {
        dx = 0;
        dy = 1;
    } else if (e.key === 'ArrowLeft' && dx !== 1) {
        dx = -1;
        dy = 0;
    } else if (e.key === 'ArrowRight' && dx !== -1) {
        dx = 1;
        dy = 0;
    } else if (e.key === ' ' && isGameRunning) {
        e.preventDefault();
        togglePausePlay();
    } else if (e.key === 'Escape' && isGameRunning) {
        e.preventDefault();
        showMenu();
    }
});

pausePlayButton.addEventListener('click', togglePausePlay);
menuButton.addEventListener('click', showMenu);
settingsButton.addEventListener('click', () => {
    menuModal.classList.remove('show');
    settingsModal.classList.add('show');
});
levelSelectButton.addEventListener('click', () => {
    populateLevelModal();
    menuModal.classList.remove('show');
    levelModal.classList.add('show');
    modalOverlay.classList.add('show');
});
resetProgressButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all progress? This will lock all levels except Level 1.')) {
        highestLevel = 1;
        localStorage.setItem('highestLevel', highestLevel);
        populateLevelModal();
        menuModal.classList.remove('show');
        levelModal.classList.add('show');
        modalOverlay.classList.add('show');
    }
});
closeMenuButton.addEventListener('click', () => {
    menuModal.classList.remove('show');
    modalOverlay.classList.remove('show');
    if (isGameRunning && !isPaused) {
        togglePausePlay();
    }
});
closeSettingsButton.addEventListener('click', () => {
    settingsModal.classList.remove('show');
    menuModal.classList.add('show');
});
soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    localStorage.setItem('soundEnabled', soundEnabled);
});
replayButton.addEventListener('click', () => {
    startGame(level);
});
nextLevelButton.addEventListener('click', () => {
    if (level < 10) {
        startGame(level + 1);
    }
});
restartButton.addEventListener('click', () => {
    populateLevelModal();
    levelModal.classList.add('show');
    modalOverlay.classList.add('show');
    isGameRunning = false;
    isPaused = false;
    clearInterval(gameLoop);
    restartButton.style.display = 'none';
    pausePlayButton.style.display = 'none';
    menuButton.style.display = 'none';
});

// Draw initial state
drawGame();