const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

let rooms = {}; // Store room participants

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinRoom", (roomCode, userName) => {
        socket.join(roomCode);
        if (!rooms[roomCode]) rooms[roomCode] = [];
        rooms[roomCode].push({ id: socket.id, userName });

        // Notify existing users in the room
        if (rooms[roomCode].length > 1) {
            const otherUser = rooms[roomCode].find(user => user.id !== socket.id);
            socket.emit("userJoined", otherUser.id);
        }
    });

    socket.on("offer", (offer, toUser) => {
        io.to(toUser).emit("offer", offer, socket.id);
    });

    socket.on("answer", (answer, toUser) => {
        io.to(toUser).emit("answer", answer);
    });

    socket.on("iceCandidate", (candidate, toUser) => {
        io.to(toUser).emit("iceCandidate", candidate);
    });

    socket.on("transcription", (data) => {
        io.to(data.room).emit("displayText", { name: data.name, text: data.text });
    });

    socket.on("disconnect", () => {
        for (const roomCode in rooms) {
            rooms[roomCode] = rooms[roomCode].filter(user => user.id !== socket.id);
            if (rooms[roomCode].length === 0) delete rooms[roomCode];
        }
    });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
