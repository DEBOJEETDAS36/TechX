const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // Serve static files

const rooms = {}; // Store users in rooms

io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    // Create a new room
    socket.on("create-room", () => {
        let roomCode = Math.random().toString(36).substring(2, 8); // Generate a random room code
        rooms[roomCode] = [socket.id]; 
        socket.join(roomCode);
        socket.emit("room-created", roomCode);
    });

    // Join an existing room
    socket.on("join-room", (roomCode) => {
        if (rooms[roomCode]) {
            rooms[roomCode].push(socket.id);
            socket.join(roomCode);
            io.to(roomCode).emit("room-joined", roomCode);
        } else {
            socket.emit("room-error", "Room not found");
        }
    });

    // Handle WebRTC signaling
    socket.on("offer", ({ roomCode, signal }) => {
        socket.to(roomCode).emit("offer", { signal, from: socket.id });
    });

    socket.on("answer", ({ roomCode, signal }) => {
        socket.to(roomCode).emit("answer", { signal });
    });

    socket.on("transcription", ({ roomCode, transcript }) => {
        socket.to(roomCode).emit("transcription", { transcript });
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
        for (const room in rooms) {
            rooms[room] = rooms[room].filter(id => id !== socket.id);
            if (rooms[room].length === 0) {
                delete rooms[room];
            }
        }
    });

    // Handle end call
    socket.on("leave-room", (roomCode) => {
        socket.leave(roomCode);
        io.to(roomCode).emit("user-left");
    });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
