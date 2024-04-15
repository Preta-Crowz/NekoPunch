import { LiveChat } from "npm:youtube-chat";
import { makeSeededGenerators, randomInt } from "https://deno.land/x/vegas@v1.3.0/mod.ts";
import { Color } from "https://deno.land/x/color@v0.3.0/mod.ts";

export default async function(notify, id): boolean {
  if (!id) {
    "No ID configured on YouTube, abort connect"
    return false;
  }

  let wait = true;
  const liveChat = new LiveChat({channelId: id});

  liveChat.on("start", (liveId) => {
    console.log("Connected to YouTube");
    setTimeout(()=>wait=false, 2000)
  });

  liveChat.on("end", (reason) => {
    console.log("Disconnected from YouTube");
    if (message) console.log(`Reason: ${reason}`);
  });

  liveChat.on("chat", (data) => {
    if (wait) return;
    notify(JSON.stringify({
      "type": "chat",
      "platform": "youtube",
      "content": data.message,
      "sender": {
        "username": data.author.name,
        "color": getColor(data.author.channelId),
        "badges": getBadges(data)
      }
    }));
  });

  liveChat.on("error", (err) => {
    console.error("Error on YouTube!");
    console.error(err);
  });

  function getColor(id) {
    const rand = makeSeededGenerators(id);
    return Color.string(`hsl(${rand.randomInt(0,360)},${rand.randomInt(30,81)}%,50%)`).hex();
  }

  function getBadges(data) {
    let r = [];
    if (data.isMembership) r.push("membership");
    if (data.isOwner) r.push("owner");
    if (data.isVerified) r.push("verified");
    if (data.isModerator) r.push("moderator");
    return r;
  }

  const ok = await liveChat.start();
  return ok;
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