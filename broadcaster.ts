import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import ChatComponent from './chatComponent.ts'
import { iTool, Supported } from './iTool.ts'
import { load as loadEnv } from "https://deno.land/std@0.218.2/dotenv/mod.ts";

const CONFIG = await loadEnv();
const MODS = await (async function () {
  let R = await loadEnv({
    envPath: `./.mods.${CONFIG.PROFILE}`,
    defaultsPath: "./.mods.defaults"
  });
  return {
    'chzzk': R.CHZZK.split(','),
    'youtube': R.YOUTUBE.split(','),
    'kick': R.KICK.split(',')
  };
})();

export default class Broadcaster {
  cachedEvents: any[];
  #wss: WebSocketServer;
  #tool: iTool;

  constructor(wss: WebSocketServer, tool: iTool) {
    this.#wss = wss;
    this.cachedEvents = [];
    this.#tool = tool;
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

  getCache(limit: number): Event[] {
    if (this.cachedEvents.length <= limit) return this.cachedEvents;
    const length = this.cachedEvents.length;
    return this.cachedEvents.slice(length - limit, length);
  }

  chat(message: Chat) {
    if (isMod(message.platform, message.sender)
      && message.content.length === 1
      && 'value' in message.content[0]
      && message.content[0].value[0] === '*') {
      let [command, ...args] = message.content[0].value.split(' ');
      switch (command) {
        case '*refresh':
          if (args.length < 1) return this.#tool.refreshAll();
          if (args[0] in ['chzzk','youtube','kick']) return this.#tool.refresh(args[0] as Supported);
      }
    }
    let data: Event = { type: "chat", data: message };
    this.#notify(data);
    this.#cacheEvent(data);
  }
}

function isMod(from: Supported, user: Sender): boolean {
  return MODS[from]?.includes(user.id);
}

type ModsType = {
  Supported: string[];
}

type Event = {
  type: string;
  data: Chat;
}

type Chat = {
  platform: Supported;
  content: ChatComponent[];
  sender: Sender
}

type Sender = {
  id: string;
  username: string;
  color: string;
  badges: string[];
}