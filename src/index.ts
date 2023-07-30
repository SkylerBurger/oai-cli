import { Chat } from "./chat.js";


const chat = new Chat();

await chat.configure();
chat.begin();
