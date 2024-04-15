let eventList
let eventInternal = [];
const eventLimit = 20

$(function() {
  eventList = $("#eventList");
  const ws = new WebSocket("ws://127.0.0.1:6976");

  ws.onopen = function() {
    console.log("Connected to NekoPunch");
    notify("Connected to server");
  };

  ws.onmessage = function(message) {
    processMessage(JSON.parse(message.data));
  };

  ws.onclose = function() {
    console.log("Disonnected to NekoPunch");
    notify("Disconnected from server");
  };

  ws.onerror = function(err) {
    console.error("Error on NekoPunch");
    console.error(err);
    notify("Error occurred! Check console to information.");
  };
});

function limitEvents() {
  if (eventInternal.length > eventLimit) {
    let r = eventInternal.splice(0, eventInternal.length - eventLimit);
    for (let v of r) $(v).remove();
  }
}

function notify(content) {
  let v;
  eventList.prepend(v = $("<div>").addClass("event").addClass("notify").append($("<h2>").text("[#NekoPunch]")).append(content));
  eventInternal.push(v);
  limitEvents();
}

function chat(header, content, color) {
  let v;
  eventList.prepend(v = $("<div>").addClass("event").addClass("chat").css({color:color}).append($("<h2>").append(header)).append(content));
  eventInternal.push(v);
  limitEvents();
}

function processMessage(data) {
  switch(data.type) {
    case "status":
      return notifyStatus(data);
    case "chat":
      return processChat(data);
    default:
      console.warn(`Process not implemented for type: ${data.type}`);
  }
}

function notifyStatus(data) {
  let r = [];
  if (data.status.kick) r.push("Kick");
  if (data.status.youtube) r.push("YouTube");
  if (data.status.chzzk) r.push("Chzzk");
  notify(`Currently conntected to ${r.length} site${r.length != 1 ? "s" : ""}`)
  notify(`Connected sites: ${r.join('/')}`)
}

function processChat(data) {
  let header = $("<div>");
  let content = $("<div>");
  let badges = $("<div>").addClass("badgeList");

  for (let b of data.sender.badges) {
    badges = badges.append($(`<img src="/assets/badge/${data.platform}/${b}.png">`));
  }

  header = header.append($(`<img src="/assets/platform/${data.platform}.png">`)).append(data.sender.username).append(badges);

  for (let c of data.content) { // todo: emoji
    if (c.text) content = content.append(c.text)
  }
  chat(header, content, data.sender.color);
}