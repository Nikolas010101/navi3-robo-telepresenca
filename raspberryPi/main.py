import json, cv2, base64, pyaudio, wave, threading, os
from time import time
from websockets.sync.client import connect

# Audio constants
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
AUDIO_FILE = "temp.wav"
audio = pyaudio.PyAudio()
stream = audio.open(
    format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK
)
SAMPLE_WIDTH = audio.get_sample_size(FORMAT)
# Video constants
FPS = 60
INTERVAL = 1 / FPS  # s/frame
cap = cv2.VideoCapture(0)


def move_servos(pan: int, tilt: int) -> None:
    # TODO
    pass


def listen(websocket) -> None:
    while True:
        data = json.loads(websocket.recv())
        if data["type"] == "control":
            pan, tilt = data["pan"], data["tilt"]
            print(f"Pan: {pan}, Tilt: {tilt}")
            move_servos(pan, tilt)


def capture_media(websocket) -> None:
    last_frame_time = time()
    while True:
        current_time = time()
        elapsed_time = current_time - last_frame_time
        if elapsed_time >= INTERVAL:
            # Capture video
            ret, frame = cap.read()
            if not ret:
                break
            _, video_buffer = cv2.imencode(".jpg", frame)
            video = base64.b64encode(video_buffer).decode("utf-8")

            # Capture audio
            audio_buffer = stream.read(CHUNK)
            with wave.open(AUDIO_FILE, "wb") as wf:
                wf.setnchannels(CHANNELS)
                wf.setsampwidth(SAMPLE_WIDTH)
                wf.setframerate(RATE)
                wf.writeframes(audio_buffer)

            with open(AUDIO_FILE, "rb") as file:
                audio = base64.b64encode(file.read()).decode("utf-8")

            # Send data
            data = json.dumps({"type": "media", "audio": audio, "video": video})

            websocket.send(data)

        cv2.waitKey(1)


if __name__ == "__main__":
    try:
        with connect("ws://localhost:3000") as websocket:
            media_thread = threading.Thread(target=capture_media, args=(websocket,))
            media_thread.start()
            listen(websocket)
    finally:
        os.remove(AUDIO_FILE)
