import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import ChatComponent from './chatComponent.ts'

export default class Broadcaster {
  cachedEvents: any[];
  #wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.#wss = wss
    this.cachedEvents = [];
  }

  #notify(event: Event) {
    let data = JSON.stringify(event);
    for (let ws of this.#wss.clients) {
      ws.send(data);
    }
  }

  #cacheEvent(event: Event) {
    if (this.cachedEvents.length > 100) this.cachedEvents.shift();
    this.cachedEvents.push(event);
  }

  chat(message: Chat) {
    let data = { type: "chat", data: message };
    this.#notify(data);
    this.#cacheEvent(data);
  }
}

type Event = {
  type: string;
  data: Chat;
}

type Chat = {
  platform: string;
  content: ChatComponent[];
  sender: {
    id: string;
    username: string;
    color: string;
    badges: string[];
  }
}