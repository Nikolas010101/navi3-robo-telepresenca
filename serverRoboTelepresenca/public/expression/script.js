// ----Pre-requisitos----
// sudo apt-get install python3-pil python3-pil.imagetk
// sudo apt-get install python3-tk
// pip install tkvideoplayer

// --------Codigo--------
// Felicidade = F
// Neutro = N
// Duvida = D
// Surpresa = S

const IP = "ws://localhost:3000",
	ws = new WebSocket(IP),
	videoPlayer = document.querySelector("#video-player");

let prevExpression = "N";

ws.addEventListener("message", (event) => {
	const data = JSON.parse(event.data);
	if (data.type === "control") {
		if (data.fex != prevExpression) {
			videoPlayer.src = `/videos/${prevExpression}${data.fex}.mp4`;
			console.log(`${prevExpression}${data.fex}`);
			videoPlayer.play();
			prevExpression = data.fex;
		}
	}
});
