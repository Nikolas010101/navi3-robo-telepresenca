import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import { v4 } from "uuid";
import { spawn } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const app = express();
const port = process.env.port || 3000;

// reads setup.json
const SETUP = JSON.parse(
    readFileSync(
        "/home/nikolas/Documents/GitHub/navi3-robo-telepresenca/serverRoboTelepresenca/public/server_setup/setup.json",
        "utf-8"
    )
);

// updates setup.js
writeFileSync(
    "/home/nikolas/Documents/GitHub/navi3-robo-telepresenca/serverRoboTelepresenca/public/frontend_setup/setup.js",
    Object.entries(SETUP).reduce(
        (acc, [k, v]) => acc + `const ${k} = "${v}"\n`,
        ""
    )
);

// Middleware
app.set("view engine", "ejs");
app.use([express.json(), express.static("public")]);

// Configuracao de servidor websocket na mesma porta do servidor web
const wsServer = new WebSocketServer({ noServer: true });

const server = app.listen(port);

// Handling de request do servidor soquete
wsServer.on("connection", function (connection) {
    const userId = v4();
    clients[userId] = connection;
    console.log("Server: Connection established");

    connection.on("close", () => handleDisconnect(userId));

    connection.on("message", function (message) {
        message = JSON.parse(message.toString());
        switch (message.type) {
            case "control":
                console.log(message);

                state.pan = message.pan;
                state.tilt = message.tilt;
                state.fex = message.fex;

                distributeData({
                    type: "control",
                    pan: state.pan,
                    tilt: state.tilt,
                    fex: state.fex,
                });
                break;
            case "fex":
                console.log(message);

                state.fex = message.fex === "ND" ? "N" : message.fex;

                distributeData({ type: "fex", fex: state.fex });
                break;
            case "interface_state":
                console.log(message);

                state.interfaceAudio = message.interfaceAudio;
                state.interfaceVideo = message.interfaceVideo;

                distributeData({
                    type: "interface_state",
                    interfaceAudio: state.interfaceAudio,
                    interfaceVideo: state.interfaceVideo,
                });
                break;
            case "interface_audio":
                if (state.interfaceAudio) {
                    distributeData(message);
                }
                break;
            case "interface_video":
                if (state.interfaceVideo) {
                    distributeData(message);
                }
                break;
            case "robot_audio":
            case "robot_video":
                distributeData(message);
                break;
            default:
                console.log(`Unsupported message type: ${message.type}`);
                break;
        }
    });
    distributeData({
        type: "control",
        pan: state.pan,
        tilt: state.tilt,
        fex: state.fex,
    });
    distributeData({
        type: "interface_state",
        interfaceAudio: state.interfaceAudio,
        interfaceVideo: state.interfaceVideo,
    });
});

// Mudanca de protocolo de http para ws
server.on("upgrade", (req, socket, head) => {
    wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit("connection", ws, req);
    });
});

// clients = todos usuarios conectados ao servidor ws
const clients = {};

// envia um arquivo json para todos os usuarios conectados ao servidor ws
function distributeData(json) {
    const data = JSON.stringify(json);
    Object.values(clients).forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

function handleDisconnect(userId) {
    console.log(`${userId} disconnected.`);
    delete clients[userId];
}

const state = {
    pan: 0,
    tilt: 0,
    fex: "N",
    interfaceAudio: false,
    interfaceVideo: false,
};

// GET

// Homepage
app.get("/", function (req, res) {
    res.render("pages/index");
});

// Pagina para controlar sistema embarcado
app.get("/control", function (req, res) {
    res.render("pages/control");
});

// Pagina para mostrar as expressões faciais
app.get("/expression", function (req, res) {
    res.render("pages/expression");
});

const expressionDetection = spawn("python3", [
    "/home/nikolas/Documents/GitHub/navi3-robo-telepresenca/serverRoboTelepresenca/expression_detection/expression_detection.py",
]);

const interfaceMedia = spawn("python3", [
    "/home/nikolas/Documents/GitHub/navi3-robo-telepresenca/interface_media/media.py",
]);

process.on("SIGINT", () => {
    console.log("Server is killing subprocesses before terminating");
    expressionDetection.kill();
    interfaceMedia.kill();
    process.exit();
});
