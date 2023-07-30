const state = {
	mic: false,
	video: false,
	volume: false,
};

// Audio and video players
const audioPlayer = document.querySelector("#audio-player"),
	audioContext = new AudioContext(),
	videoPlayer = document.querySelector("#video-player"),
	websocket = new WebSocket("ws://localhost:3000");

let audioBuffer = null,
	audioChunks = [];

websocket.addEventListener("message", (event) => {
	const message = JSON.parse(event.data);
	switch (message.type) {
		case "audio":
			if (state.volume) {
				handleAudioData(base64ToArrayBuffer(message.media));
			}
			break;
		case "video":
			const videoBlob = base64ToBlob(message.media);
			const frameURL = URL.createObjectURL(videoBlob);
			videoPlayer.src = frameURL;
			videoPlayer.alt = "Telepresence robot camera";
			break;
		default:
			break;
	}
});

function handleAudioData(chunk) {
	audioChunks.push(chunk);
	if (!audioBuffer) {
		decodeAndPlayAudio();
	}
}

async function decodeAndPlayAudio() {
	try {
		await audioContext.resume();
		const concatenatedChunks = concatBuffers(audioChunks);
		audioChunks = [];

		audioBuffer = await audioContext.decodeAudioData(concatenatedChunks);

		const source = audioContext.createBufferSource();
		source.buffer = audioBuffer;

		source.connect(audioContext.destination);

		source.onended = () => {
			audioBuffer = null;
			if (audioChunks.length) {
				decodeAndPlayAudio();
			}
		};

		source.start();
	} catch (error) {
		console.error("Error decoding audio data:", error);
	}
}

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

function base64ToArrayBuffer(base64String) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, "+")
		.replace(/_/g, "/");
	const binaryString = window.atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

function concatBuffers(buffers) {
	const totalLength = buffers.reduce(
		(acc, buffer) => acc + buffer.byteLength,
		0
	);
	const concatenated = new Uint8Array(totalLength);
	let offset = 0;
	buffers.forEach((buffer) => {
		concatenated.set(new Uint8Array(buffer), offset);
		offset += buffer.byteLength;
	});
	return concatenated.buffer;
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
volume.addEventListener("change", (event) => {
	state.volume = event.target.checked;
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
