const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- FRAGEN-POOL ---
const questionsPool = {
    "Allgemeines": [
        { q: "Was ist das chemische Symbol für Gold?", opts: ["Au", "Ag", "Fe", "Go"], correct: 0 },
        { q: "Wie viele Planeten hat unser Sonnensystem?", opts: ["7", "8", "9", "10"], correct: 1 }
    ],
    "Die Welt": [
        { q: "Welcher Fluss ist der längste der Welt?", opts: ["Amazonas", "Nil", "Jangtsekiang", "Mississippi"], correct: 1 }
    ]
};

// Hilfsfunktion: Frage ziehen (Server-Seite!)
function getQuestion(kategorie) {
    const pool = questionsPool[kategorie] || questionsPool["Allgemeines"];
    const original = pool[Math.floor(Math.random() * pool.length)];
    
    // Mischen
    let options = [...original.opts];
    const correctVal = options[original.correct];
    options.sort(() => Math.random() - 0.5);
    
    return {
        question: original.q,
        options: options,
        correctIndex: options.indexOf(correctVal) // Der Server merkt sich diesen Index
    };
}

// LOBBIES
const lobbies = {};

io.on('connection', (socket) => {
    // 1. LIVE PLAYER COUNT
    io.emit('playerCountUpdate', io.engine.clientsCount);
    console.log(`Verbindung: ${socket.id}. Spieler online: ${io.engine.clientsCount}`);

    // Lobby erstellen
    socket.on('createLobby', (kategorie) => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        lobbies[pin] = { hostId: socket.id, kategorie, players: [] };
        socket.join(pin);
        socket.emit('lobbyCreated', { pin, kategorie });
    });

    // Spieler beitreten
    socket.on('joinLobby', ({ pin, name }) => {
        if (!lobbies[pin]) return socket.emit('errorMsg', 'PIN nicht gefunden!');
        lobbies[pin].players.push({ id: socket.id, name });
        socket.join(pin);
        io.to(pin).emit('updatePlayers', lobbies[pin].players);
    });

    // Spiel starten
    socket.on('startGameServer', (pin) => {
        const lobby = lobbies[pin];
        if (!lobby) return;
        
        // Erste Frage generieren
        const qData = getQuestion(lobby.kategorie);
        lobby.currentCorrectIndex = qData.correctIndex; // Speichern!
        
        io.to(pin).emit('newTurn', {
            question: qData.question,
            options: qData.options
        });
    });

    // Antwort prüfen (Security: Client sendet nur Index)
    // Antwort prüfen (Security: Client sendet nur Index)
socket.on('submitAnswer', ({ pin, answerIndex }) => {
    const lobby = lobbies[pin];
    if (!lobby) return;
 
    // Ergebnis berechnen
    const isCorrect = (answerIndex === lobby.currentCorrectIndex);
 
    // WICHTIG: Das Ergebnis an DEN EINEN Spieler senden
    // socket.emit sorgt dafür, dass NUR dieser Spieler die Nachricht bekommt
    socket.emit('turnResult', {
        success: isCorrect,
        msg: isCorrect ? "Korrekt!" : "Leider falsch!"
    });
    
    console.log(`Spieler ${socket.id} hat geantwortet. Korrekt: ${isCorrect}`);
});
    // Disconnect
    socket.on('disconnect', () => {
        io.emit('playerCountUpdate', io.engine.clientsCount);
        // ... (Logik zum Entfernen aus Lobbies wie gehabt)
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
