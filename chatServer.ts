import { WebSocketClient, WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import KickChat from "./chat/kick.ts";
import YouTubeChat from "./chat/youtube.ts";
import ChzzkChat from "./chat/chzzk.ts";
import { load as loadEnv } from "https://deno.land/std@0.218.2/dotenv/mod.ts";

const CONFIG = await loadEnv();
const PROFILE = await loadEnv({
  envPath: `./.profile.${CONFIG.PROFILE}`,
  defaultsPath:"./.profile.defaults"
});

let status = await startHooks();
if (status.kick || status.youtube || status.chzzk) {
  console.log("Server inited.");
} else {
  console.error("No profile found, abort server starting.");
  Deno.exit(1);
}

const wss = new WebSocketServer(6976);
wss.on("connection", function (ws: WebSocketClient) {
  console.log("Client connected")
  ws.send(JSON.stringify({type:"status", status}));
});

function notify(message) {
  // console.log(message)
  for (let ws of wss.clients) {
    ws.send(message);
  }
};

async function startHooks() {
  const kick = await KickChat(notify, PROFILE.KICK_ID);
  const youtube = await YouTubeChat(notify, PROFILE.YOUTUBE_ID);
  const chzzk = await ChzzkChat(notify, PROFILE.CHZZK_ID);
  return {kick, youtube, chzzk};
};