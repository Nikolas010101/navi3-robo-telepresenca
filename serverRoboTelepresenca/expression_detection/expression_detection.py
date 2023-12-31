import cv2, numpy as np, json, time, base64
from websockets.sync.client import connect
from websockets.exceptions import InvalidURI, InvalidHandshake, ConnectionClosedError
from rmn import RMN

FACE_DETECTOR_PATH = "/home/nikolas/Documents/GitHub/navi3-robo-telepresenca/serverRoboTelepresenca/expression_detection/haarcascade_frontalface_default.xml"

with open(
    "/home/nikolas/Documents/GitHub/navi3-robo-telepresenca/serverRoboTelepresenca/public/server_setup/setup.json",
    "r",
) as file:
    setup: dict = json.load(file)
    SERVER_IP: str = setup["SERVER_IP"]
    INTERVAL: int = setup["INTERVAL"]

face_detector = cv2.CascadeClassifier(FACE_DETECTOR_PATH)
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

prev = time.time()
while True:
    try:
        with connect(f"ws://{SERVER_IP}:3000") as websocket:
            while True:
                message = json.loads(websocket.recv())
                curr = time.time()
                if message["type"] == "interface_video" and curr - prev >= INTERVAL:
                    encoded_data = message["media"]
                    image = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
                    colored = cv2.imdecode(image, cv2.IMREAD_COLOR)

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
                    prev = time.time()

    except (InvalidURI, OSError, InvalidHandshake, ConnectionClosedError) as e:
        print(f"Could not connect to server, error: {e}")
        time.sleep(2)
