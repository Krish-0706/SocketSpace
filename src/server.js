
import { createReadStream } from "node:fs";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT) || 8080;
const publicDirectory = join(fileURLToPath(new URL(".", import.meta.url)), "..", "public");
const clients = new Map();

const contentTypes = {
    ".css": "text/css",
    ".html": "text/html",
    ".js": "text/javascript"
};

const server = createServer((request, response) => {
    const requestedPath = request.url === "/" ? "/index.html" : request.url;
    const filePath = join(publicDirectory, requestedPath);

    if (!filePath.startsWith(publicDirectory) || !existsSync(filePath)) {
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.end("Not found");
        return;
    }

    response.writeHead(200, {
        "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
});

const wss = new WebSocketServer({ server });

function send(socket, payload) {
    if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}

function broadcast(payload) {
    for (const socket of clients.keys()) {
        send(socket, payload);
    }
}

function cleanName(value) {
    const name = typeof value === "string" ? value.trim() : "";
    return name.slice(0, 24) || "Anonymous";
}

wss.on("connection", (socket) => {
    clients.set(socket, "Anonymous");
    send(socket, {
        type: "system",
        message: "Connected to SocketSpace."
    });

    socket.on("message", (data) => {
        let payload;

        try {
            payload = JSON.parse(data.toString());
        } catch {
            send(socket, { type: "error", message: "Messages must be valid JSON." });
            return;
        }

        if (payload.type === "join") {
            const name = cleanName(payload.name);
            clients.set(socket, name);
            broadcast({ type: "system", message: `${name} joined the chat.` });
            return;
        }

        if (payload.type === "message") {
            const message = typeof payload.message === "string" ? payload.message.trim() : "";
            if (!message || message.length > 500) {
                send(socket, { type: "error", message: "Message must be between 1 and 500 characters." });
                return;
            }

            broadcast({
                type: "message",
                name: clients.get(socket),
                message,
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on("close", () => {
        const name = clients.get(socket);
        clients.delete(socket);
        if (name && name !== "Anonymous") {
            broadcast({ type: "system", message: `${name} left the chat.` });
        }
    });
});

server.listen(PORT, () => {
    console.log(`SocketSpace running at http://localhost:${PORT}`);
});
