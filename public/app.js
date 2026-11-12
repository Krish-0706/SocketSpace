const socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`);
const nameDialog = document.querySelector("#name-dialog");
const nameForm = document.querySelector("#name-form");
const nameInput = document.querySelector("#name-input");
const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const messages = document.querySelector("#messages");
const status = document.querySelector("#status");

function addMessage(content, className) {
    const item = document.createElement("p");
    item.className = className;
    item.textContent = content;
    messages.querySelector(".empty-state")?.remove();
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
}

function setConnected(connected) {
    status.textContent = connected ? "Online" : "Offline";
    status.className = `status ${connected ? "online" : "offline"}`;
    messageInput.disabled = !connected;
    messageForm.querySelector("button").disabled = !connected;
}

socket.addEventListener("open", () => {
    setConnected(true);
    nameInput.focus();
});

socket.addEventListener("close", () => {
    setConnected(false);
    addMessage("Connection closed. Refresh to reconnect.", "system error");
});

socket.addEventListener("message", ({ data }) => {
    const payload = JSON.parse(data);
    if (payload.type === "message") {
        addMessage(`${payload.name}: ${payload.message}`, "chat-message");
    } else if (payload.type === "system") {
        addMessage(payload.message, "system");
    } else if (payload.type === "error") {
        addMessage(payload.message, "system error");
    }
});

nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    socket.send(JSON.stringify({ type: "join", name }));
    nameDialog.close();
    messageInput.focus();
});

messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (!message || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "message", message }));
    messageInput.value = "";
    messageInput.focus();
});
