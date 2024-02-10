# navi3-robo-telepresenca

## How to start the server/robot?

### On the server side

-   Change directory to "serverRoboTelepresenca" and install requirements.txt

```
pip install -r requirements.txt
```
-   Install node dependencies, on /serverRoboTelepresenca
```
npm i
```
-   Start server
```
npm start
```

### On the robot/raspberry side

-   Change directory to "raspberryPi" and install requirements.txt

```
pip install -r requirements.txt
```

-   Run (you just have to do this the first time)

```
sudo systemctl enable pigpiod;

```

-   Run main.py
```
python3 main.py
```