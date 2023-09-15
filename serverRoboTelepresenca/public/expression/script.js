// ----Pre-requisitos----
// sudo apt-get install python3-pil python3-pil.imagetk
// sudo apt-get install python3-tk
// pip install tkvideoplayer

// --------Codigo--------
// Felicidade = F
// Neutro = N
// Duvida = D
// Surpresa = S

const IP = "ws://192.168.0.100:3000",
    AUDIOSOURCE = "http://192.168.0.102:8080/audio",
    ws = new WebSocket(IP),
    videoPlayer = document.querySelector("#video-player"),
    audioPlayer = document.querySelector("#audio-player"),
    audioToggle = document.querySelector("#audio-toggle"),
    state = {
        volume: false,
        prevExpression: "N",
    };

audioToggle.addEventListener("click", (toggle) => {
    state.volume = !state.volume;
    toggle.target.src = state.volume
        ? "/img/volume_off.svg"
        : "/img/volume_on.svg";
    if (state.volume) {
        if (audioPlayer.paused) {
            audioPlayer.src = AUDIOSOURCE;
            audioPlayer.play();
        }
        audioPlayer.volume = 1;
    } else {
        audioPlayer.volume = 0;
    }
});

let timeoutId = null;

ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "control") {
        if (message.fex != state.prevExpression) {
            if (timeoutId !== null && !videoPlayer.paused) {
                clearTimeout(timeoutId);
            }
            videoPlayer.src = `/videos/${state.prevExpression}${message.fex}.mp4`;
            console.log(state.prevExpression + message.fex);
            state.prevExpression = message.fex;
            videoPlayer.play();
            timeoutId = setTimeout(() => {
                videoPlayer.pause();
            }, 500);
        }
    }
});
