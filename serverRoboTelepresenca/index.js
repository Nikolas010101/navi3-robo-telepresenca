import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import { v4 } from "uuid";
import { spawn } from "child_process";
import {
    INTERFACEMEDIAPATH,
    FEXDETECTIONPATH,
    INTERFACEIP,
    FEXINTERVAL,
} from "./public/server_setup/setup.js";

const app = express();
const port = process.env.port || 3000;

// Middleware
app.set("view engine", "ejs");
app.use([express.json(), express.static("public")]);

// Configuracao de servidor websocket na mesma porta do servidor web
const wsServer = new WebSocketServer({ noServer: true });
const interfaceMedia = spawn("python3", [INTERFACEMEDIAPATH, INTERFACEIP]);
interfaceMedia.on("error", (e) =>
    console.log("Error on interface_media subprocess")
);

const fexDetection = spawn("python3", [
    FEXDETECTIONPATH,
    INTERFACEIP,
    FEXINTERVAL,
]);
fexDetection.on("error", (e) =>
    console.log("Error on fex_detection subprocess")
);
fexDetection.stdout.on("data", (data) => {
    const message = JSON.parse(data.toString());

    console.log(message);

    state.fex = message.fex === "ND" ? "N" : message.fex;
    distributeData({ type: "control", ...state });
});
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

                distributeData({ type: "control", ...state });
                break;
            default:
                console.log(`Unsupported message type: ${message.type}`);
                break;
        }
    });
    distributeData({ type: "control", ...state });
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
