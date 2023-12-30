// --------Codigo--------
// Felicidade = F
// Neutro = N
// Duvida = D
// Surpresa = S

const IP = `ws://${SERVER_IP}:3000`,
    ws = new WebSocket(IP),
    videoPlayer = document.querySelector("#video-player"),
    state = {
        volume: false,
        prevExpression: "N",
    };

ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "control") {
        if (message.fex != state.prevExpression) {
            videoPlayer.src = `/videos/cut/${state.prevExpression}${message.fex}.mp4`;
            console.log(state.prevExpression + message.fex);
            state.prevExpression = message.fex;
            videoPlayer.play();
        }
    }
});
