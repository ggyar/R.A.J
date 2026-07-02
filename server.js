const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
// 1. Der riesige Fragen-Pool
const questionsPool = {
    "Allgemeines": [
        { q: "Was ist der größte Planet unseres Sonnensystems?", opts: ["Jupiter", "Saturn", "Mars", "Erde"], correct: 0 },
        { q: "Wie viele Zähne hat ein erwachsener Mensch?", opts: ["28", "32", "30", "34"], correct: 1 },
        { q: "Welches Land hat die größte Fläche?", opts: ["Kanada", "China", "Russland", "USA"], correct: 2 }
    ],
    "Die Welt": [
        { q: "Wie viele Kontinente gibt es?", opts: ["5", "6", "7", "8"], correct: 2 },
        { q: "Welcher Ozean ist der größte?", opts: ["Atlantik", "Pazifik", "Indischer Ozean", "Arktischer Ozean"], correct: 1 }
    ]
    // Hier kannst du unendlich viele Fragen hinzufügen!
};

// Zufalls-Frage holen und mischen
function getNewQuestion(kategorie) {
    const pool = questionsPool[kategorie] || questionsPool["Allgemeines"];
    const randomIndex = Math.floor(Math.random() * pool.length);
    const original = pool[randomIndex];
    
    // Optionen mischen, aber die richtige Antwort tracken
    let options = [...original.opts];
    const richtigeAntwort = original.opts[original.correct];
    
    // Mischen (Shuffle)
    options.sort(() => Math.random() - 0.5);
    
    // Neuen Index der richtigen Antwort finden
    const newCorrectIndex = options.indexOf(richtigeAntwort);
    
    return {
        question: original.q,
        options: options,
        correctIndex: newCorrectIndex // Das schickst du an den Server/Client
    };
}
// Falls du das Frontend später auch über den Server ausliefern willst:
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Erlaubt Verbindungen von allen Geräten
        methods: ["GET", "POST"]
    }
});

// Speicher für die aktiven Spiele
const lobbies = {};

io.on('connection', (socket) => {
    console.log(`Neues Gerät verbunden: ${socket.id}`);

    // 1. Host erstellt eine neue Lobby
    socket.on('createLobby', (kategorie) => {
        // Generiere einen echten, zufälligen 4-stelligen PIN
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        
        lobbies[pin] = {
            hostId: socket.id,
            kategorie: kategorie,
            players: []
        };

        socket.join(pin);
        socket.emit('lobbyCreated', { pin, kategorie });
        console.log(`Lobby ${pin} für Kategorie [${kategorie}] erstellt.`);
    });

    // 2. Spieler tritt per Smartphone bei
    socket.on('joinLobby', ({ pin, playerName }) => {
        const lobby = lobbies[pin];
        
        if (!lobby) {
            socket.emit('errorMsg', 'Spiel-PIN wurde nicht gefunden!');
            return;
        }

        // Spieler zur Lobby hinzufügen
        lobby.players.push({ id: socket.id, name: playerName });
        socket.join(pin);

        // Bestätigung an den Spieler
        socket.emit('joinedSuccessfully', { kategorie: lobby.kategorie });

        // Den Host (und alle anderen) informieren, dass jemand da ist
        io.to(pin).emit('updatePlayers', lobby.players);
        console.log(`${playerName} ist der Lobby ${pin} beigetreten.`);
    });

    // 3. Wenn jemand die Verbindung verliert
    socket.on('disconnect', () => {
        // Suchen, ob der Trennende ein Spieler in einer Lobby war
        for (const pin in lobbies) {
            const lobby = lobbies[pin];
            const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                const name = lobby.players[playerIndex].name;
                lobby.players.splice(playerIndex, 1);
                io.to(pin).emit('updatePlayers', lobby.players);
                console.log(`${name} hat die Verbindung zu Lobby ${pin} verloren.`);
                break;
            }

            // Wenn der Host disconnectet, Lobby schließen
            if (lobby.hostId === socket.id) {
                io.to(pin).emit('errorMsg', 'Der Spielleiter hat die Verbindung getrennt.');
                delete lobbies[pin];
                console.log(`Lobby ${pin} geschlossen, da der Host weg ist.`);
                break;
            }
        }
    });
});

// Port für das Internet (Render/Fly.io nutzen Umgebungsvariablen, lokal ist es 3000)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`R.A.J Server läuft wie geschmiert auf Port ${PORT} 🚀`);
});

