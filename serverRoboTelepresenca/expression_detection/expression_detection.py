import cv2, numpy as np, urllib.request as urllib, json, time
from urllib.error import URLError, HTTPError
from websockets.sync.client import connect
from websockets.exceptions import InvalidURI, InvalidHandshake, ConnectionClosedError
from rmn import RMN

FACEDETECTORPATH = "/home/nikolas/Documents/GitHub/navi3-robo-telepresenca/serverRoboTelepresenca/expression_detection/haarcascade_frontalface_default.xml"

with open(
    "/home/nikolas/Documents/GitHub/navi3-robo-telepresenca/serverRoboTelepresenca/public/server_setup/setup.json",
    "r",
) as file:
    setup: dict = json.load(file)
    INTERFACE_IP: str = setup["INTERFACE_IP"]
    SERVER_IP: str = setup["SERVER_IP"]

face_detector = cv2.CascadeClassifier(FACEDETECTORPATH)
rmn = RMN()

FEX_MAP = {
    "angry": "ND",
    "disgust": "ND",
    "fear": "ND",
    "happy": "F",
    "sad": "ND",
    "surprise": "S",
    "neutral": "N",
}

USER_VIDEO_URL = f"http://{INTERFACE_IP}:8080/video"

while True:
    try:
        with connect(f"ws://{SERVER_IP}:3000") as websocket:
            while True:
                try:
                    with urllib.urlopen(USER_VIDEO_URL) as resp:
                        img_array = np.asarray(bytearray(resp.read()), dtype=np.uint8)
                        colored = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

                    gray_scale = cv2.cvtColor(colored, cv2.COLOR_BGR2GRAY)
                    faces = face_detector.detectMultiScale(
                        gray_scale, scaleFactor=1.1, minNeighbors=4
                    )
                    if not len(faces):
                        continue

                    x, y, w, h = faces[0]
                    cropped = colored[y : y + h, x : x + w]
                    detectedFex = rmn.detect_emotion_for_single_face_image(cropped)
                    websocket.send(
                        json.dumps(
                            {
                                "type": "fex",
                                "fex": FEX_MAP[detectedFex[0]],
                            }
                        )
                    )
                except (URLError, HTTPError) as e:
                    print(f"Could not retrieve data from server, error: {e}")
                    continue
    except (InvalidURI, OSError, InvalidHandshake, ConnectionClosedError) as e:
        print(f"Could not connect to server, error: {e}")
        time.sleep(2)
