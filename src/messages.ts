import { 
  appendFileSync,
  existsSync, 
  mkdirSync, 
  writeFileSync, 
} from "fs";
import { 
  ChatCompletionRequestMessageRoleEnum, 
} from "openai";

import config from "./config.js";
import { Condition } from "./interfaces.js";
import { Message } from "./message.js";
import { OAIClient } from "./openai.js";


export class Messages {
  archive: Message[];
  recent: Message[];

  constructor(messages = []) {
    this.archive = [];
    this.recent = messages;
  }

  addMessage({
    role,
    content,
    tokens = null,
    archive = false,
  }: {
    role: ChatCompletionRequestMessageRoleEnum,
    content: string,
    tokens?: number | null,
    archive?: boolean,
  }) {
    const newMessage = new Message(role, content, tokens);
    if (tokens) newMessage.tokens = tokens;
    if (archive) {
      this.archive.push(newMessage);
    } else {
      this.recent.push(newMessage);
    }
  }

  get last(): Message {
    return this.recent.slice(-1)[0];
  }

  get length(): number {
    return this.recent.length;
  }

  get totalTokens(): number {
    return this.recent.reduce((acc, message) => {
      return acc + message.tokens;
    }, 0);
  }

  concat(loadedMessages: Message[]) {
    this.recent = this.recent.concat(loadedMessages);
  }

  unshift(message: Message) {
    this.recent.unshift(message);
  }

  addCondition(condition: string) {
    this.recent.unshift(new Message("system", condition));
  }

  loadMessages(archive: Message[], recent: Message[]) {
    for(let i=0; i < archive.length; i++) {
      this.addMessage({
        role: archive[i].role, 
        content: archive[i].content, 
        tokens: archive[i].tokens,
        archive: true,
      });
    }
    for(let i=0; i < recent.length; i++) {
      this.addMessage({
        role: recent[i].role, 
        content: recent[i].content, 
        tokens: recent[i].tokens
      });
    }
  }

  transcribeChat(filename: string) {
    if (!existsSync(config.OUTPUT_PATH)) mkdirSync(config.OUTPUT_PATH);
    const filepath = `${config.OUTPUT_PATH}/${filename}.txt`;

    writeFileSync(filepath, '', 'utf-8',);

    for (let i = 0; i < this.recent.length; i++) {
      const roleMap = {
        user: "Prompt",
        system: "System",
        assistant: "Response",
        function: "Function",
      }
      let role = roleMap[this.recent[i].role];
      const text = this.recent[i].content;
      
      appendFileSync(
        filepath,
        `${role.toUpperCase()}:\n${text}\n\n`,  
      )
    }
  }

  async compress(client: OAIClient, condition: Condition | null) { 
    const messagesForSummary = condition ? this.recent.slice(1) : this.recent;
    const response = await client.requestChatSummary(messagesForSummary);
    const summaryMessage = new Message("system", `Chat History: ${response.message.content}`);
    this.archive = this.archive.concat(messagesForSummary);
    this.recent = [summaryMessage];
    if (condition) this.addCondition(condition.instructions);
    return response;
  }

  serializeForRequest() {
    return this.recent.map((message) => {
      return {
        role: message.role,
        content: message.content,
      }
    });
  }
}
