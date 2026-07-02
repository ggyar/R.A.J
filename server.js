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

const lobbys = {}; 

// MASSIV ERWEITERTER FRAGENKATALOG
const fragenKatalog = {
    "Allgemeines": [
        { q: "Wie viele Bundesländer hat Deutschland?", opts: ["12", "14", "16", "18"], correct: 2 },
        { q: "Was ist das chemische Symbol für Wasser?", opts: ["H2O", "O2", "CO2", "HO"], correct: 0 },
        { q: "Welches Element ist am häufigsten in der Erdatmosphäre vorhanden?", opts: ["Sauerstoff", "Stickstoff", "Wasserstoff", "Kohlendioxid"], correct: 1 },
        { q: "Wie viele Zähne hat ein erwachsener Mensch normalerweise (ohne Weisheitszähne)?", opts: ["28", "30", "32", "34"], correct: 0 },
        { q: "Welches Gebrechen veranlasste Beethoven, seine Musik hauptsächlich im Kopf zu komponieren?", opts: ["Blindheit", "Taubheit", "Lähmung", "Stummheit"], correct: 1 },
        { q: "In welchem Jahr fiel die Berliner Mauer?", opts: ["1985", "1989", "1991", "1995"], correct: 1 },
        { q: "Wer erfand den modernen Buchdruck?", opts: ["Johannes Gutenberg", "Albert Einstein", "Leonardo da Vinci", "Nikola Tesla"], correct: 0 },
        { q: "Wie viele Planeten hat unser Sonnensystem?", opts: ["7", "8", "9", "10"], correct: 1 }
    ],
    "Die Welt": [
        { q: "Welcher Fluss ist der längste der Welt?", opts: ["Nil", "Amazonas", "Mississippi", "Donau"], correct: 0 },
        { q: "Welches Land ist flächenmäßig das größte der Erde?", opts: ["Kanada", "USA", "Russland", "China"], correct: 2 },
        { q: "Welcher Ozean ist der tiefste der Welt?", opts: ["Atlantischer Ozean", "Indischer Ozean", "Pazifischer Ozean", "Arktischer Ozean"], correct: 2 },
        { q: "In welchem Land befindet sich das weltberühmte Bauwerk 'Taj Mahal'?", opts: ["Indien", "Pakistan", "Ägypten", "Thailand"], correct: 0 },
        { q: "Welches Gebirge trennt Europa von Asien?", opts: ["Alpen", "Ural", "Anden", "Himalaya"], correct: 1 },
        { q: "Wie heißt die trockene Wüste im Norden Chiles?", opts: ["Sahara", "Gobi", "Atacama", "Kalahari"], correct: 2 },
        { q: "Welche Meerenge trennt Spanien von Marokko?", opts: ["Straße von Gibraltar", "Bosporus", "Ärmelkanal", "Sueskanal"], correct: 0 }
    ],
    "Kontinente": [
        { q: "Welcher Kontinent ist der größte?", opts: ["Afrika", "Asien", "Nordamerika", "Europa"], correct: 1 },
        { q: "Auf welchem Kontinent liegt der Südpol?", opts: ["Antarktis", "Arktis", "Australien", "Südamerika"], correct: 0 },
        { q: "Welcher Kontinent hat die meisten Einwohner?", opts: ["Europa", "Afrika", "Asien", "Nordamerika"], correct: 2 },
        { q: "Auf welchem Kontinent liegt die Sahara-Wüste?", opts: ["Asien", "Australien", "Afrika", "Südamerika"], correct: 2 },
        { q: "Welcher Kontinent ist gleichzeitig ein einzelner Staat?", opts: ["Antarktis", "Südamerika", "Europa", "Australien"], correct: 3 },
        { q: "Durch welche zwei Kontinente verläuft der Äquator hauptsächlich?", opts: ["Afrika & Südamerika", "Asien & Europa", "Nordamerika & Afrika", "Australien & Asien"], correct: 0 }
    ],
    "Länder": [
        { q: "Was ist die Hauptstadt von Australien?", opts: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correct: 2 },
        { q: "Welches europäische Land wird oft als 'die Wiege der Demokratie' bezeichnet?", opts: ["Italien", "Griechenland", "Frankreich", "Großbritannien"], correct: 1 },
        { q: "Welches Land schenkte den USA die berühmte Freiheitsstatue?", opts: ["Deutschland", "Frankreich", "Spanien", "Italien"], correct: 1 },
        { q: "In welchem Land trinkt man statistisch gesehen den meisten Kaffee pro Kopf?", opts: ["Finnland", "Italien", "Brasilien", "Kolumbien"], correct: 0 },
        { q: "Welches Land hat die meisten Zeitzonen auf der Welt?", opts: ["Russland", "USA", "China", "Frankreich"], correct: 3 },
        { q: "Welches Land ist für seine Ahornblätter auf der Nationalflagge bekannt?", opts: ["Kanada", "Japan", "Schweden", "Österreich"], correct: 0 },
        { q: "Zu welchem Land gehört die Insel Grönland politisch gesehen?", opts: ["Kanada", "Island", "Norwegen", "Dänemark"], correct: 3 }
    ]
};

io.on('connection', (socket) => {
    console.log(`Benutzer verbunden: ${socket.id}`);

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

        // Geht zur nächsten Frage über (fängt von vorne an, falls alle durch sind)
        lobby.aktuelleFrageIndex = (lobby.aktuelleFrageIndex + 1) % lobby.fragen.length;
        lobby.currentTurnIndex = (lobby.currentTurnIndex + 1) % lobby.players.length;

        setTimeout(() => {
            sendeNeueRunde(pin);
        }, 3000);
    });

    socket.on('disconnect', () => {
        console.log(`Benutzer getrennt: ${socket.id}`);
    });
});

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