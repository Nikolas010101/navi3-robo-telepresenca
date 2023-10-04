import cv2, numpy as np, urllib.request as urllib, json, sys
from rmn import RMN
from time import sleep

FACEDETECTORPATH = "/home/nikolas/GitHub/navi3-robo-telepresenca/serverRoboTelepresenca/expression_detection/haarcascade_frontalface_default.xml"
INTERFACEIP = sys.argv[1]
INTERVAL = float(sys.argv[2])

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
INTERFACE_VIDEO = f"http://{INTERFACEIP}:8080/video"

while True:
    try:
        with urllib.urlopen(INTERFACE_VIDEO) as resp:
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
        center = x + w / 2, y + h / 2
        print(
            json.dumps(
                {
                    "type": "face_data",
                    "face_x": center[0],
                    "face_y": center[1],
                    "fex": FEX_MAP[detectedFex[0]],
                }
            ),
            flush=True,
        )
        sleep(INTERVAL)
    except:
        continue
