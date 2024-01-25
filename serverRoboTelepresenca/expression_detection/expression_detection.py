import cv2, numpy as np, json, time, base64
from websockets.sync.client import connect
from websockets.exceptions import InvalidURI, InvalidHandshake, ConnectionClosedError
from rmn import RMN
from mediapipe import solutions
from os.path import join, abspath

with open(
    abspath(join(__file__, "../../public/server_setup/setup.json")),
    "r",
) as file:
    SETUP: dict = json.load(file)
    SERVER_IP: str = SETUP["SERVER_IP"]
    INTERVAL: int = SETUP["INTERVAL"]
    WIDTH: int = SETUP["WIDTH"]
    HEIGHT: int = SETUP["HEIGHT"]
    FACE_DETECTOR_PATH: str = SETUP["FACE_DETECTOR_PATH"]


class Landmark:
    NOSE = 1
    LEFT_EYE = 33
    LEFT_MOUTH = 61
    CHIN = 199
    RIGHT_EYE = 263
    RIGHT_MOUTH = 291


mp_face_mesh = solutions.face_mesh
face_3d = np.array(
    [  # Posição aproximada dos pontos
        (0.0, 0.0, 0.0),  # NOSE
        (0.0, -200.0, -65.0),  # CHIN
        (-150.0, 170.0, -135.0),  # LEFT_EYE
        (150.0, 170.0, -135.0),  # RIGHT_EYE
        (-150.0, -150.0, -125.0),  # LEFT_MOUTH
        (150.0, -150.0, -125.0),  # RIGHT_MOUTH
    ],
    dtype=np.float64,
)

distortion_matrix = np.zeros((4, 1))  # No lens distortion
FOCAL_LENGTH = WIDTH
camera_matrix = np.array(
    [[FOCAL_LENGTH, 0, WIDTH / 2], [0, FOCAL_LENGTH, HEIGHT / 2], [0, 0, 1]],
    dtype=np.float64,
)

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
            websocket.send(
                json.dumps({"type": "messages", "messages": ["interface_video"]})
            )
            with mp_face_mesh.FaceMesh() as face_mesh:
                while True:
                    message = json.loads(websocket.recv())
                    curr = time.time()
                    if curr - prev >= INTERVAL:
                        encoded_data = message["media"]
                        image = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
                        colored = cv2.imdecode(image, cv2.IMREAD_COLOR)

                        # determine fex
                        gray_scale = cv2.cvtColor(colored, cv2.COLOR_BGR2GRAY)
                        faces = face_detector.detectMultiScale(
                            gray_scale, scaleFactor=1.1, minNeighbors=4
                        )
                        if not len(faces):
                            continue

                        x, y, w, h = faces[0]
                        cropped = colored[y : y + h, x : x + w]
                        detected_fex = rmn.detect_emotion_for_single_face_image(cropped)

                        # determine head pose
                        op = face_mesh.process(cv2.cvtColor(colored, cv2.COLOR_BGR2RGB))
                        face_2d = []
                        if op.multi_face_landmarks:
                            for landmarks in op.multi_face_landmarks:
                                for id, landmark in enumerate(landmarks.landmark):
                                    x, y = int(landmark.x * WIDTH), int(
                                        landmark.y * HEIGHT
                                    )

                                    face_2d.append((x, y))

                                projection = np.array(
                                    [
                                        face_2d[Landmark.NOSE],
                                        face_2d[Landmark.CHIN],
                                        face_2d[Landmark.LEFT_EYE],
                                        face_2d[Landmark.RIGHT_EYE],
                                        face_2d[Landmark.LEFT_MOUTH],
                                        face_2d[Landmark.RIGHT_MOUTH],
                                    ],
                                    dtype=np.float64,
                                )
                                success, rot_vec, trans_vec = cv2.solvePnP(
                                    face_3d,
                                    projection,
                                    camera_matrix,
                                    distortion_matrix,
                                )
                                rotation_matrix, jacobian = cv2.Rodrigues(rot_vec)
                                angles, mtxR, mtxQ, Qx, Qy, Qz = cv2.RQDecomp3x3(
                                    rotation_matrix
                                )
                                tilt = angles[0] - np.sign(angles[0]) * 180
                                pan = angles[1]
                                websocket.send(
                                    json.dumps(
                                        {
                                            "type": "control",
                                            "pan": int(pan),
                                            "tilt": 0,
                                            "fex": FEX_MAP[detected_fex[0]],
                                        }
                                    )
                                )
                                prev = time.time()
    except (InvalidURI, OSError, InvalidHandshake, ConnectionClosedError) as e:
        print(f"Could not connect to server, error: {e}")
        time.sleep(2)
