const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Erlaubt Vercel den Zugriff
        methods: ["GET", "POST"]
    }
});

// Speicher für alle aktiven Lobbys/Räume
const lobbys = {}; 

io.on('connection', (socket) => {
    console.log(`Benutzer verbunden: ${socket.id}`);

    // HIER IST DAS WICHTIGE EVENT, DAS BEIM KLICK AUF "ALLGEMEINES" GEFEUERT WIRD:
    socket.on('createLobby', (kategorie) => {
        // Generiert eine zufällige 4-stellige PIN
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        
        lobbys[pin] = {
            kategorie: kategorie,
            hostId: socket.id,
            players: [],
            gameStarted: false
        };

        socket.join(pin);
        console.log(`Lobby erstellt. PIN: ${pin}, Kategorie: ${kategorie}`);
        
        // Schickt die PIN zurück an die index.html, damit der Bildschirm umschaltet
        socket.emit('lobbyCreated', { pin, kategorie });
    });

    // Spieler tritt bei
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

    socket.on('disconnect', () => {
        console.log(`Benutzer getrennt: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
// --- DUMMY-FRAGEN ALS BEISPIEL (Falls du noch keine in deiner server.js hast) ---
const fragenKatalog = {
    "Allgemeines": [
        { q: "Wie viele Bundesländer hat Deutschland?", opts: ["12", "14", "16", "18"], correct: 2 },
        { q: "Was ist das chemische Symbol für Wasser?", opts: ["H2O", "O2", "CO2", "HO"], correct: 0 }
    ],
    "Die Welt": [
        { q: "Welcher Fluss ist der längste der Welt?", opts: ["Nil", "Amazonas", "Mississippi", "Donau"], correct: 0 }
    ]
};

// --- DIESER BLOCK MUSS IN DEIN io.on('connection', (socket) => { ... }) ---

socket.on('startGameServer', (pin) => {
    const lobby = lobbys[pin];
    
    // Sicherheits-Checks
    if (!lobby) {
        socket.emit('errorMsg', "Lobby nicht gefunden.");
        return;
    }
    if (lobby.players.length === 0) {
        socket.emit('errorMsg', "Es müssen erst Spieler beitreten, bevor du starten kannst!");
        return;
    }

    lobby.gameStarted = true;
    lobby.currentTurnIndex = 0; // Wer fängt an? (Spieler 0)

    // Holt die passenden Fragen für die gewählte Kategorie
    const kategorie = lobby.kategorie;
    lobby.fragen = fragenKatalog[kategorie] || fragenKatalog["Allgemeines"]; 
    lobby.aktuelleFrageIndex = 0;

    console.log(`Spiel in Lobby ${pin} wird gestartet! Kategorie: ${kategorie}`);

    // Funktion aufrufen, um die allererste Runde zu starten
    sendeNeueRunde(pin);
});

// --- DIESE HILFSFUNKTION GANZ UNTEN IN DIE DATEI (außerhalb von io.on) ---

function sendeNeueRunde(pin) {
    const lobby = lobbys[pin];
    if (!lobby) return;

    // Prüfen, ob noch genug Spieler leben
    const lebendeSpieler = lobby.players.filter(p => p.alive);
    if (lebendeSpieler.length <= 1) {
        const gewinner = lebendeSpieler.length === 1 ? lebendeSpieler[0].name : "Niemand";
        io.to(pin).emit('gameOver', { winner: gewinner });
        return;
    }

    // Wer ist in dieser Runde der aktive Spieler?
    // Der Index rotiert durch alle Spieler, überspringt aber die Toten
    let aktiverSpieler = lobby.players[lobby.currentTurnIndex];
    while (!aktiverSpieler.alive) {
        lobby.currentTurnIndex = (lobby.currentTurnIndex + 1) % lobby.players.length;
        aktiverSpieler = lobby.players[lobby.currentTurnIndex];
    }

    // Aktuelle Frage heraussuchen
    const frageObjekt = lobby.fragen[lobby.aktuelleFrageIndex];

    // Befehl an ALLE im Raum schicken. Das HTML wertet aus, wer die Knöpfe drücken darf!
    io.to(pin).emit('newTurn', {
        activePlayerName: aktiverSpieler.name,
        activePlayerId: aktiverSpieler.id,
        question: frageObjekt.q,
        options: frageObjekt.opts
    });
}

// --- ANTWORT AUSWERTEN EVENT (Damit das Spiel nach dem Klick weitergeht) ---
// Kommt ebenfalls in den io.on('connection') Bereich:
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
        aktiverSpieler.alive = false; // Spieler fliegt raus!
        nachricht = `Falsch! ${aktiverSpieler.name} wurde eliminiert! Die richtige Antwort war: ${frageObjekt.opts[frageObjekt.correct]}`;
    }

    // Ergebnis an alle senden
    io.to(pin).emit('turnResult', { player: aktiverSpieler.name, success: erfolg, msg: nachricht });
    io.to(pin).emit('updatePlayers', lobby.players);

    // Nächste Frage vorbereiten und den nächsten Spieler auswählen
    lobby.aktuelleFrageIndex = (lobby.aktuelleFrageIndex + 1) % lobby.fragen.length;
    lobby.currentTurnIndex = (lobby.currentTurnIndex + 1) % lobby.players.length;

    // Kurz warten, damit die Spieler die Nachricht lesen können, dann nächste Runde senden
    setTimeout(() => {
        sendeNeueRunde(pin);
    }, 3000);
});