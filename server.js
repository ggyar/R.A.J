const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
 
const app = express();
app.use(cors());
 
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Erlaubt deiner Vercel-Webseite den Zugriff
        methods: ["GET", "POST"]
    }
});
 
const rooms = {}; // Hier werden alle aktiven Lobbies gespeichert
 
io.on("connection", (socket) => {
    console.log("Ein Nutzer hat sich verbunden:", socket.id);
 
    // LOBBY ERSTELLEN (Wenn du auf Vercel "Als Host starten" klickst)
    socket.on("createRoom", (data) => {
        // Generiert eine zufällige 4-stellige PIN
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        
        rooms[pin] = {
            hostId: socket.id,
            category: data.category,
            players: []
        };
 
        socket.join(pin);
        socket.emit("roomCreated", { pin: pin, category: data.category });
        console.log(`Lobby ${pin} für Kategorie ${data.category} erstellt.`);
    });
 
    // SPIELER TRITT BEI (Wenn jemand die PIN am Handy eingibt)
    socket.on("joinRoom", (data) => {
        const { pin, name } = data;
 
        if (rooms[pin]) {
            rooms[pin].players.push({ id: socket.id, name: name });
            socket.join(pin);
            
            // Dem Host-Bildschirm die neue Spielerliste schicken
            io.to(pin).emit("playerJoined", rooms[pin].players);
            socket.emit("joinSuccess", { message: "Erfolgreich beigetreten!" });
        } else {
            socket.emit("joinError", { message: "Falsche PIN! Lobby nicht gefunden." });
        }
    });
 
    socket.on("disconnect", () => {
        console.log("Nutzer hat die Verbindung getrennt:", socket.id);
    });
});
 
// WICHTIG FÜR RENDER: Nutzt den Port, den Render vorgibt
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});

