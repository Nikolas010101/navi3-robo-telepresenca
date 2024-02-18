import board, busio, adafruit_ads1x15.ads1115 as ADS
from threading import Thread
from time import sleep, time_ns
from json import load, loads, dumps
from controller import *
from websockets.sync.client import connect
from websockets.exceptions import InvalidURI, InvalidHandshake, ConnectionClosedError

# Load controller constants
with open("system_parameters/controller_pan.info", "r") as file:
    consts: dict = load(file)
    PAN_OUTPUT_COEFS = consts["output"]
    PAN_INPUT_COEFS = consts["input"]

with open("system_parameters/controller_tilt.info", "r") as file:
    consts: dict = load(file)
    TILT_OUTPUT_COEFS = consts["output"]
    TILT_INPUT_COEFS = consts["input"]

# Load server setup
with open("../../serverRoboTelepresenca/public/server_setup/setup.json", "r") as file:
    SETUP: dict = load(file)
    SERVER_IP: str = SETUP["SERVER_IP"]

err_pan = len(PAN_INPUT_COEFS) * [0]
u_pan = (len(PAN_OUTPUT_COEFS) + 1) * [0]

err_tilt = len(TILT_INPUT_COEFS) * [0]
u_tilt = (len(TILT_OUTPUT_COEFS) + 1) * [0]

pan = 1.5
tilt = 1.5

curr = 0
prev = 0

i2c = busio.I2C(board.SCL, board.SDA)
adc = ADS.ADS1115(i2c)


def listen() -> None:
    global pan, tilt
    while True:
        try:
            with connect(f"ws://{SERVER_IP}:3000") as websocket:
                websocket.send(dumps({"type": "messages", "messages": ["pose"]}))
                while True:
                    message = loads(websocket.recv())
                    pan = max(0, min(5, message["pan"] * ANGLE_CONSTANT))
                    tilt = max(0, min(5, message["tilt"] * ANGLE_CONSTANT))
        except (InvalidURI, OSError, InvalidHandshake, ConnectionClosedError) as e:
            print(f"Could not connect to server, error: {e}")
            sleep(2)


def main() -> None:
    global err_pan, u_pan, err_tilt, u_tilt, pan, tilt, curr, prev
    rpi = setup()

    while True:
        curr = time_ns()
        if curr - prev >= SAMPLING_INTERVAL:

            # Panoramic motor
            output_pan = analog_read(adc, PAN_READ_PIN) * VOLTAGE_CONSTANT

            # Update previous and current values
            err_pan.pop()
            err_pan.insert(0, pan - output_pan)

            u_pan.pop()
            u_pan.insert(
                0,
                control(PAN_INPUT_COEFS, PAN_OUTPUT_COEFS, err_pan, u_pan),
            )

            h_bridge_write(rpi, PIN_ONE, PIN_TWO, u_pan[0])

            # Tilt motor
            output_tilt = analog_read(adc, TILT_READ_PIN) * VOLTAGE_CONSTANT

            # Update previous and current values
            err_tilt.pop()
            err_tilt.insert(0, tilt - output_tilt)

            u_tilt.pop()
            u_tilt.insert(
                0,
                control(TILT_INPUT_COEFS, TILT_OUTPUT_COEFS, err_tilt, u_tilt),
            )

            h_bridge_write(rpi, PIN_THREE, PIN_FOUR, u_tilt[0])

            print(
                f"Pan: {output_pan / ANGLE_CONSTANT}, "
                f"Esforco Pan: {u_pan[0]}, "
                f"Erro Pan: {err_pan[0] / ANGLE_CONSTANT}\n"
                f"Tilt: {output_tilt / ANGLE_CONSTANT}, "
                f"Esforco Tilt: {u_tilt[0]}, "
                f"Erro Tilt: {err_tilt[0] / ANGLE_CONSTANT}\n\n"
            )

            prev = time_ns()


listen_thread = Thread(target=listen)
listen_thread.start()

main_thread = Thread(target=main)
main_thread.start()
