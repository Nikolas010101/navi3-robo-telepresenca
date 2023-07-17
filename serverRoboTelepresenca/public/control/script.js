// Create WebSocket connection
const ws = new WebSocket("ws://localhost:3000");

// Emotion buttons
const emotionButtons = document.querySelectorAll('input[name="emotion"]');
emotionButtons.forEach((button) => {
	button.addEventListener("change", () => fetch(`/api/fex/${button.value}`));
});

// Updates emotion to the last value sent
async function updateEmotion() {
	const currentEmotion = await fetch("/api/getEmotion").then((r) => r.json());
	document.getElementById(currentEmotion).checked = true;
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
	const currentPosition = await fetch("/api/getPosition").then((r) =>
		r.json()
	);
	sliders.forEach((slider) => {
		slider.value = currentPosition[slider.id];
		document.getElementById(
			`${slider.id}-label`
		).innerHTML = `${slider.value}°`;
	});
}

// Send servo position to server
async function sendPosition() {
	fetch("/api/setPosition", {
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

updateEmotion();
updateSliders();
