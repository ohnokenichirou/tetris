const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

const nextCanvas = document.getElementById('next');
let nextContext;
const holdCanvas = document.getElementById('hold');
let holdContext;

const pieces = 'TJOLISZ';
let nextPiece = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);

context.scale(20, 20);

const sounds = {
    bgm: new Howl({
        src: ['sounds/bgm.mp3'],
        volume: 0.6,
        loop: true,
    }),
    lineClear: new Howl({
        src: ['sounds/line-clear.mp3'],
        volume: 0.6,
    }),
    pieceMove: new Howl({
        src: ['sounds/piece-move.mp3'],
        volume: 0.6,
    }),
};

window.onload = function () {
    nextContext = nextCanvas.getContext('2d');
    nextContext.scale(20, 20);
    holdContext = holdCanvas.getContext('2d');
    holdContext.scale(20, 20);
};

document.getElementById('startButton').addEventListener('click', () => {
    sounds.bgm.stop();
    sounds.bgm.play();
    playerReset();
    update();
    document.getElementById('startButton').style.display = 'none';
});

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        rowCount *= 2;

        sounds.lineClear.play();
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                    arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

function createPiece(type) {
    const pieces = {
        T: [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
        O: [[2, 2], [2, 2]],
        L: [[0, 3, 0], [0, 3, 0], [0, 3, 3]],
        J: [[0, 4, 0], [0, 4, 0], [4, 4, 0]],
        I: [[0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0]],
        S: [[0, 6, 6], [6, 6, 0], [0, 0, 0]],
        Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]],
    };
    return pieces[type];
}

function drawMatrix(matrix, offset, context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // ゴーストブロックの描画
    const ghostY = getGhostPosition(arena, player);
    if (ghostY !== undefined) {
        const ghostPlayer = {
            pos: { ...player.pos, y: ghostY },
            matrix: player.matrix,
        };
        context.globalAlpha = 0.5;
        drawMatrix(ghostPlayer.matrix, ghostPlayer.pos, context);
        context.globalAlpha = 1;
    }

    drawMatrix(arena, { x: 0, y: 0 }, context);
    drawMatrix(player.matrix, player.pos, context);

    if (nextContext) {
        nextContext.fillStyle = '#000';
        nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (nextPiece) {
            const offsetX = Math.floor(nextCanvas.width / 20 / 2 - nextPiece[0].length / 2);
            const offsetY = 1;
            drawMatrix(nextPiece, { x: offsetX, y: offsetY }, nextContext);
        }
    }

    if (holdContext && holdPiece) {
        holdContext.fillStyle = '#000';
        holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
        const offsetX = Math.floor(holdCanvas.width / 20 / 2 - holdPiece[0].length / 2);
        const offsetY = Math.floor(holdCanvas.height / 20 / 2 - holdPiece.length / 2);
        drawMatrix(holdPiece, { x: offsetX, y: offsetY }, holdContext);
    }
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
        sounds.pieceMove.play();
    }
    dropCounter = 0;
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(arena, player)) {
        player.pos.x -= offset;
    }
    sounds.pieceMove.play();
}

function playerReset() {
    player.matrix = nextPiece;
    nextPiece = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        gameOver();
    }
    canHold = true;
}

function gameOver() {
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').innerText = player.score;
    arena.forEach(row => row.fill(0));
    player.score = 0;
    updateScore();
    player.matrix = null;
    sounds.bgm.stop();
}

function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    playerReset();
    update();
    sounds.bgm.stop();
    sounds.bgm.play();
}

let paused = false;
function togglePause() {
    paused = !paused;
    const button = document.getElementById('pauseButton');
    button.innerText = paused ? '再開' : '一時停止';
    if (paused) {
        sounds.bgm.pause();
    } else {
        sounds.bgm.stop();
        sounds.bgm.play();
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
    sounds.pieceMove.play();
}

let dropCounter = 0;
let dropInterval = 1000;

let holdPiece = null;
let canHold = true;

function getGhostPosition(arena, player) {
    let y = player.pos.y;
    const tempPlayer = { ...player, pos: { ...player.pos } }; // player.posのコピーを作成
    while (true) {
        tempPlayer.pos.y++;
        if (collide(arena, tempPlayer)) {
            tempPlayer.pos.y--;
            break;
        }
    }
    const ghostY = tempPlayer.pos.y;
    return ghostY;
}

let lastTime = 0;
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    if (!paused) {
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
            dropCounter = 0; // dropCounterをリセット
            // スコアに応じてスピードアップ
            if (player.score > 50 && dropInterval > 500) {
                dropInterval -= 200;
            } else if (player.score > 200 && dropInterval > 300) {
                dropInterval -= 200;
            }
        }
    }
    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
}

document.addEventListener('keydown', event => {
    if (paused) return;
    if (event.keyCode === 37) playerMove(-1);
    else if (event.keyCode === 39) playerMove(1);
    else if (event.keyCode === 40) playerDrop();
    else if (event.keyCode === 81) playerRotate(-1);
    else if (event.keyCode === 87) playerRotate(1);
    else if (event.keyCode === 67) playerHold();
    else if (event.keyCode === 32) {
        while (!collide(arena, player)) player.pos.y++;
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
        sounds.pieceMove.play();
    }
});

function playerHold() {
    if (canHold) {
        if (holdPiece === null) {
            holdPiece = player.matrix;
            playerReset();
        } else {
            const temp = player.matrix;
            player.matrix = holdPiece;
            holdPiece = temp;
        }
        canHold = false;
    }
    draw();
}

const colors = [
    null,
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#FFE138',
    '#3877FF',
    '#808080', // ゴーストブロックの色
];

const arena = createMatrix(12, 20);

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
};
