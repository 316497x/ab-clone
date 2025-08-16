window.api.onStartChallenge(() => {
    console.log("Renderer received start-challenge");
    startChallengeGame();
});

document.addEventListener('DOMContentLoaded', () => {
    const challengeBtn = document.getElementById('challenge-btn');
    const trainBtn = document.getElementById('train-btn');
    const restartBtn = document.getElementById('restart-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');

    const homePage = document.getElementById('home-page');
    const gamePage = document.getElementById('game-page');
    const gameOverPage = document.getElementById('game-over-page');

    if (challengeBtn) {
        challengeBtn.addEventListener('click', () => {
            console.log("Challenge button clicked");
            window.api.openChallenge();
        });
    }

    if (trainBtn) {
        trainBtn.addEventListener('click', () => {
            window.api.openTrain();
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            gameOverPage.style.display = 'none';
            window.api.openChallenge();
        });
    }

    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            gameOverPage.style.display = 'none';
            homePage.style.display = 'block';
        });
    }
});

function startChallengeGame() {
    const GAME_DURATION_SECONDS = 60;
    const TARGET_RADIUS = 20;
    const TARGET_LIFETIME_MS = 2500;
    const INITIAL_SPAWN_INTERVAL_MS = 667;
    const MIN_SPAWN_INTERVAL_MS = 286;
    const SPAWN_INTERVAL_DECREMENT_MS = 35;
    const DIFFICULTY_INCREASE_INTERVAL_SECONDS = 5;
    const MAX_TOTAL_CIRCLES = 130;
    const MIN_CLICKABLE_RADIUS = 5;
    const MISSED_DOT_RADIUS = 2;
    const MISSED_DOT_LIFETIME_MS = 3000;
    const MAX_SPAWN_ATTEMPTS = 50;

    const homePage = document.getElementById('home-page');
    const gamePage = document.getElementById('game-page');
    const gameOverPage = document.getElementById('game-over-page');
    const finalScoreDisplay = document.getElementById('final-score');
    const finalAccuracyDisplay = document.getElementById('final-accuracy');

    homePage.style.display = 'none';
    gamePage.style.display = 'block';

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');
    const accuracyDisplay = document.getElementById('accuracy');
    const spawnRateDisplay = document.getElementById('spawn-rate');

    let score = 0;
    let totalShots = 0;
    let hits = 0;
    let gameTime = 0;
    let gameOver = false;
    let spawnedCirclesCount = 0;
    let currentSpawnInterval = INITIAL_SPAWN_INTERVAL_MS;
    let timerInterval = null;
    let spawnTimeoutId = null;
    let animationFrameId = null;
    const targets = [];
    const missedClicks = [];

    canvas.addEventListener('contextmenu', e => e.preventDefault());

    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        drawElements();
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function handleEscape(e) {
        if (e.key === "Escape") {
            endGame(true);
        }
    }
    document.addEventListener("keydown", handleEscape);

    timerInterval = setInterval(() => {
        gameTime++;
        timerDisplay.textContent = `Time: ${gameTime}s`;

        if (gameTime % DIFFICULTY_INCREASE_INTERVAL_SECONDS === 0 && currentSpawnInterval > MIN_SPAWN_INTERVAL_MS) {
            currentSpawnInterval = Math.max(MIN_SPAWN_INTERVAL_MS, currentSpawnInterval - SPAWN_INTERVAL_DECREMENT_MS);
        }

        spawnRateDisplay.textContent = `Targets/sec: ${(1000 / currentSpawnInterval).toFixed(1)}`;

        if (gameTime >= GAME_DURATION_SECONDS) {
            endGame();
        }
    }, 1000);

    function spawnTarget() {
        if (spawnedCirclesCount >= MAX_TOTAL_CIRCLES) return;

        let newX, newY, attempts = 0, collisionDetected = true;

        while (collisionDetected && attempts < MAX_SPAWN_ATTEMPTS) {
            attempts++;
            collisionDetected = false;
            newX = Math.random() * (canvas.width - 2 * TARGET_RADIUS) + TARGET_RADIUS;
            newY = Math.random() * (canvas.height - 2 * TARGET_RADIUS) + TARGET_RADIUS;

            for (const t of targets) {
                if (Math.hypot(newX - t.x, newY - t.y) < (TARGET_RADIUS * 2)) {
                    collisionDetected = true;
                    break;
                }
            }
        }

        if (!collisionDetected) {
            targets.push({ x: newX, y: newY, maxRadius: TARGET_RADIUS, birthTime: Date.now(), lifeTime: TARGET_LIFETIME_MS });
            spawnedCirclesCount++;
        }
    }

    function spawnAndSchedule() {
        if (gameOver || spawnedCirclesCount >= MAX_TOTAL_CIRCLES) return;
        spawnTarget();
        spawnTimeoutId = setTimeout(spawnAndSchedule, currentSpawnInterval);
    }

    function drawElements() {
        const now = Date.now();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = targets.length - 1; i >= 0; i--) {
            const t = targets[i];
            const age = now - t.birthTime;
            if (age > t.lifeTime) {
                targets.splice(i, 1);
                continue;
            }

            const progress = age / t.lifeTime;
            const scale = progress < 0.5 ? (progress * 2) : (1 - (progress - 0.5) * 2);
            const currentRadius = t.maxRadius * scale;

            ctx.beginPath();
            ctx.arc(t.x, t.y, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
            t.currentRadius = currentRadius;
        }

        for (let i = missedClicks.length - 1; i >= 0; i--) {
            const dot = missedClicks[i];
            const age = now - dot.birthTime;
            if (age > MISSED_DOT_LIFETIME_MS) {
                missedClicks.splice(i, 1);
                continue;
            }

            const alpha = 1 - (age / MISSED_DOT_LIFETIME_MS);
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, MISSED_DOT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(2)})`;
            ctx.fill();
        }
    }

    canvas.addEventListener('mousedown', (event) => {
        if (gameOver) return;
        totalShots++;

        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        let hit = false;
        for (let i = targets.length - 1; i >= 0; i--) {
            const t = targets[i];
            const distance = Math.hypot(clickX - t.x, clickY - t.y);
            const clickableRadius = Math.max(t.currentRadius, MIN_CLICKABLE_RADIUS);

            if (distance <= clickableRadius) {
                targets.splice(i, 1);
                score++;
                hits++;
                hit = true;
                break;
            }
        }

        if (!hit) {
            missedClicks.push({ x: clickX, y: clickY, birthTime: Date.now() });
        }

        const accuracy = totalShots > 0 ? ((hits / totalShots) * 100).toFixed(1) : 100;
        scoreDisplay.textContent = `Score: ${score}`;
        accuracyDisplay.textContent = `Accuracy: ${accuracy}%`;
    });

    function endGame(backToMenu = false) {
        gameOver = true;
        clearInterval(timerInterval);
        clearTimeout(spawnTimeoutId);
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', resizeCanvas);

        document.removeEventListener("keydown", handleEscape);

        if (backToMenu) {
            gamePage.style.display = "none";
            homePage.style.display = "block";
            gameOverPage.style.display = "none";
            return;
        }

        gamePage.style.display = 'none';
        gameOverPage.style.display = 'block';

        finalScoreDisplay.textContent = `Score: ${score}`;
        const accuracy = totalShots > 0 ? ((hits / totalShots) * 100).toFixed(1) : 0;
        finalAccuracyDisplay.textContent = `Accuracy: ${accuracy}%`;
    }

    function gameLoop() {
        drawElements();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    spawnAndSchedule();
    gameLoop();
}