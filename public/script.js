const socket = io(http://techx-production.up.railway.app);
let localStream, peerConnection, otherUserId;
const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let userName;
let roomCode;

async function createRoom() {
    userName = document.getElementById("userName").value;
    roomCode = Math.random().toString(36).substring(2, 8);
    document.getElementById("roomDisplay").textContent = roomCode;
    document.getElementById("home").style.display = "none";
    document.getElementById("videoContainer").style.display = "block";
    await startCall();
    socket.emit("joinRoom", roomCode, userName);
    startSpeechRecognition();
}

async function joinRoom() {
    userName = document.getElementById("userName").value;
    roomCode = document.getElementById("roomCodeInput").value;
    document.getElementById("roomDisplay").textContent = roomCode;
    document.getElementById("home").style.display = "none";
    document.getElementById("videoContainer").style.display = "block";
    await startCall();
    socket.emit("joinRoom", roomCode, userName);
    startSpeechRecognition();
}

async function startCall() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = localStream;

    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        document.getElementById("remoteVideo").srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) socket.emit("iceCandidate", event.candidate, otherUserId);
    };
}

socket.on("userJoined", async (userId) => {
    otherUserId = userId;
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, otherUserId);
});

socket.on("offer", async (offer, fromUser) => {
    otherUserId = fromUser;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, otherUserId);
});

socket.on("answer", (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("iceCandidate", (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

// Speech Recognition Function
function startSpeechRecognition() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript;
            }
        }

        if (transcript) {
            socket.emit("transcription", { name: userName, text: transcript, room: roomCode });
        }
    };

    recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    recognition.start();
}

// Display Transcription Below Videos
socket.on("displayText", (data) => {
    const transcriptions = document.getElementById("transcriptions");
    const p = document.createElement("p");
    p.innerHTML = `<strong>${data.name}:</strong> ${data.text}`;
    
    transcriptions.appendChild(p);
    transcriptions.scrollTop = transcriptions.scrollHeight; // Auto-scroll
});

// End Call
function endCall() {
    window.location.reload();
}
