type TextComponent = {
    type: "text";
    value: string;
}

type TemporaryComponent = { // will removed and add real components
    type: string
}

type ChatComponent = TextComponent | TemporaryComponent
export default ChatComponent;