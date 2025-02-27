import { WebSocketClient, StandardWebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import Broadcaster from "../broadcaster.ts";
import ChatComponent from "../chatComponent.ts";

export default async function (broadcaster: Broadcaster, id: string): Promise<WebSocketClient | null> {
  if (!id) {
    console.warn("No ID configured on Kick, abort connect");
    return null;
  }

  const chInfo = await (await fetch(`https://kick.com/api/v2/channels/${id}/chatroom`)).json();

  const endpoint = "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=7.6.0&flash=false";
  const subscribe = {
      "event": "pusher:subscribe",
      "data": {
          "auth": "",
          "channel": `chatrooms.${chInfo.id}.v2`
      }
  };

  const ws: WebSocketClient = new StandardWebSocketClient(endpoint);
  let interval: number;
  ws.on("open", function() {
    console.log("Connected to Kick");
    ws.send(JSON.stringify(subscribe));
    interval = setInterval(ws=>ws.send(JSON.stringify({"event":"pusher:ping","data":{}})),5000,ws);
  });

  ws.on("message", function (message: RawMessage) {
    if (message.data) {
      try {
        let data = JSON.parse(message.data);
        handleMessage(data);
      } catch (e) {
        console.error(e);
        return;
      }
    }
  });

  ws.on("close", (reason) => {
    console.log("Disconnected from Kick");
    if (reason) console.log(reason);
    clearInterval(interval);
  });

  ws.on("error", (err) => {
    console.error("Error on Kick");
    console.error(err);
  });

  function handleMessage(data: RawMessage) {
    switch (data.event) {
      case "App\\Events\\ChatMessageEvent":
        return handleChat(JSON.parse(data.data))
      case "pusher:connection_established":
      case "pusher_internal:subscription_succeeded":
      case "pusher:pong":
        return;
      default:
        console.error(`Unknown type on Kick: ${data.event}`);
        console.log(data);
        return;
    }
  }

  function handleChat(data: Chat) {
    if (chInfo.id !== data.chatroom_id) {
      console.warn(`Got wrong sent message: ${data.chatroom_id}`)
    }
    broadcaster.chat({
      "platform": "kick",
      "content": textContext(data.content),
      "sender": {
        "id": data.sender.username,
        "username": data.sender.username,
        "color": data.sender.identity.color,
        "badges": getBadges(data.sender.identity.badges)
      }
    });
  }

  // NYI
  function textContext(msg: string): ChatComponent[] {
    let r: ChatComponent[] = [];
    r.push({ type: "text", value: msg });
    return r;
  }

  function getBadges(badges: Badge[]) {
    return badges.map(v => {
      return v.count ? `${v.type}_${v.count}` : v.type;
    });
  }

  return ws;
}

type RawMessage = {
  event: string;
  data: string;
}

type Badge = {
  count: number;
  type: string;
}

type Profile = {
  id: number;
  username: string;
  slug: string;
  identity: {
    color: string;
    badges: Badge[]
  }
}

type Chat = {
  id: string;
  chatroom_id: number;
  content: string;
  type: string;
  created_at: string;
  sender: Profile
}

/*
{
  id: "61b06e6f-e42e-4f0a-ada9-e8dfa6701fe9",
  chatroom_id: 5612385,
  content: "[emote:1579040:emojiCrying]",
  type: "message",
  created_at: "2024-02-24T08:00:34+00:00",
  sender: {
    id: 5735529,
    username: "develcat",
    slug: "develcat",
    identity: { color: "#BAFEA3", badges: [ [Object] ] }
  }
}
 */