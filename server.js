const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Speicher für alle aktiven Lobbys
const lobbys = {}; 

// Quizfragen-Katalog für die Kategorien
const fragenKatalog = {
    "Allgemeines": [
        { q: "Wie viele Bundesländer hat Deutschland?", opts: ["12", "14", "16", "18"], correct: 2 },
        { q: "Was ist das chemische Symbol für Wasser?", opts: ["H2O", "O2", "CO2", "HO"], correct: 0 }
    ],
    "Die Welt": [
        { q: "Welcher Fluss ist der längste der Welt?", opts: ["Nil", "Amazonas", "Mississippi", "Donau"], correct: 0 },
        { q: "Welches Land ist flächenmäßig das größte der Erde?", opts: ["Kanada", "USA", "Russland", "China"], correct: 2 }
    ],
    "Kontinente": [
        { q: "Welcher Kontinent ist der größte?", opts: ["Afrika", "Asien", "Nordamerika", "Europa"], correct: 1 }
    ],
    "Länder": [
        { q: "Was ist die Hauptstadt von Australien?", opts: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correct: 2 }
    ]
};

// --- HIER STARTET DIE VERBINDUNGSSCHLEIFE ---
io.on('connection', (socket) => {
    console.log(`Benutzer verbunden: ${socket.id}`);

    // 1. Lobby erstellen
    socket.on('createLobby', (kategorie) => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        
        lobbys[pin] = {
            kategorie: kategorie,
            hostId: socket.id,
            players: [],
            gameStarted: false,
            fragen: [],
            aktuelleFrageIndex: 0,
            currentTurnIndex: 0
        };

        socket.join(pin);
        console.log(`Lobby erstellt. PIN: ${pin}, Kategorie: ${kategorie}`);
        socket.emit('lobbyCreated', { pin, kategorie });
    });

    // 2. Spieler tritt bei
    socket.on('joinLobby', ({ pin, name }) => {
        const lobby = lobbys[pin];
        if (!lobby) {
            socket.emit('errorMsg', "Lobby wurde nicht gefunden! Falsche PIN?");
            return;
        }
        if (lobby.gameStarted) {
            socket.emit('errorMsg', "Das Spiel läuft bereits!");
            return;
        }

        const newPlayer = { id: socket.id, name: name, alive: true };
        lobby.players.push(newPlayer);
        socket.join(pin);

        socket.emit('joinedSuccessfully', { kategorie: lobby.kategorie });
        io.to(pin).emit('updatePlayers', lobby.players);
    });

    // 3. Spiel starten (JETZT KORREKT INNEN DRIN!)
    socket.on('startGameServer', (pin) => {
        const lobby = lobbys[pin];
        
        if (!lobby) {
            socket.emit('errorMsg', "Lobby nicht gefunden.");
            return;
        }
        if (lobby.players.length === 0) {
            socket.emit('errorMsg', "Es müssen erst Spieler beitreten!");
            return;
        }

        lobby.gameStarted = true;
        lobby.currentTurnIndex = 0; 
        lobby.fragen = fragenKatalog[lobby.kategorie] || fragenKatalog["Allgemeines"]; 
        lobby.aktuelleFrageIndex = 0;

        console.log(`Spiel in Lobby ${pin} gestartet!`);
        sendeNeueRunde(pin);
    });

    // 4. Antwort auswerten
    socket.on('submitAnswer', ({ pin, answerIndex }) => {
        const lobby = lobbys[pin];
        if (!lobby) return;

        const frageObjekt = lobby.fragen[lobby.aktuelleFrageIndex];
        let aktiverSpieler = lobby.players[lobby.currentTurnIndex];

        let erfolg = false;
        let nachricht = "";

        if (answerIndex === frageObjekt.correct) {
            erfolg = true;
            nachricht = `Richtig! ${aktiverSpieler.name} hat die Frage korrekt beantwortet.`;
        } else {
            aktiverSpieler.alive = false; 
            nachricht = `Falsch! ${aktiverSpieler.name} wurde eliminiert! Die richtige Antwort war: ${frageObjekt.opts[frageObjekt.correct]}`;
        }

        io.to(pin).emit('turnResult', { player: aktiverSpieler.name, success: erfolg, msg: nachricht });
        io.to(pin).emit('updatePlayers', lobby.players);

        lobby.aktuelleFrageIndex = (lobby.aktuelleFrageIndex + 1) % lobby.fragen.length;
        lobby.currentTurnIndex = (lobby.currentTurnIndex + 1) % lobby.players.length;

        setTimeout(() => {
            sendeNeueRunde(pin);
        }, 3000);
    });

    // Verbindung trennen
    socket.on('disconnect', () => {
        console.log(`Benutzer getrennt: ${socket.id}`);
    });
});
// --- ENDE DER VERBINDUNGSSCHLEIFE ---


// Hilfsfunktion zur Rundensteuerung (Steht außerhalb, da sie io.to benutzt)
function sendeNeueRunde(pin) {
    const lobby = lobbys[pin];
    if (!lobby) return;

    const lebendeSpieler = lobby.players.filter(p => p.alive);
    if (lebendeSpieler.length <= 1) {
        const gewinner = lebendeSpieler.length === 1 ? lebendeSpieler[0].name : "Niemand";
        io.to(pin).emit('gameOver', { winner: gewinner });
        return;
    }

    let aktiverSpieler = lobby.players[lobby.currentTurnIndex];
    while (!aktiverSpieler.alive) {
        lobby.currentTurnIndex = (lobby.currentTurnIndex + 1) % lobby.players.length;
        aktiverSpieler = lobby.players[lobby.currentTurnIndex];
    }

    const frageObjekt = lobby.fragen[lobby.aktuelleFrageIndex];

    io.to(pin).emit('newTurn', {
        activePlayerName: aktiverSpieler.name,
        activePlayerId: aktiverSpieler.id,
        question: frageObjekt.q,
        options: frageObjekt.opts
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});