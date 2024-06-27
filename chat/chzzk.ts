import { WebSocketClient, StandardWebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import Broadcaster from "../broadcaster.ts";
import ChatComponent from "../chatComponent.ts";
import { makeSeededGenerators, randomInt } from "https://deno.land/x/vegas@v1.3.0/mod.ts";
import { Color } from "https://deno.land/x/color@v0.3.0/mod.ts";


export default async function (broadcaster: Broadcaster, id: string): Promise<WebSocketClient | null> {
  if (!id) {
    console.warn("No ID configured on Chzzk, abort connect");
    return null;
  }
  const channelData = (await(await fetch(`https://api.chzzk.naver.com/polling/v2/channels/${id}/live-status`)).json()).content
  if (channelData === null) {
    console.warn("Can't find channel data from Chzzk, is stream online?")
    return null;
  }
  const tokenData = await (await fetch(`https://comm-api.game.naver.com/nng_main/v1/chats/access-token?channelId=${channelData.chatChannelId}&chatType=STREAMING`)).json();
  if (tokenData.code === 42601) {
    console.warn("Detected chzzk stream is configured as adult-only, NekoPunch will not work on current setting due to connection will failue");
    return null;
  }
  const endpoint = "wss://kr-ss2.chat.naver.com/chat";
  const subscribe = {
    "ver": "3",
    "cmd": 100,
    "svcid": "game",
    "cid": channelData.chatChannelId,
    "bdy": {
      "accTkn": tokenData.accessToken,
      "auth": "READ",
      "devName": "Google Chrome/ 102.0.0.0",
      "devType": 2001,
      "libVer": "4.9.3",
      "locale": "ko",
      "osVer": "Windows/10",
      "timezone": "Asia/Seoul",
      "uid": null
    },
    "tid": 1
  }

  const ws: WebSocketClient = new StandardWebSocketClient(endpoint);
  let interval: number;
  ws.on("open", function() {
    console.log("Connected to Chzzk");
    ws.send(JSON.stringify(subscribe));
    interval = setInterval(ws=>ws.send(JSON.stringify({"ver":"3","cmd":0})),5000,ws);
  });

  ws.on("message", function (message: { data: string }) {
    if (message.data) {
      try {
        handleMessage(message.data);
      } catch (e) {
        console.error(e);
        return;
      }
    }
  });

  ws.on("close", (reason) => {
    console.log("Disconnected from Chzzk");
    if (reason) console.log(reason);
    clearInterval(interval);
  });

  ws.on("error", (err) => {
    console.error("Error on Chzzk");
    console.error(err);
  });

  function handleMessage(data: any) {
    data = JSON.parse(data);
    switch (data.cmd) {
      case 93101:
        data.bdy[0].profile = JSON.parse(data.bdy[0].profile);
        data.bdy[0].extras = JSON.parse(data.bdy[0].extras);
        return handleChat(data.bdy[0]);
      case 10100: // Subscribed
      case 15101: // Recents
      case 10000: // Heartbeat
        return;
      default:
        console.error(`Unknown type on Chzzk: ${data.cmd}`);
        console.log(data);
        return;
    }
  }

  function handleChat(data: Chat) {
    broadcaster.chat({
      "platform": "chzzk",
      "content": textContext(data.msg),
      "sender": {
        "id": data.profile.userIdHash,
        "username": data.profile.nickname,
        "color": getColor(data.profile),
        "badges": getBadges(data.profile)
      }
    });
  }

  // NYI
  function textContext(msg: string): ChatComponent[] {
    let r: ChatComponent[] = [];
    r.push({ type: "text", value: msg });
    return r;
  }

  function getColor(profile: Profile) {
    if (profile.title) return profile.title.color;
    const rand = makeSeededGenerators(profile.userIdHash);
    return Color.string(`hsl(${rand.randomInt(0,360)},${rand.randomInt(30,81)}%,50%)`).hex();
  }

  function getBadges(profile: Profile) {
    let r = profile.activityBadges.map(v => v.badgeId);
    if (profile.userRoleCode != "common_user") r.push(profile.userRoleCode);
    // if (profile.badge.imageUrl) {
    //   let v = profile.badge.imageUrl.split('/');
    //   r.push(v[v.length-1].split('.')[0]);
    // }
    if (profile.streamingProperty.subscription) {
      r.push(`subscribe_tier_${profile.streamingProperty.subscription.tier}`);
    }
    return r;
  }

  return ws;
}

type Badge = {
  badgeId: string;
}

type Title = {
  name: string;
  color: string;
}

type Profile = {
  userIdHash: string;
  nickname: string;
  profileImageUrl: string;
  userRoleCode: string;
  badge: Badge;
  title: Title;
  verifiedMark: boolean,
  activityBadges: Badge[];
  streamingProperty: {
    subscription: {
      tier: number
    }
  };
}

type Chat = {
  svcid: string;
  cid: string;
  mbrCnt: number;
  uid: string;
  profile: Profile;
  msg: string;
  msgTypeCode: number;
  msgStatusType: string;
  extras: any; // TODO
  ctime: number,
  utime: number,
  msgTid?: number;
  session: boolean;
  msgTime: number;
}

type RawMessage = {
  cmd: number;
  bdy: Chat[]
}

/*
{
  svcid: "game",
  cid: "N14wsl",
  mbrCnt: 3,
  uid: "d53420cf1a1f5bebf02a0f6420c3a540",
  profile: {
    userIdHash: "d53420cf1a1f5bebf02a0f6420c3a540",
    nickname: "아야메 코코",
    profileImageUrl: "",
    userRoleCode: "streamer",
    badge: { imageUrl: "https://ssl.pstatic.net/static/nng/glive/icon/streamer.png" },
    title: { name: "스트리머", color: "#D9B04F" },
    verifiedMark: false,
    activityBadges: [],
    streamingProperty: {}
  },
  msg: "aaa",
  msgTypeCode: 1,
  msgStatusType: "NORMAL",
  extras: {
    chatType: "STREAMING",
    osType: "PC",
    extraToken: "aj/qDA6ciiSKRUVdrhEyYixB86HQ077wF32+xjOpity1vne7pFL0Tr5zc+X94Bp2uT0lNgT9c/78nrFQn1PwRQ==",
    streamingChannelId: "d53420cf1a1f5bebf02a0f6420c3a540",
    emojis: ""
  },
  ctime: 1708763934097,
  utime: 1708763934097,
  msgTid: null,
  session: false,
  msgTime: 1708763934097
}
 */