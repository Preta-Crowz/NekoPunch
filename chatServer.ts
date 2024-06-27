import { WebSocketClient, WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import KickChat from "./chat/kick.ts";
import YouTubeChat from "./chat/youtube.ts";
import ChzzkChat from "./chat/chzzk.ts";
import Broadcaster from "./broadcaster.ts";
import { iTool, Supported } from './iTool.ts'
import { load as loadEnv } from "https://deno.land/std@0.218.2/dotenv/mod.ts";

const CONFIG = await loadEnv();
const PROFILE = await loadEnv({
  envPath: `./.profile.${CONFIG.PROFILE}`,
  defaultsPath:"./.profile.defaults"
});

class Tool implements iTool {
  async refresh(type: Supported) {
    switch (type) {
      case 'kick':
        sockets.kick?.close(1000);
        sockets.kick = await KickChat(broadcaster, PROFILE.KICK_ID);
        status.kick = !(sockets.kick?.isClosed);
        break;
      case 'youtube':
        sockets.youtube?.stop();
        sockets.youtube = await YouTubeChat(broadcaster, PROFILE.YOUTUBE_ID);
        status.youtube = sockets.youtube;
        break;
      case 'chzzk':
        sockets.chzzk?.close(1000);
        sockets.chzzk = await ChzzkChat(broadcaster, PROFILE.CHZZK_ID);
        status.chzzk = !(sockets.chzzk?.isClosed);
        break;
    }
  }

  refreshAll() {
    this.refresh('kick');
    this.refresh('youtube');
    this.refresh('chzzk');
  }
}

const wss = new WebSocketServer(6976);
const integrationTool = new Tool();
const broadcaster = new Broadcaster(wss, integrationTool);

let sockets = await startHooks();
let status = {
  kick: !(sockets.kick?.isClosed),
  youtube: sockets.youtube,
  chzzk: !(sockets.chzzk?.isClosed)
}

if (status.kick || status.youtube || status.chzzk) {
  console.log("Server inited.");
} else {
  console.error("No profile found, abort server starting.");
  Deno.exit(1);
}

wss.on("connection", function (ws: WebSocketClient) {
  console.log("Client connected")

  ws.on("message", function (message: string) {
    return processClientMessage(ws, JSON.parse(message));
  });
});

function processClientMessage(ws: WebSocketClient, data: ClientMessage) {
  switch (data.type) {
    case "init":
      ws.send(JSON.stringify({ type: "status", status }));
      ws.send(JSON.stringify({ type: "cache", data: broadcaster.getCache(data.limit) }));
      break;
    case "refresh":
      // NYI
      break;
  }
}

async function startHooks() {
  const kick = await KickChat(broadcaster, PROFILE.KICK_ID);
  const youtube = await YouTubeChat(broadcaster, PROFILE.YOUTUBE_ID);
  const chzzk = await ChzzkChat(broadcaster, PROFILE.CHZZK_ID);
  return {kick, youtube, chzzk};
};

type ClientMessage = InitRequest | RefreshRequest;

type InitRequest = {
  "type": "init",
  "limit": number
}

type RefreshRequest = {
  "type": "refresh"
}