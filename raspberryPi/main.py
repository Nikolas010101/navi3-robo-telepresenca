import json, cv2, pyaudio, pigpio as pio, base64, time
from threading import Thread
from websockets.sync.client import connect
from websockets.exceptions import InvalidURI, InvalidHandshake, ConnectionClosedError
from os.path import join, abspath

with open(
    abspath(
        join(__file__, "../../serverRoboTelepresenca/public/server_setup/setup.json")
    ),
    "r",
) as file:
    SETUP: dict = json.load(file)
    SERVER_IP: str = SETUP["SERVER_IP"]
    CHUNK: int = SETUP["CHUNK"]
    BPS: int = SETUP["BPS"]
    CHANNELS: int = SETUP["CHANNELS"]
    RATE: int = SETUP["RATE"]
    WIDTH: int = SETUP["WIDTH"]
    HEIGHT: int = SETUP["HEIGHT"]

### START AUDIO STREAMING BLOCK

FORMAT = pyaudio.paInt16
audio_object = pyaudio.PyAudio()
stream = audio_object.open(
    format=FORMAT,
    channels=CHANNELS,
    rate=RATE,
    input=True,
    frames_per_buffer=CHUNK,
)


def send_audio() -> None:
    while True:
        try:
            with connect(f"ws://{SERVER_IP}:3000") as websocket:
                while True:
                    data = base64.b64encode(stream.read(CHUNK)).decode("utf-8")
                    websocket.send(json.dumps({"type": "robot_audio", "media": data}))
        except (InvalidURI, OSError, InvalidHandshake, ConnectionClosedError) as e:
            print(f"Could not send audio to server, error: {e}")
            time.sleep(2)


### END AUDIO STREAMING BLOCK

### START VIDEO STREAMING BLOCK

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)


def send_video() -> None:
    while True:
        try:
            with connect(f"ws://{SERVER_IP}:3000") as websocket:
                while True:
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
TILT_PIN = 27
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
                websocket.send(
                    json.dumps({"type": "messages", "messages": ["pose"]})
                )
                while True:
                    data = json.loads(websocket.recv())
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

audio_thread = Thread(target=send_audio)
audio_thread.start()
