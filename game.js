/**
 * Neon Pac-Man - Core Game Engine
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-val');
const statusText = document.getElementById('status-text');
const uiOverlay = document.getElementById('ui-overlay');
const restartBtn = document.getElementById('restart-btn');

// Constants
const TILE_SIZE = 24;
const FPS = 60;

// Game State
let score = 0;
let lives = 3;
let gameOver = false;
let animationId;

// Map Layout
// 0: Pellet
// 1: Wall
// 2: Empty
// 3: Power Pellet
// 4: Ghost Spawn Area
// 5: Pac-Man Start
const map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 3, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 3, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 2, 1, 2, 1, 1, 1, 0, 1, 1, 1, 1],
    [2, 2, 2, 1, 0, 1, 2, 2, 2, 1, 2, 2, 2, 1, 0, 1, 2, 2, 2],
    [1, 1, 1, 1, 0, 1, 2, 1, 1, 4, 1, 1, 2, 1, 0, 1, 1, 1, 1],
    [1, 2, 2, 2, 0, 2, 2, 1, 4, 4, 4, 1, 2, 2, 0, 2, 2, 2, 1],
    [1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1],
    [2, 2, 2, 1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 1, 2, 2, 2],
    [1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 3, 0, 1, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 1, 0, 3, 1],
    [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const COLS = map[0].length;
const ROWS = map.length;

canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

class Boundary {
    constructor({ position }) {
        this.position = position;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
    }

    draw() {
        ctx.fillStyle = '#0a0a2a';
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

        // Inner Glow Effect
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.position.x + 2, this.position.y + 2, this.width - 4, this.height - 4);
    }
}

class Pellet {
    constructor({ position, isPowerPellet = false }) {
        this.position = position;
        this.radius = isPowerPellet ? 6 : 2;
        this.isPowerPellet = isPowerPellet;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isPowerPellet ? '#ff00ff' : '#ffff00';
        ctx.fill();

        if (this.isPowerPellet) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff00ff';
        }
        ctx.closePath();
        ctx.shadowBlur = 0;
    }
}

class Pacman {
    constructor({ position, velocity }) {
        this.position = position;
        this.velocity = velocity;
        this.radius = TILE_SIZE / 2 - 2;
        this.radians = 0.75;
        this.openRate = 0.12;
        this.rotation = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        ctx.translate(-this.position.x, -this.position.y);

        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, this.radians, Math.PI * 2 - this.radians);
        ctx.lineTo(this.position.x, this.position.y);
        ctx.fillStyle = '#ffff00';
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Mouth Animation
        if (this.radians < 0 || this.radians > 0.75) this.openRate = -this.openRate;
        this.radians += this.openRate;
    }
}

class Ghost {
    constructor({ position, velocity, color = '#ff0000' }) {
        this.position = position;
        this.velocity = velocity;
        this.radius = TILE_SIZE / 2 - 2;
        this.color = color;
        this.prevCollisions = [];
        this.speed = 2;
        this.scared = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, Math.PI, Math.PI * 2);
        ctx.lineTo(this.position.x + this.radius, this.position.y + this.radius);
        ctx.lineTo(this.position.x - this.radius, this.position.y + this.radius);
        ctx.fillStyle = this.scared ? '#1a1aff' : this.color;
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.position.x - 4, this.position.y - 2, 3, 0, Math.PI * 2);
        ctx.arc(this.position.x + 4, this.position.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.position.x - 4, this.position.y - 2, 1.5, 0, Math.PI * 2);
        ctx.arc(this.position.x + 4, this.position.y - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.closePath();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

const boundaries = [];
const pellets = [];
const ghosts = [];
let pacman;
let powerModeTimer = null;

function updateLivesUI() {
    const livesContainer = document.getElementById('lives-container');
    livesContainer.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const life = document.createElement('div');
        life.className = 'life';
        livesContainer.appendChild(life);
    }
}

function init() {
    boundaries.length = 0;
    pellets.length = 0;
    ghosts.length = 0;
    score = 0;
    lives = 3;
    updateLivesUI();
    scoreEl.innerText = '000000';
    gameOver = false;
    uiOverlay.classList.add('hidden');

    map.forEach((row, i) => {
        row.forEach((symbol, j) => {
            switch (symbol) {
                case 1:
                    boundaries.push(new Boundary({
                        position: { x: TILE_SIZE * j, y: TILE_SIZE * i }
                    }));
                    break;
                case 0:
                    pellets.push(new Pellet({
                        position: {
                            x: TILE_SIZE * j + TILE_SIZE / 2,
                            y: TILE_SIZE * i + TILE_SIZE / 2
                        }
                    }));
                    break;
                case 3:
                    pellets.push(new Pellet({
                        position: {
                            x: TILE_SIZE * j + TILE_SIZE / 2,
                            y: TILE_SIZE * i + TILE_SIZE / 2
                        },
                        isPowerPellet: true
                    }));
                    break;
                case 4:
                    // Only spawn ghosts if not already spawned
                    if (ghosts.length < 4) {
                        const colors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
                        ghosts.push(new Ghost({
                            position: {
                                x: TILE_SIZE * j + TILE_SIZE / 2,
                                y: TILE_SIZE * i + TILE_SIZE / 2
                            },
                            velocity: { x: 2, y: 0 },
                            color: colors[ghosts.length]
                        }));
                    }
                    break;
                case 5:
                    pacman = new Pacman({
                        position: {
                            x: TILE_SIZE * j + TILE_SIZE / 2,
                            y: TILE_SIZE * i + TILE_SIZE / 2
                        },
                        velocity: { x: 0, y: 0 }
                    });
                    break;
            }
        });
    });
}

function endGame(won) {
    gameOver = true;
    cancelAnimationFrame(animationId);
    statusText.innerText = won ? 'YOU WIN!' : 'GAME OVER';
    statusText.style.color = won ? 'var(--neon-yellow)' : 'var(--neon-pink)';
    uiOverlay.classList.remove('hidden');
}

const keys = {
    ArrowUp: { pressed: false },
    ArrowDown: { pressed: false },
    ArrowLeft: { pressed: false },
    ArrowRight: { pressed: false }
};

let lastKey = '';

function circleCollidesWithRectangle({ circle, rectangle }) {
    const padding = TILE_SIZE / 2 - circle.radius - 1;
    return (
        circle.position.y - circle.radius + circle.velocity.y <= rectangle.position.y + rectangle.height + padding &&
        circle.position.x + circle.radius + circle.velocity.x >= rectangle.position.x - padding &&
        circle.position.y + circle.radius + circle.velocity.y >= rectangle.position.y - padding &&
        circle.position.x - circle.radius + circle.velocity.x <= rectangle.position.x + rectangle.width + padding
    );
}

function animate() {
    if (gameOver) return;
    animationId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // WIN CONDITION
    if (pellets.length === 0) {
        endGame(true);
    }

    // Pac-Man Movement Handling
    if (keys.ArrowUp.pressed && lastKey === 'ArrowUp') {
        let collision = false;
        for (let i = 0; i < boundaries.length; i++) {
            if (circleCollidesWithRectangle({
                circle: { ...pacman, velocity: { x: 0, y: -2 } },
                rectangle: boundaries[i]
            })) {
                collision = true;
                break;
            }
        }
        if (!collision) pacman.velocity = { x: 0, y: -2 };
    } else if (keys.ArrowDown.pressed && lastKey === 'ArrowDown') {
        let collision = false;
        for (let i = 0; i < boundaries.length; i++) {
            if (circleCollidesWithRectangle({
                circle: { ...pacman, velocity: { x: 0, y: 2 } },
                rectangle: boundaries[i]
            })) {
                collision = true;
                break;
            }
        }
        if (!collision) pacman.velocity = { x: 0, y: 2 };
    } else if (keys.ArrowLeft.pressed && lastKey === 'ArrowLeft') {
        let collision = false;
        for (let i = 0; i < boundaries.length; i++) {
            if (circleCollidesWithRectangle({
                circle: { ...pacman, velocity: { x: -2, y: 0 } },
                rectangle: boundaries[i]
            })) {
                collision = true;
                break;
            }
        }
        if (!collision) pacman.velocity = { x: -2, y: 0 };
    } else if (keys.ArrowRight.pressed && lastKey === 'ArrowRight') {
        let collision = false;
        for (let i = 0; i < boundaries.length; i++) {
            if (circleCollidesWithRectangle({
                circle: { ...pacman, velocity: { x: 2, y: 0 } },
                rectangle: boundaries[i]
            })) {
                collision = true;
                break;
            }
        }
        if (!collision) pacman.velocity = { x: 2, y: 0 };
    }

    // Pellet Interaction
    for (let i = pellets.length - 1; i >= 0; i--) {
        const pellet = pellets[i];
        pellet.draw();

        if (Math.hypot(
            pellet.position.x - pacman.position.x,
            pellet.position.y - pacman.position.y
        ) < pellet.radius + pacman.radius) {

            if (pellet.isPowerPellet) {
                ghosts.forEach(ghost => {
                    ghost.scared = true;
                });
                if (powerModeTimer) clearTimeout(powerModeTimer);
                powerModeTimer = setTimeout(() => {
                    ghosts.forEach(ghost => ghost.scared = false);
                }, 5000);
            }

            pellets.splice(i, 1);
            score += pellet.isPowerPellet ? 50 : 10;
            scoreEl.innerText = score.toString().padStart(6, '0');
        }
    }

    // Wall Collision for Pac-Man
    boundaries.forEach(boundary => {
        boundary.draw();
        if (circleCollidesWithRectangle({ circle: pacman, rectangle: boundary })) {
            pacman.velocity.x = 0;
            pacman.velocity.y = 0;
        }
    });

    // Ghost Logic
    ghosts.forEach(ghost => {
        ghost.update();

        // Ghost-Pacman Collision
        if (Math.hypot(
            ghost.position.x - pacman.position.x,
            ghost.position.y - pacman.position.y
        ) < ghost.radius + pacman.radius) {

            if (ghost.scared) {
                // Ghost eaten
                ghost.position = { x: TILE_SIZE * 9 + TILE_SIZE / 2, y: TILE_SIZE * 9 + TILE_SIZE / 2 };
                ghost.scared = false;
                score += 200;
                scoreEl.innerText = score.toString().padStart(6, '0');
            } else {
                lives--;
                updateLivesUI();
                if (lives === 0) {
                    endGame(false);
                } else {
                    // Reset positions
                    pacman.position = { x: TILE_SIZE * 9 + TILE_SIZE / 2, y: TILE_SIZE * 15 + TILE_SIZE / 2 };
                    pacman.velocity = { x: 0, y: 0 };
                    ghosts.forEach((ghost, idx) => {
                        ghost.position = { x: TILE_SIZE * 9 + TILE_SIZE / 2, y: TILE_SIZE * 9 + TILE_SIZE / 2 };
                    });
                }
            }
        }

        // Ghost AI Movement
        const collisions = [];
        boundaries.forEach(boundary => {
            if (!collisions.includes('right') && circleCollidesWithRectangle({
                circle: { ...ghost, velocity: { x: ghost.speed, y: 0 } },
                rectangle: boundary
            })) {
                collisions.push('right');
            }
            if (!collisions.includes('left') && circleCollidesWithRectangle({
                circle: { ...ghost, velocity: { x: -ghost.speed, y: 0 } },
                rectangle: boundary
            })) {
                collisions.push('left');
            }
            if (!collisions.includes('up') && circleCollidesWithRectangle({
                circle: { ...ghost, velocity: { x: 0, y: -ghost.speed } },
                rectangle: boundary
            })) {
                collisions.push('up');
            }
            if (!collisions.includes('down') && circleCollidesWithRectangle({
                circle: { ...ghost, velocity: { x: 0, y: ghost.speed } },
                rectangle: boundary
            })) {
                collisions.push('down');
            }
        });

        if (collisions.length > ghost.prevCollisions.length) {
            ghost.prevCollisions = collisions;
        }

        if (JSON.stringify(collisions) !== JSON.stringify(ghost.prevCollisions)) {
            if (ghost.velocity.x > 0) ghost.prevCollisions.push('right');
            else if (ghost.velocity.x < 0) ghost.prevCollisions.push('left');
            else if (ghost.velocity.y < 0) ghost.prevCollisions.push('up');
            else if (ghost.velocity.y > 0) ghost.prevCollisions.push('down');

            const pathways = ghost.prevCollisions.filter(collision => {
                return !collisions.includes(collision);
            });

            const direction = pathways[Math.floor(Math.random() * pathways.length)];

            switch (direction) {
                case 'down':
                    ghost.velocity.y = ghost.speed;
                    ghost.velocity.x = 0;
                    break;
                case 'up':
                    ghost.velocity.y = -ghost.speed;
                    ghost.velocity.x = 0;
                    break;
                case 'right':
                    ghost.velocity.y = 0;
                    ghost.velocity.x = ghost.speed;
                    break;
                case 'left':
                    ghost.velocity.y = 0;
                    ghost.velocity.x = -ghost.speed;
                    break;
            }

            ghost.prevCollisions = [];
        }
    });

    // Rotation based on velocity
    if (pacman.velocity.x > 0) pacman.rotation = 0;
    else if (pacman.velocity.x < 0) pacman.rotation = Math.PI;
    else if (pacman.velocity.y > 0) pacman.rotation = Math.PI / 2;
    else if (pacman.velocity.y < 0) pacman.rotation = Math.PI * 1.5;

    pacman.update();
}

init();
animate();

restartBtn.addEventListener('click', () => {
    init();
    animate();
});

window.addEventListener('keydown', ({ key }) => {
    if (keys[key]) {
        keys[key].pressed = true;
        lastKey = key;
    }
});

window.addEventListener('keyup', ({ key }) => {
    if (keys[key]) {
        keys[key].pressed = false;
    }
});

