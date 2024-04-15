import { WebSocketClient, StandardWebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { makeSeededGenerators, randomInt } from "https://deno.land/x/vegas@v1.3.0/mod.ts";
import { Color } from "https://deno.land/x/color@v0.3.0/mod.ts";


export default async function(notify, id): boolean {
  if (!id) {
    "No ID configured on Chzzk, abort connect"
    return false;
  }
  const channelData = (await(await fetch(`https://api.chzzk.naver.com/polling/v2/channels/${id}/live-status`)).json()).content
  const tokenData = await (await fetch(`https://comm-api.game.naver.com/nng_main/v1/chats/access-token?channelId=${channelData.chatChannelId}&chatType=STREAMING`)).json();
  const endpoint = "wss://kr-ss2.chat.naver.com/chat";
  const subscribe = {
    "ver": "2",
    "cmd": 100,
    "svcid": "game",
    "cid": channelData.chatChannelId,
    "bdy": {
      "uid": null,
      "devType": 2001,
      "accTkn": tokenData.accessToken,
      "auth": "READ"
    },
    "tid": 1
  }

  const ws: WebSocketClient = new StandardWebSocketClient(endpoint);
  let interval;
  ws.on("open", function() {
    console.log("Connected to Chzzk");
    ws.send(JSON.stringify(subscribe));
    interval = setInterval(ws=>ws.send(JSON.stringify({"ver":"2","cmd":0})),1000,ws);
  });

  ws.on("message", function (message: string) {
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
    console.log("Disconnected from Chzzk");
    if (reason) console.log(reason);
    clearInterval(interval);
  });

  ws.on("error", (err) => {
    console.error("Error on Chzzk");
    console.error(err);
  });

  function handleMessage(data) {
    switch (data.cmd) {
      case 93101:
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

  function handleChat(data) {
    data.profile = JSON.parse(data.profile);
    data.extras = JSON.parse(data.extras);
    notify(JSON.stringify({
      "type": "chat",
      "platform": "chzzk",
      "content": textContext(data.msg),
      "sender": {
        "id": data.profile.userIdHash,
        "username": data.profile.nickname,
        "color": getColor(data.profile),
        "badges": getBadges(data.profile)
      }
    }));
  }

  // NYI
  function textContext(msg) {
    let r = [];
    r.push({text: msg});
    return r;
  }

  function getColor(profile) {
    if (profile.title) return profile.title.color;
    const rand = makeSeededGenerators(profile.userIdHash);
    return Color.string(`hsl(${rand.randomInt(0,360)},${rand.randomInt(30,81)}%,50%)`).hex();
  }

  function getBadges(profile) {
    let r = profile.activityBadges.map(v=>v.badgeId);
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

  return true;
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