# navi3-robo-telepresenca

## How to start the server/robot?

### On the server side

-   Install python dependencies, opencv, pyaudio, websockets, numpy and mediapipe
-   Update "local_checkpoint_path", "local_prototxt_path" and "local_ssd_checkpoint_path" file paths on "__init__.py" file to match the folder where "expression_detection.py" is saved from the RMN module (these files will be installed the first time you run expression_detection.py)
-   Install node dependencies, run "npm i" on serverRoboTelepresenca/
-   Start server with npm start

### On the robot/raspberry side

-   Run main.py
