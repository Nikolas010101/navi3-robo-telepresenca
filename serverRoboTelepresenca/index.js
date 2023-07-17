import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import { v4 } from "uuid";
import os from "os";

const currentState = {
	currentPosition: {
		pan: 0,
		tilt: 0,
	},
	currentEmotion: "neutral",
};

const app = express();
const port = process.env.port || 3000;

// Printa o Endereço de IP do servidor + porta
var networkInterfaces = os.networkInterfaces();
const ip = "http://localhost";
console.log(`Server on: ${ip}:${port}`);

// Middleware
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.static("public"));

// Configuracao de servidor websocket na mesma porta do servidor web
const wsServer = new WebSocketServer({ noServer: true });
const server = app.listen(port);

// Handling de request do servidor soquete
wsServer.on("connection", function (connection) {
	const userId = v4();
	console.log("Received message");
	clients[userId] = connection;

	connection.on("close", () => handleDisconnect(userId));

	connection.on("message", function (message) {
		message = message.toString();
		console.log(message);
		connection.send("Server: Connection established");
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
let editorContent = null;

const typesDef = {
	USER_EVENT: "userevent",
	CONTENT_CHANGE: "contentchange",
};

// envia um arquivo json para todos os usuarios conectados ao servidor ws
function distributeData(json) {
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

// Template: const defaultList = [{fex:varchar, pan:int, tilt:int}];

// Homepage
app.get("/", function (req, res) {
	res.render("pages/index");
});

// Pagina para controlar sistema embarcado
app.get("/control", function (req, res) {
	res.render("pages/control");
});

// Endpoint que retorna o último valor recebido de posição
app.get("/api/getPosition", (req, res) => {
	res.json(currentState.currentPosition);
});

// Endpoint para envio de posição
app.post("/api/setPosition", (req, res) => {
	currentState.currentPosition = { pan: req.body.pan, tilt: req.body.tilt };
	console.log(
		`Set servo values to: pan = ${req.body.pan}°, tilt = ${req.body.tilt}°`
	);
	res.json(currentState.currentPosition);
});

// Recebe expressao facial da pagina web e envia para conexoes ws
app.get("/api/fex/:data", function (req, res) {
	currentState.currentEmotion = req.params.data;
	console.log(`Set emotion value to: ${req.params.data}`);
	res.render("pages/control");

	distributeData([{ fex: req.params.data }]);
});

// Endpoint que retorna a emoção atual
app.get("/api/getEmotion", (req, res) => {
	res.json(currentState.currentEmotion);
});
