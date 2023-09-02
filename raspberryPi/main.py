import json, cv2, pyaudio, threading, pigpio as pio
from time import time
from websockets.sync.client import connect
from flask import Flask, Response

app = Flask(__name__)

### START AUDIO STREAMING BLOCK

FORMAT = pyaudio.paInt16
CHUNK = 1024
BPS = 16
CHANNELS = 1
RATE = 44100

audio_object = pyaudio.PyAudio()
stream = audio_object.open(
    format=FORMAT,
    channels=CHANNELS,
    rate=RATE,
    input=True,
    frames_per_buffer=CHUNK,
)


def gen_audio_header(sample_rate: int, bits_per_sample: int, channels: int) -> bytes:
    datasize: int = 2 * 10**9
    o: bytes = b"RIFF"  # (4byte) Marks file as RIFF
    o += (
        datasize + 36
    ).to_bytes(  # (4byte) File size in bytes excluding this and RIFF marker
        4, "little"
    )
    o += b"WAVE"  # (4byte) File type
    o += b"fmt "  # (4byte) Format Chunk Marker
    o += (16).to_bytes(4, "little")  # (4byte) Length of above format data
    o += (1).to_bytes(2, "little")  # (2byte) Format type (1 - PCM)
    o += (channels).to_bytes(2, "little")  # (2byte)
    o += (sample_rate).to_bytes(4, "little")  # (4byte)
    o += (sample_rate * channels * bits_per_sample // 8).to_bytes(
        4, "little"
    )  # (4byte)
    o += (channels * bits_per_sample // 8).to_bytes(2, "little")  # (2byte)
    o += (bits_per_sample).to_bytes(2, "little")  # (2byte)
    o += b"data"  # (4byte) Data Chunk Marker
    o += (datasize).to_bytes(4, "little")  # (4byte) Data size in bytes
    return o


@app.route("/audio")
def audio() -> Response:
    def stream_mic():
        wav_header = gen_audio_header(
            sample_rate=RATE, bits_per_sample=BPS, channels=CHANNELS
        )
        yield wav_header
        while True:
            data = stream.read(CHUNK)
            yield data

    return Response(response=stream_mic(), content_type="audio/wav")


### END AUDIO STREAMING BLOCK

### START VIDEO STREAMING BLOCK

cap = cv2.VideoCapture(0)
FPS = 60
INTERVAL = 1 / FPS  # s/frame
WIDTH, HEIGHT = 320, 240
cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)


@app.route("/video")
def video() -> Response:
    def stream_video():
        last = time()
        while True:
            current = time()
            if current - last >= INTERVAL:
                last = time()
                _, buffer = cap.read()
                _, jpeg_frame = cv2.imencode(".jpg", buffer)
                frame = jpeg_frame.tobytes()
                yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"

    return Response(
        response=stream_video(), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


### END VIDEO STREAMING BLOCK

## START SERVO CONTROL BLOCK

# pi = pio.pi()
PAN_PIN = 17
TILT_PIN = 2
MAX_ANGLE = 60


def get_pulsewidth_from_angle(angle: float) -> int:
    if angle > MAX_ANGLE:
        angle = MAX_ANGLE
    elif angle < -MAX_ANGLE:
        angle = -MAX_ANGLE
    return int(500 * angle / MAX_ANGLE) + 1500


def get_angle(period) -> float:
    return (period - 1500) * 180 / 1000


def move_servos(pan: int, tilt: int) -> None:
    pulsewidth_pan = get_pulsewidth_from_angle(pan)
    pulsewidth_tilt = get_pulsewidth_from_angle(tilt)

    # pi.set_servo_pulsewidth(PAN_PIN, period_pan)

    # pi.set_servo_pulsewidth(TILT_PIN, period_tilt)


def listen(websocket) -> None:
    while True:
        data = json.loads(websocket.recv())
        if data["type"] == "control":
            pan, tilt = data["pan"], data["tilt"]
            print(f"Pan: {pan}, Tilt: {tilt}")
            move_servos(pan, tilt)


### END SERVO CONTROL BLOCK

if __name__ == "__main__":
    with connect("ws://localhost:3000") as websocket:
        ws_thread = threading.Thread(target=listen, args=(websocket,))
        ws_thread.start()
        app.run(port=5050)
