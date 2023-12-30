const state = {
    mic: false,
    video: false,
    volume: false,
    pan: 0,
    tilt: 0,
    fex: "N",
};

// Audio and video players
const videoPlayer = document.querySelector("#video-player"),
    websocket = new WebSocket(`ws://${SERVER_IP}:3000`);

websocket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
        case "control":
            state.pan = message.pan;
            state.tilt = message.tilt;
            state.fex = message.fex;
            updateFacialExpression(message);
            updateSliders(message);
            break;
        case "robot_video":
            const videoBlob = base64ToBlob(message.media);
            const frameURL = URL.createObjectURL(videoBlob);
            videoPlayer.src = frameURL;
            break;
    }
});

function base64ToBlob(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");
    const binaryString = window.atob(base64);
    const byteArrays = [];
    for (let i = 0; i < binaryString.length; i++) {
        byteArrays.push(binaryString.charCodeAt(i));
    }
    const byteArray = new Uint8Array(byteArrays);
    return new Blob([byteArray]);
}

// Call buttons
const end = document.querySelector("#end");
end.addEventListener("change", () => (location.href = "/"));

const mic = document.querySelector("#mic");
mic.addEventListener("change", (event) => {
    state.mic = event.target.checked;
});

const video = document.querySelector("#video");
video.addEventListener("change", (event) => {
    state.video = event.target.checked;
});

const volume = document.querySelector("#volume");

// Expression buttons
const expressionButtons = document.querySelectorAll('input[name="expression"]');
expressionButtons.forEach((button) => {
    button.addEventListener("change", () => {
        state.fex = button.value;
        sendControl();
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
        sendControl();
    });
});

// Update sliders with last value sent
function updateSliders(message) {
    sliders.forEach((slider) => {
        slider.value = message[slider.id];
        document.getElementById(
            `${slider.id}-label`
        ).innerHTML = `${slider.value}°`;
    });
}

async function sendControl() {
    websocket.send(
        JSON.stringify({
            type: "control",
            pan: state.pan,
            tilt: state.tilt,
            fex: state.fex,
        })
    );
}
