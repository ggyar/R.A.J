const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { questionsPool } = require('./questions'); // Importiert deine Fragen!

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const lobbies = {};

io.on('connection', (socket) => {
    socket.on('createLobby', (kategorie) => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        lobbies[pin] = { hostId: socket.id, kategorie, currentCorrectIndex: null };
        socket.join(pin);
        socket.emit('lobbyCreated', { pin, kategorie });
    });

    socket.on('startGameServer', (pin) => {
        const lobby = lobbies[pin];
        if (!lobby) return;

        // Wähle eine zufällige Frage aus dem importierten Pool
        const pool = questionsPool[lobby.kategorie] || questionsPool["Allgemeines"];
        const qObj = pool[Math.floor(Math.random() * pool.length)];
        lobby.currentCorrectIndex = qObj.correct;

        io.to(pin).emit('newTurn', {
            question: qObj.q,
            options: qObj.opts
        });
    });

    socket.on('submitAnswer', ({ pin, answerIndex }) => {
        const lobby = lobbies[pin];
        if (!lobby) return;

        const isCorrect = (answerIndex === lobby.currentCorrectIndex);
        
        // NUR der Spieler bekommt die Antwort (kein Broadcast!)
        socket.emit('turnResult', { 
            success: isCorrect, 
            msg: isCorrect ? "Korrekt!" : "Du wurdest eliminiert!" 
        });
    });
});

server.listen(3000, () => console.log("Server läuft auf Port 3000"));