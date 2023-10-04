# navi3-robo-telepresenca

## How to start the server/robot?

### On the server side

-   Change directory into interfaceMedia
-   Run media.py (argument is your computer's ip, dependencies are opencv, pyaudio and flask)

-   With media.py still running:

    -   Open another terminal window and change directory into /serverRoboTelepresenca

    -   Update the path of haarcascade_frontalface_default.xml in expression_detection.py to match yours
    -   Run expression_detection.py (dependencies are opencv, numpy, and rmn/pytorch)
    -   This will download model files into the current working directory
    -   You can close media.py and expression_detection.py after the files are downloaded

-   Move the 3 created/downloaded files to the root /serverRoboTelepresenca directory
-   Update the file on serverRoboTelepresenca/public/frontend_setup/
-   Update the file on serverRoboTelepresenca/public/server_setup/
-   Change directory to serverRoboTelepresenca
-   Run npm i to install node dependencies
-   Run npm start
-   The subprocesses might not start depending on your system, in this case change "python3" to "python" in index.js
-   Server should take a while to start

### On the robot/raspberry side

-   Change directory to raspberryPi
-   Update the IPs on the main.py file
-   Run main.py (make sure server is running, otherwise one of the threads will crash)
-   To access the current facial expression open http://{SERVERIP}:3000/expression