import express from "express";
import {WebSocket, WebSocketServer} from "ws";
import {v4} from "uuid";

const app = express();
const port = process.env.port || 3000;

app.set("view engine", "ejs");
app.use(express.json());

const wsServer = new WebSocketServer({noServer: true});
const server = app.listen(port);

wsServer.on("connection", function (connection) {
    const userId = v4();
    console.log("Received message");
    clients[userId] = connection;

    connection.on("close", () => handleDisconnect(userId));

    connection.on("message", function (message) {
        message = message.toString();
        console.log(message);
        connection.send("Server: Connection established");
    })
});

server.on("upgrade", (req, socket, head) => {
    wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit("connection", ws, req);
    });
});

const clients = {};
let editorContent = null;

const typesDef = {
    USER_EVENT: "userevent",
    CONTENT_CHANGE: "contentchange"
};

function sendFex(json) {
    const data = JSON.stringify(json);
    for (let userId in clients) {
        let client = clients[userId];
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    }
}

function handleDisconnect(userId) {
    console.log(`${userId} disconnected.`);
    delete clients[userId];
}

app.get("/", function (req, res) {
    res.render("pages/index");
});
