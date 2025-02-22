const socket = io();
let localStream;
let peerConnections = {};
let roomCode;
let recognition;

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        document.getElementById("localVideo").srcObject = stream;
        localStream = stream;
        startTranscription();
    })
    .catch(error => console.error("Error accessing media devices:", error));

// Start Speech Recognition
function startTranscription() {
    if (!("webkitSpeechRecognition" in window)) {
        alert("Your browser does not support Speech Recognition.");
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + " ";
        }
        document.getElementById("transcript").innerText = transcript;
        socket.emit("transcription", { roomCode, transcript });
    };

    recognition.start();
}

// Create a Room
function createRoom() {
    socket.emit("create-room");
}

// Receive the Room Code
socket.on("room-created", (code) => {
    roomCode = code;
    document.getElementById("roomInput").value = roomCode;
    alert(`Room Created! Share this code: ${roomCode}`);
});

// Join a Room
function joinRoom() {
    roomCode = document.getElementById("roomInput").value;
    if (roomCode) {
        socket.emit("join-room", roomCode);
    }
}

// Setup Peer Connection
function setupPeer(socketId, initiator) {
    const peer = new SimplePeer({
        initiator,
        trickle: false,
        stream: localStream
    });

    peer.on("signal", (signal) => {
        socket.emit(initiator ? "offer" : "answer", { roomCode, signal });
    });

    peer.on("stream", (stream) => {
        let videoElement = document.createElement("video");
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.classList.add("remoteVideo");
        document.getElementById("videoContainer").appendChild(videoElement);
    });

    peerConnections[socketId] = peer;
}

// Handle Room Joined Event
socket.on("room-joined", (code) => {
    roomCode = code;
    setupPeer(socket.id, true);
});

// Handle Offer & Answer
socket.on("offer", ({ signal, from }) => {
    setupPeer(from, false);
    peerConnections[from].signal(signal);
});

socket.on("answer", ({ signal }) => {
    for (let id in peerConnections) {
        peerConnections[id].signal(signal);
    }
});

// Update Live Transcription
socket.on("transcription", ({ transcript }) => {
    document.getElementById("transcript").innerText = transcript;
});

// End Call
function endCall() {
    for (let id in peerConnections) {
        peerConnections[id].destroy();
    }

    if (recognition) recognition.stop();
    socket.emit("leave-room", roomCode);

    document.getElementById("localVideo").srcObject = null;
    document.getElementById("videoContainer").innerHTML = "";
}
