import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import { v4 } from "uuid";
import os from "os";

const app = express();
const port = process.env.port || 3000;

// Printa o Endereço de IP do servidor + porta
var networkInterfaces = os.networkInterfaces();
const ip = "http://localhost";
console.log(`Server on: ${ip}:${port}`);

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
		if (message.type === "media") {
			distributeData(message);
		} else {
			console.log(message);
			distributeData({ type: "control", ...state });
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

// Endpoint que retorna o último valor recebido de posição
app.get("/api/servo", (req, res) => {
	res.json({ pan: state.pan, tilt: state.tilt });
});

// Endpoint que retorna a expressão facial atual
app.get("/api/fex", (req, res) => {
	res.json({ fex: state.fex });
});

// POST

// Endpoint para envio de posição
app.post("/api/servo", (req, res) => {
	state.pan = req.body.pan;
	state.tilt = req.body.tilt;
	console.log(`pan = ${state.pan}°, tilt = ${state.tilt}°`);
	distributeData({ type: "control", ...state });
	res.json({ pan: state.pan, tilt: state.tilt });
});

// Recebe expressao facial da pagina web e envia para conexoes ws
app.post("/api/fex", function (req, res) {
	state.fex = req.body.fex;
	console.log(`expression: ${state.fex}`);
	distributeData({ type: "control", ...state });
	res.json({ fex: state.fex });
});
