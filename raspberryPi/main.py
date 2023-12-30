import json, cv2, pyaudio, pigpio as pio, base64, time
from threading import Thread
from websockets.sync.client import connect
from websockets.exceptions import InvalidURI, InvalidHandshake, ConnectionClosedError


with open(
    "/home/nikolas/Documents/GitHub/navi3-robo-telepresenca/serverRoboTelepresenca/public/server_setup/setup.json",
    "r",
) as file:
    setup: dict = json.load(file)
    SERVER_IP: str = setup["SERVER_IP"]


### START AUDIO STREAMING BLOCK

# FORMAT = pyaudio.paInt16
# CHUNK = 1024
# BPS = 16
# CHANNELS = 1
# RATE = 44100

# audio_object = pyaudio.PyAudio()
# stream = audio_object.open(
#     format=FORMAT,
#     channels=CHANNELS,
#     rate=RATE,
#     input=True,
#     frames_per_buffer=CHUNK,
# )


# def gen_audio_header(sample_rate: int, bits_per_sample: int, channels: int) -> bytes:
#     datasize: int = 2 * 10**9
#     o: bytes = b"RIFF"  # (4byte) Marks file as RIFF
#     o += (
#         datasize + 36
#     ).to_bytes(  # (4byte) File size in bytes excluding this and RIFF marker
#         4, "little"
#     )
#     o += b"WAVE"  # (4byte) File type
#     o += b"fmt "  # (4byte) Format Chunk Marker
#     o += (16).to_bytes(4, "little")  # (4byte) Length of above format data
#     o += (1).to_bytes(2, "little")  # (2byte) Format type (1 - PCM)
#     o += (channels).to_bytes(2, "little")  # (2byte)
#     o += (sample_rate).to_bytes(4, "little")  # (4byte)
#     o += (sample_rate * channels * bits_per_sample // 8).to_bytes(
#         4, "little"
#     )  # (4byte)
#     o += (channels * bits_per_sample // 8).to_bytes(2, "little")  # (2byte)
#     o += (bits_per_sample).to_bytes(2, "little")  # (2byte)
#     o += b"data"  # (4byte) Data Chunk Marker
#     o += (datasize).to_bytes(4, "little")  # (4byte) Data size in bytes
#     return o


# @app.route("/audio")
# def audio() -> Response:
#     def stream_mic():
#         wav_header = gen_audio_header(
#             sample_rate=RATE, bits_per_sample=BPS, channels=CHANNELS
#         )
#         yield wav_header
#         while True:
#             data = stream.read(CHUNK)
#             yield data

#     return Response(response=stream_mic(), content_type="audio/wav")


### END AUDIO STREAMING BLOCK

### START VIDEO STREAMING BLOCK

cap = cv2.VideoCapture(0)
FPS = 60
INTERVAL = 1 / FPS  # s/frame
WIDTH, HEIGHT = 320, 240
cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)


def send_video() -> None:
    while True:
        try:
            with connect(f"ws://{SERVER_IP}:3000") as websocket:
                while True:
                    # Capture video
                    ok, frame = cap.read()
                    if not ok:
                        continue

                    ok, video_buffer = cv2.imencode(".jpg", frame)
                    if not ok:
                        continue

                    video = base64.b64encode(video_buffer).decode("utf-8")

                    websocket.send(json.dumps({"type": "robot_video", "media": video}))

                    cv2.waitKey(1)
        except (InvalidURI, OSError, InvalidHandshake, ConnectionClosedError) as e:
            print(f"Could not send frame to server, error: {e}")
            time.sleep(2)


### END VIDEO STREAMING BLOCK

## START SERVO CONTROL BLOCK

pi = pio.pi()
PAN_PIN = 17
TILT_PIN = 2
MAX_ANGLE = 90


def get_pulsewidth_from_angle(angle: int) -> int:
    if angle > MAX_ANGLE:
        angle = MAX_ANGLE
    elif angle < -MAX_ANGLE:
        angle = -MAX_ANGLE
    return int(1000 * angle / MAX_ANGLE + 1500)


def move_servos(pan: int, tilt: int) -> None:
    pulsewidth_pan = get_pulsewidth_from_angle(pan)
    pulsewidth_tilt = get_pulsewidth_from_angle(tilt)

    pi.set_servo_pulsewidth(PAN_PIN, pulsewidth_pan)

    pi.set_servo_pulsewidth(TILT_PIN, pulsewidth_tilt)


def listen() -> None:
    while True:
        try:
            with connect(f"ws://{SERVER_IP}:3000") as websocket:
                while True:
                    data = json.loads(websocket.recv())
                    if data["type"] == "control":
                        pan, tilt = data["pan"], data["tilt"]
                        print(f"Pan: {pan}, Tilt: {tilt}")
                        move_servos(pan, tilt)
        except (InvalidURI, OSError, InvalidHandshake, ConnectionClosedError) as e:
            print(f"Could not connect to server, error: {e}")
            time.sleep(2)


### END SERVO CONTROL BLOCK
listen_thread = Thread(target=listen)
listen_thread.start()

video_thread = Thread(target=send_video)
video_thread.start()
