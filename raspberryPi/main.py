import json, pigpio as pio, time
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
                websocket.send(json.dumps({"type": "messages", "messages": ["pose"]}))
                while True:
                    data = json.loads(websocket.recv())
                    pan, tilt = data["pan"], data["tilt"]
                    print(f"Pan: {pan}, Tilt: {tilt}")
                    move_servos(pan, tilt)
        except (InvalidURI, OSError, InvalidHandshake, ConnectionClosedError) as e:
            print(f"Could not connect to server, error: {e}")
            time.sleep(2)


listen_thread = Thread(target=listen)
listen_thread.start()
