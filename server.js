const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",  // Allow all origins (Update with specific domain if needed)
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;  // Use Railway's dynamic port

let rooms = {}; // Store room participants

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinRoom", (roomCode, userName) => {
        socket.join(roomCode);
        if (!rooms[roomCode]) rooms[roomCode] = [];

        // Add user to the room
        rooms[roomCode].push({ id: socket.id, userName });

        console.log(`${userName} joined room: ${roomCode}`);

        // Send updated room users list to everyone in the room
        io.to(roomCode).emit("userList", rooms[roomCode]);

        // Notify the new user about existing participants
        const otherUsers = rooms[roomCode].filter(user => user.id !== socket.id);
        socket.emit("existingUsers", otherUsers);
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
        let disconnectedUser = null;
        for (const roomCode in rooms) {
            const index = rooms[roomCode].findIndex(user => user.id === socket.id);
            if (index !== -1) {
                disconnectedUser = rooms[roomCode][index].userName;
                rooms[roomCode].splice(index, 1);
                
                // Notify remaining users about the disconnected user
                io.to(roomCode).emit("userDisconnected", socket.id);

                // Remove empty rooms
                if (rooms[roomCode].length === 0) delete rooms[roomCode];

                break;
            }
        }

        console.log(`User ${disconnectedUser || "Unknown"} disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
