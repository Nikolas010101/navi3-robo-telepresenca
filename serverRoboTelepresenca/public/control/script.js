const AUDIOSOURCE = "http://192.168.0.102:5050/audio";

const state = {
	mic: false,
	video: false,
	volume: false,
	pan: 0,
	tilt: 0,
	fex: "N",
};

// Audio and video players
const audioPlayer = document.querySelector("#audio-player"),
	videoPlayer = document.querySelector("#video-player"),
	websocket = new WebSocket("ws://192.168.0.100:3000");

websocket.addEventListener("message", (event) => {
	const message = JSON.parse(event.data);
	if (message.type === "control") {
		state.pan = message.pan;
		state.tilt = message.tilt;
		state.fex = message.fex;
		updateFacialExpression(message);
		updateSliders(message);
	}
});

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
