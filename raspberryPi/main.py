"""
----Pre-requisitos----
sudo apt-get install python3-pil python3-pil.imagetk
sudo apt-get install python3-tk
pip install tkvideoplayer

--------Codigo--------
Felicidade = F
Neutro = N
Duvida = D
Surpresa = S
"""

from websockets.sync.client import connect
import json, cv2, base64, pyaudio, wave, threading

CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
AUDIO_FILE = "audio.wav"

audio = pyaudio.PyAudio()
stream = audio.open(
    format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK
)
wf = wave.open(AUDIO_FILE, "wb")
wf.setnchannels(CHANNELS)
wf.setsampwidth(audio.get_sample_size(FORMAT))
wf.setframerate(RATE)
cap = cv2.VideoCapture(0)


def move_servos(pan: int | None, tilt: int | None) -> None:
    # TODO
    pass


def listen(websocket) -> None:
    while True:
        received_data = json.loads(websocket.recv())
        move_servos(received_data.get("pan", None), received_data("tilt", None))


def capture_media(websocket) -> None:
    while True:
        # Capture video
        ret, frame = cap.read()
        if not ret or (cv2.waitKey(1) & 0xFF == ord("q")):
            break
        _, video_buffer = cv2.imencode(".jpg", frame)

        # Capture audio
        audio_buffer = stream.read(CHUNK)
        wf.writeframes(audio_buffer)

        # Send data
        data = {
            "audio": base64.b64encode(audio_buffer).decode("utf-8"),
            "video": base64.b64encode(video_buffer).decode("utf-8"),
        }
        websocket.send(json.dumps(data))


if __name__ == "__main__":
    with connect("ws://localhost:3000") as websocket:
        listen_thread = threading.Thread(target=listen, args=(websocket,))
        listen_thread.start()
        capture_media(websocket)
