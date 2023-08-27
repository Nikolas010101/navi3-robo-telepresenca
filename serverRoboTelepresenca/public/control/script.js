const AUDIOSOURCE = "http://localhost:8080/audio";

const state = {
	mic: false,
	video: false,
	volume: false,
};

// Audio and video players
const audioPlayer = document.querySelector("#audio-player"),
	videoPlayer = document.querySelector("#video-player"),
	websocket = new WebSocket("ws://localhost:3000");

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
volume.addEventListener("change", (event) => {
	state.volume = event.target.checked;
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

// Expression buttons
const expressionButtons = document.querySelectorAll('input[name="expression"]');
expressionButtons.forEach((button) => {
	button.addEventListener("change", () =>
		fetch(`/api/fex`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ fex: button.value }),
		})
	);
});

// Updates expression to the last value sent
async function updateFacialExpression() {
	const expression = await fetch("/api/fex").then((r) => r.json());
	document.getElementById(expression.fex).checked = true;
}

// Servo sliders
const sliders = document.querySelectorAll('input[type="range"]');

// Event listener changes slider labels visually
sliders.forEach((slider) => {
	slider.addEventListener("input", () => {
		const label = document.getElementById(`${slider.id}-label`);
		label.innerHTML = `${slider.value}°`;
		sendPosition();
	});
});

const panSlider = document.getElementById("pan");
const panLabel = document.getElementById("pan-label");

const tiltSlider = document.getElementById("tilt");
const tiltLabel = document.getElementById("tilt-label");

// Update sliders with last value sent
async function updateSliders() {
	const position = await fetch("/api/servo").then((r) => r.json());
	sliders.forEach((slider) => {
		slider.value = position[slider.id];
		document.getElementById(
			`${slider.id}-label`
		).innerHTML = `${slider.value}°`;
	});
}

// Send servo position to server
async function sendPosition() {
	fetch("/api/servo", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({
			pan: Number(panSlider.value),
			tilt: Number(tiltSlider.value),
		}),
	});
}

updateFacialExpression();
updateSliders();
