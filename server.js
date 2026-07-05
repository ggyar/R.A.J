const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { questionsPool } = require('./questions'); // Importiert deine Fragen!

const app = express();
app.use(cors());

// Kleine Health-Check-Route, damit man im Browser sieht ob der Server lebt
app.get('/', (req, res) => {
    res.send('R.A.J Quiz-Server läuft ✅');
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const lobbies = {};
let onlineCount = 0;
const LEADERBOARD_DISPLAY_MS = 5000; // Wie lange das Leaderboard zwischen den Runden sichtbar bleibt

function pickNextQuestion(lobby) {
    const pool = questionsPool[lobby.kategorie] || questionsPool["Allgemeines"];

    if (!lobby.usedQuestionIndices) lobby.usedQuestionIndices = new Set();
    if (lobby.usedQuestionIndices.size >= pool.length) {
        lobby.usedQuestionIndices.clear(); // alle Fragen der Kategorie waren schon dran -> von vorne
    }

    let idx;
    do {
        idx = Math.floor(Math.random() * pool.length);
    } while (lobby.usedQuestionIndices.has(idx));

    lobby.usedQuestionIndices.add(idx);
    return pool[idx];
}

function getAlivePlayers(lobby) {
    return lobby.players.filter(p => p.alive);
}

// Wählt den NÄCHSTEN Spieler in der Beitritts-Reihenfolge (nicht zufällig), überspringt Eliminierte.
function getNextAlivePlayer(lobby) {
    const players = lobby.players;
    if (players.length === 0) return null;

    let startIndex = 0;
    if (lobby.activePlayerId) {
        const lastIndex = players.findIndex(p => p.id === lobby.activePlayerId);
        if (lastIndex !== -1) startIndex = lastIndex + 1;
    }

    for (let i = 0; i < players.length; i++) {
        const idx = (startIndex + i) % players.length;
        if (players[idx].alive) return players[idx];
    }
    return null; // niemand mehr am Leben
}

function broadcastPlayers(pin) {
    const lobby = lobbies[pin];
    if (!lobby) return;
    io.to(pin).emit('updatePlayers', lobby.players.map(p => ({ name: p.name, alive: p.alive, score: p.score })));
}

// Baut die sortierte Rangliste: zuerst lebende Spieler (nach Punkten absteigend), dann Ausgeschiedene
function buildLeaderboard(lobby) {
    return [...lobby.players]
        .sort((a, b) => {
            if (a.alive !== b.alive) return a.alive ? -1 : 1;
            return b.score - a.score;
        })
        .map(p => ({ name: p.name, score: p.score, alive: p.alive }));
}

// Startet eine neue Runde: merkt sich, wer diese Runde dabei ist, damit wir wissen, wann sie komplett ist
function beginNewRound(lobby) {
    lobby.roundParticipants = getAlivePlayers(lobby).map(p => p.id);
    lobby.roundTurnsTaken = new Set();
    lobby.roundNumber = (lobby.roundNumber || 0) + 1;
}

function startNextTurn(pin) {
    const lobby = lobbies[pin];
    if (!lobby) return;

    const nextPlayer = getNextAlivePlayer(lobby);
    if (!nextPlayer) return; // sollte dank advanceGame() nicht vorkommen

    const qObj = pickNextQuestion(lobby);

    lobby.currentCorrectIndex = qObj.correct;
    lobby.activePlayerId = nextPlayer.id;

    io.to(pin).emit('newTurn', {
        activePlayerId: nextPlayer.id,
        activePlayerName: nextPlayer.name,
        question: qObj.q,
        options: qObj.opts,
        round: lobby.roundNumber
    });
}

// Nach jeder beantworteten Frage (und bei Disconnects während des Spiels) aufgerufen.
// Entscheidet: Spiel vorbei -> gameOver; Runde komplett -> Leaderboard + neue Runde; sonst -> nächster Zug.
function advanceGame(pin) {
    const lobby = lobbies[pin];
    if (!lobby) return;

    const alive = getAlivePlayers(lobby);

    if (alive.length <= 1) {
        const winnerName = alive.length === 1 ? alive[0].name : "Niemand";
        io.to(pin).emit('gameOver', { winner: winnerName, leaderboard: buildLeaderboard(lobby) });
        delete lobbies[pin];
        return;
    }

    const rundeKomplett = lobby.roundParticipants.length > 0 &&
        lobby.roundTurnsTaken.size >= lobby.roundParticipants.length;

    if (rundeKomplett) {
        io.to(pin).emit('roundEnd', {
            round: lobby.roundNumber,
            leaderboard: buildLeaderboard(lobby)
        });
        setTimeout(() => {
            if (!lobbies[pin]) return; // Lobby könnte zwischenzeitlich weg sein
            beginNewRound(lobbies[pin]);
            startNextTurn(pin);
        }, LEADERBOARD_DISPLAY_MS);
    } else {
        startNextTurn(pin);
    }
}

io.on('connection', (socket) => {
    onlineCount++;
    io.emit('playerCountUpdate', onlineCount);

    socket.on('createLobby', (kategorie) => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        lobbies[pin] = {
            hostId: socket.id,
            kategorie,
            players: [],
            started: false,
            currentCorrectIndex: null,
            activePlayerId: null,
            roundParticipants: [],
            roundTurnsTaken: new Set(),
            roundNumber: 0
        };
        socket.join(pin);
        socket.emit('lobbyCreated', { pin, kategorie });
    });

    socket.on('joinLobby', ({ pin, name }) => {
        const lobby = lobbies[pin];
        if (!lobby) {
            socket.emit('errorMsg', 'Diese PIN existiert nicht.');
            return;
        }
        if (lobby.started) {
            socket.emit('errorMsg', 'Diese Sitzung läuft bereits, ein Beitritt ist nicht mehr möglich.');
            return;
        }

        const cleanName = (name || '').trim().slice(0, 20) || 'Spieler';
        lobby.players.push({ id: socket.id, name: cleanName, alive: true, score: 0 });
        socket.join(pin);

        socket.emit('joinedSuccessfully', { kategorie: lobby.kategorie, pin });
        broadcastPlayers(pin);
    });

    socket.on('startGameServer', (pin) => {
        const lobby = lobbies[pin];
        if (!lobby) return;
        if (socket.id !== lobby.hostId) return; // nur der Host darf starten

        if (lobby.players.length === 0) {
            socket.emit('errorMsg', 'Es muss mindestens ein Spieler beitreten, bevor du starten kannst.');
            return;
        }

        lobby.started = true;
        beginNewRound(lobby);
        startNextTurn(pin);
    });

    socket.on('submitAnswer', ({ pin, answerIndex }) => {
        const lobby = lobbies[pin];
        if (!lobby) return;
        if (socket.id !== lobby.activePlayerId) return; // nicht am Zug -> ignorieren

        const isCorrect = (answerIndex === lobby.currentCorrectIndex);
        const player = lobby.players.find(p => p.id === socket.id);
        if (player) {
            if (isCorrect) player.score += 1;
            else player.alive = false;
        }

        lobby.roundTurnsTaken.add(socket.id);

        socket.emit('turnResult', {
            success: isCorrect,
            msg: isCorrect ? "Korrekt!" : "Du wurdest eliminiert!"
        });

        broadcastPlayers(pin);

        // kurze Pause, damit das Ergebnis-Overlay sichtbar bleibt, dann geht's weiter
        setTimeout(() => advanceGame(pin), 2800);
    });

    socket.on('disconnect', () => {
        onlineCount = Math.max(0, onlineCount - 1);
        io.emit('playerCountUpdate', onlineCount);

        for (const pin in lobbies) {
            const lobby = lobbies[pin];

            if (lobby.hostId === socket.id) {
                io.to(pin).emit('errorMsg', 'Der Host hat die Sitzung verlassen.');
                delete lobbies[pin];
                continue;
            }

            if (lobby.players.some(p => p.id === socket.id)) {
                lobby.players = lobby.players.filter(p => p.id !== socket.id);
                if (lobby.roundParticipants) {
                    lobby.roundParticipants = lobby.roundParticipants.filter(id => id !== socket.id);
                }
                broadcastPlayers(pin);

                if (lobby.started && lobby.activePlayerId === socket.id) {
                    advanceGame(pin);
                }
            }
        }
    });
});

// WICHTIG für Render/Vercel & Co: PORT-Umgebungsvariable nutzen statt fest 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));