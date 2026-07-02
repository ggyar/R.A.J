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