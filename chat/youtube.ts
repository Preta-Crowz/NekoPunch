import { LiveChat } from "npm:youtube-chat";
import Broadcaster from "../broadcaster.ts";
import ChatComponent from "../chatComponent.ts";
import { makeSeededGenerators, randomInt } from "https://deno.land/x/vegas@v1.3.0/mod.ts";
import { Color } from "https://deno.land/x/color@v0.3.0/mod.ts";

export default async function (broadcaster: Broadcaster, id: string): Promise<LiveChat | null> {
  if (!id) {
    console.warn("No ID configured on YouTube, abort connect");
    return null;
  }

  const liveChat = new LiveChat({handle: id});
  let wait = true;

  liveChat.on("start", (liveId) => {
    console.log("Connected to YouTube");
    setTimeout(()=>wait=false, 2000)
  });

  liveChat.on("end", (reason) => {
    console.log("Disconnected from YouTube");
    if (reason) console.log(`Reason: ${reason}`);
  });

  liveChat.on("chat", (data: ChatItem) => {
    if (wait) return;
    broadcaster.chat({
      "platform": "youtube",
      "content": convertComponents(data.message),
      "sender": {
        "id": data.author.channelId,
        "username": data.author.name,
        "color": getColor(data.author.channelId),
        "badges": getBadges(data)
      }
    });
  });

  liveChat.on("error", (err) => {
    if (err.message === 'Live Stream was not found') {
      console.warn("Can't find stream data from YouTube, is stream online?");
      return;
    }
    console.error("Error on YouTube!");
    console.error(err);
  });

  function getColor(id: string) {
    const rand = makeSeededGenerators(id);
    return Color.string(`hsl(${rand.randomInt(0,360)},${rand.randomInt(30,81)}%,50%)`).hex();
  }

  function getBadges(data: ChatItem) {
    let r = [];
    if (data.isMembership) r.push("membership");
    if (data.isOwner) r.push("owner");
    if (data.isVerified) r.push("verified");
    if (data.isModerator) r.push("moderator");
    return r;
  }

  function convertComponents(data: any[]): ChatComponent[] {
    let r = [];
    for (let component of data) {
      if ('text' in component) r.push({ type: "text", data: component.text });
    }
    return r;
  }

  const ok = await liveChat.start();
  return ok ? liveChat : null;
}

// Can't import them, so copy them
type ChatItem = {
  author: {
    name: string;
    thumbnail?: ImageItem;
    channelId: string;
    badge?: {
      thumbnail: ImageItem;
      label: string;
    }
  }
  message: MessageItem[];
  superchat?: {
    amount: string;
    color: string;
    sticker?: ImageItem;
  }
  isMembership: boolean;
  isVerified: boolean;
  isOwner: boolean;
  isModerator: boolean;
  timestamp: Date;
}

type MessageItem = { text: string } | EmojiItem;

interface ImageItem {
  url: string;
  alt: string;
}

interface EmojiItem extends ImageItem {
  emojiText: string;
  isCustomEmoji: boolean;
}

/*
{
  id: "ChwKGkNLaXh0dGZHdzRRREZVYkR3Z1FkYXJRRjB3",
  author: {
    name: "코코냐",
    thumbnail: {
      url: "https://yt4.ggpht.com/XIBR5rgajHxDU24hVMKlOjDe4z4Wg9KNQ-94vRNQWNLCClVLLVfRCBLDBkX0yoCKodYocygWGEA=s6...",
      alt: "코코냐"
    },
    channelId: "UCeHfa7Pc3VdNDOilwPOrQKA"
  },
  message: [ { text: "test" } ],
  isMembership: false,
  isOwner: true,
  isVerified: false,
  isModerator: false,
  timestamp: 2024-02-24T08:25:22.617Z
}
 */