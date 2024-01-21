import json, cv2, pyaudio, base64, time
from threading import Thread
from websockets.sync.client import connect
from websockets.exceptions import InvalidURI, InvalidHandshake, ConnectionClosedError
from os.path import join, abspath

with open(
    abspath(join(__file__, "../../serverRoboTelepresenca/public/server_setup/setup.json")),
    "r",
) as file:
    SETUP: dict = json.load(file)
    SERVER_IP: str = SETUP["SERVER_IP"]
    CHUNK: int = SETUP["CHUNK"]
    BPS: int = SETUP["BPS"]
    CHANNELS: int = SETUP["CHANNELS"]
    RATE: int = SETUP["RATE"]


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
                    websocket.send(
                        json.dumps({"type": "interface_audio", "media": data})
                    )
        except (InvalidURI, OSError, InvalidHandshake, ConnectionClosedError) as e:
            print(f"Could not send audio to server, error: {e}")
            time.sleep(2)


### END AUDIO STREAMING BLOCK

### START VIDEO STREAMING BLOCK

cap = cv2.VideoCapture(0)
WIDTH, HEIGHT = 320, 240
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
                    websocket.send(
                        json.dumps({"type": "interface_video", "media": video})
                    )
                    cv2.waitKey(1)
        except (InvalidURI, OSError, InvalidHandshake, ConnectionClosedError) as e:
            print(f"Could not send frame to server, error: {e}")
            time.sleep(2)


### END VIDEO STREAMING BLOCK

video_thread = Thread(target=send_video)
video_thread.start()

audio_thread = Thread(target=send_audio)
audio_thread.start()
