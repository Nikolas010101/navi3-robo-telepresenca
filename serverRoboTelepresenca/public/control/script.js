const state = {
        id: "",
        mic: false,
        video: false,
        volume: false,
        pan: 0,
        tilt: 0,
        fex: "N",
    },
    peerConnectionConfig = {
        iceServers: [{ urls: "stun:stun.stunprotocol.org:3478" }, { urls: "stun:stun.l.google.com:19302" }],
    },
    videoPlayer = document.querySelector("#video-player"),
    websocket = new WebSocket(`ws://${SERVER_IP}:3000`);

let localStream, peerConnection;

websocket.addEventListener("open", async (event) => {
    websocket.send(
        JSON.stringify({
            type: "messages",
            messages: ["fex", "pose", "id", "rtc", "interface_state"],
        })
    );
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

    localStream = stream;
    startConnection(true);
});

websocket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
        case "id":
            state.id = message.id;
            break;
        case "fex":
            state.fex = message.fex;
            updateFacialExpression(message);
            break;
        case "pose":
            state.pan = message.pan;
            state.tilt = message.tilt;
            updateButtons(message);
            break;
        case "interface_state":
            state.video = message.interfaceVideo;
            state.mic = message.interfaceAudio;
            updateButtons(message);
            break;
        case "rtc":
            if (!peerConnection) startConnection(false);
            const signal = message.data;
            if (signal.sdp) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type !== "offer") return;
                    peerConnection.createAnswer().then(createdDescription);
                });
            } else if (signal.ice) {
                peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
            }
            sendFrame();
            break;
    }
});

function startConnection(isCaller) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = (event) => {
        if (event.candidate != null) {
            websocket.send(JSON.stringify({ type: "rtc", data: { ice: event.candidate, id: state.id } }));
        }
    };
    peerConnection.ontrack = (event) => {
        videoPlayer.srcObject = event.streams[0];
    };

    for (const track of localStream.getTracks()) {
        peerConnection.addTrack(track, localStream);
    }

    if (isCaller) {
        peerConnection.createOffer().then(createdDescription);
    }
}

function createdDescription(description) {
    peerConnection.setLocalDescription(description).then(() => {
        websocket.send(
            JSON.stringify({
                type: "rtc",
                data: { sdp: peerConnection.localDescription, id: state.id },
            })
        );
    });
}

// Call buttons
const end = document.querySelector("#end");
end.addEventListener("change", () => (location.href = "/"));

const mic = document.querySelector("#mic");
mic.addEventListener("change", (event) => {
    state.mic = event.target.checked;
    localStream.getAudioTracks()[0].enabled = state.mic;
    sendInterfaceState();
});

const video = document.querySelector("#video");
video.addEventListener("change", (event) => {
    state.video = event.target.checked;
    sendInterfaceState();
});

const volume = document.querySelector("#volume");
volume.addEventListener("change", (event) => {
    state.volume = event.target.checked;
});

// Expression buttons
const expressionButtons = document.querySelectorAll('input[name="expression"]');
expressionButtons.forEach((button) => {
    button.addEventListener("change", () => {
        state.fex = button.value;
        sendFex();
    });
});

// Updates expression to the last value sent
function updateFacialExpression(message) {
    document.getElementById(message.fex).checked = true;
}

// Servo sliders
const sliders = document.querySelectorAll('input[type="range"]');

// Event listener changes slider labels visually
sliders.forEach((slider) => {
    slider.addEventListener("input", () => {
        const label = document.getElementById(`${slider.id}-label`);
        label.innerHTML = `${slider.value}°`;
        state[slider.id] = Number(slider.value);
        sendPose();
    });
});

// Update buttons with server state
function updateButtons(message) {
    if (message.type === "pose") {
        sliders.forEach((slider) => {
            slider.value = message[slider.id];
            document.getElementById(`${slider.id}-label`).innerHTML = `${slider.value}°`;
        });
    } else if (message.type === "interface_state") {
        video.checked = state.video;
        mic.checked = state.mic;
    }
}

async function sendPose() {
    websocket.send(
        JSON.stringify({
            type: "pose",
            pan: state.pan,
            tilt: state.tilt,
        })
    );
}

async function sendFex() {
    websocket.send(
        JSON.stringify({
            type: "fex",
            fex: state.fex,
        })
    );
}

async function sendInterfaceState() {
    websocket.send(
        JSON.stringify({
            type: "interface_state",
            interfaceAudio: state.mic,
            interfaceVideo: state.video,
        })
    );
}

async function sendFrame() {
    function arrayBufferToBase64(buffer) {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    let canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(function (blob) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const bytes = event.target.result;
            websocket.send(
                JSON.stringify({
                    type: "interface_video",
                    media: arrayBufferToBase64(bytes),
                })
            );
        };
        reader.readAsArrayBuffer(blob);
    });
}

setInterval(() => {
    if (videoPlayer.srcObject) {
        sendFrame();
    }
}, 250);
