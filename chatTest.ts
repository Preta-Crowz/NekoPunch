import { WebSocketClient, StandardWebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
const ws: WebSocketClient = new StandardWebSocketClient("ws://127.0.0.1:6976");
ws.on("open", function() {
  console.log("Connected to NekoPunch");
});

ws.on("message", function (message: string) {
  console.log(JSON.parse(message.data));
});

ws.on("close", () => {
  console.log("Disconnected from NekoPunch");
});

ws.on("error", (err) => {
  console.error("Error on NekoPunch");
  console.error(err);
});