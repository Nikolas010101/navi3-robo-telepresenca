const state = {
        mic: false,
        video: false,
        volume: false,
        pan: 0,
        tilt: 0,
        fex: "N",
    },
    header = genAudioHeader(Number(RATE), Number(BPS), Number(CHANNELS)),
    videoPlayer = document.querySelector("#video-player"),
    websocket = new WebSocket(`ws://${SERVER_IP}:3000`);

let audioContext = null,
    gainNode = null;

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
        case "robot_audio":
            if (audioContext !== null) {
                const binaryData = atob(message.media);
                const arrayBuffer = new ArrayBuffer(binaryData.length);
                const view = new Uint8Array(arrayBuffer);
                for (let i = 0; i < binaryData.length; i++) {
                    view[i] = binaryData.charCodeAt(i);
                }
                const totalBuffer = new Uint8Array(header.length + view.length);
                totalBuffer.set(header);
                totalBuffer.set(view, header.length);
                audioContext.decodeAudioData(totalBuffer.buffer, (buffer) => {
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;

                    source.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    source.start();
                });
            }
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

function genAudioHeader(sampleRate, bitsPerSample, channels) {
    function concatArrays(arr1, arr2) {
        const result = new Uint8Array(arr1.length + arr2.length);
        result.set(arr1);
        result.set(arr2, arr1.length);
        return result;
    }

    function stringToUint8Array(str) {
        const result = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            result[i] = str.charCodeAt(i);
        }
        return result;
    }

    function int16ToLittleEndianArray(value) {
        const result = new Uint8Array(2);
        result[0] = value & 0xff;
        result[1] = (value >> 8) & 0xff;
        return result;
    }

    function int32ToLittleEndianArray(value) {
        const result = new Uint8Array(4);
        result[0] = value & 0xff;
        result[1] = (value >> 8) & 0xff;
        result[2] = (value >> 16) & 0xff;
        result[3] = (value >> 24) & 0xff;
        return result;
    }

    const datasize = 2 * Math.pow(10, 9);
    let o = new Uint8Array(0);

    // RIFF Header
    o = concatArrays(o, stringToUint8Array("RIFF"));
    o = concatArrays(o, int32ToLittleEndianArray(datasize + 36));
    o = concatArrays(o, stringToUint8Array("WAVE"));

    // Format Chunk
    o = concatArrays(o, stringToUint8Array("fmt "));
    o = concatArrays(o, int32ToLittleEndianArray(16));
    o = concatArrays(o, int16ToLittleEndianArray(1)); // Format type (1 - PCM)
    o = concatArrays(o, int16ToLittleEndianArray(channels));
    o = concatArrays(o, int32ToLittleEndianArray(sampleRate));
    o = concatArrays(
        o,
        int32ToLittleEndianArray((sampleRate * channels * bitsPerSample) / 8)
    );
    o = concatArrays(
        o,
        int16ToLittleEndianArray((channels * bitsPerSample) / 8)
    );
    o = concatArrays(o, int16ToLittleEndianArray(bitsPerSample));

    // Data Chunk
    o = concatArrays(o, stringToUint8Array("data"));
    o = concatArrays(o, int32ToLittleEndianArray(datasize));

    return o;
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

const audio = document.querySelector("#volume");
audio.addEventListener("change", (event) => {
    if (audioContext === null) {
        audioContext = new AudioContext();
        gainNode = audioContext.createGain();
    }
    state.volume = event.target.checked;
    audioContext.mute = state.volume;
    gainNode.gain.value = state.volume ? 1 : 0;
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
