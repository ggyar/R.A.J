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

function pickRandomQuestion(kategorie) {
    const pool = questionsPool[kategorie] || questionsPool["Allgemeines"];
    return pool[Math.floor(Math.random() * pool.length)];
}

function getAlivePlayers(lobby) {
    return lobby.players.filter(p => p.alive);
}

function broadcastPlayers(pin) {
    const lobby = lobbies[pin];
    if (!lobby) return;
    io.to(pin).emit('updatePlayers', lobby.players.map(p => ({ name: p.name, alive: p.alive })));
}

// Wählt den nächsten aktiven Spieler + Frage, oder beendet das Spiel wenn nur noch 0-1 übrig sind
function startNextTurn(pin) {
    const lobby = lobbies[pin];
    if (!lobby) return;

    const alive = getAlivePlayers(lobby);

    if (alive.length <= 1) {
        const winnerName = alive.length === 1 ? alive[0].name : "Niemand";
        io.to(pin).emit('gameOver', { winner: winnerName });
        delete lobbies[pin];
        return;
    }

    const nextPlayer = alive[Math.floor(Math.random() * alive.length)];
    const qObj = pickRandomQuestion(lobby.kategorie);

    lobby.currentCorrectIndex = qObj.correct;
    lobby.activePlayerId = nextPlayer.id;

    io.to(pin).emit('newTurn', {
        activePlayerId: nextPlayer.id,
        activePlayerName: nextPlayer.name,
        question: qObj.q,
        options: qObj.opts
    });
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
            activePlayerId: null
        };
        socket.join(pin);
        socket.emit('lobbyCreated', { pin, kategorie });
    });

    // NEU: kompletter Beitritts-Handler (fehlte komplett)
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
        lobby.players.push({ id: socket.id, name: cleanName, alive: true });
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
        startNextTurn(pin);
    });

    socket.on('submitAnswer', ({ pin, answerIndex }) => {
        const lobby = lobbies[pin];
        if (!lobby) return;
        if (socket.id !== lobby.activePlayerId) return; // nicht am Zug -> ignorieren

        const isCorrect = (answerIndex === lobby.currentCorrectIndex);
        const player = lobby.players.find(p => p.id === socket.id);
        if (!isCorrect && player) player.alive = false;

        socket.emit('turnResult', {
            success: isCorrect,
            msg: isCorrect ? "Korrekt!" : "Du wurdest eliminiert!"
        });

        broadcastPlayers(pin);

        // kurze Pause, damit das Ergebnis-Overlay sichtbar bleibt, dann nächste Runde
        setTimeout(() => startNextTurn(pin), 2800);
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
                broadcastPlayers(pin);

                if (lobby.started && lobby.activePlayerId === socket.id) {
                    startNextTurn(pin);
                }
            }
        }
    });
});

// WICHTIG für Render/Vercel & Co: PORT-Umgebungsvariable nutzen statt fest 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));