import { 
  appendFileSync,
  existsSync, 
  mkdirSync, 
  writeFileSync, 
} from "fs";
import { 
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum, 
} from "openai";

import config from "./config.js";
import { Condition } from "./condition.js";
import { Message } from "./message.js";


export class Messages {
  history: Message[];

  constructor(messages = []) {
    this.history = messages;
  }

  addMessage({
    role,
    content,
    tokens = null,
  }: {
    role: ChatCompletionRequestMessageRoleEnum,
    content: string,
    tokens?: number | null,
  }) {
    const newMessage = new Message(role, content, tokens);
    if (tokens) newMessage.tokens = tokens;
    this.history.push(newMessage);
  }

  get last(): Message {
    return this.history[this.history.length -1];
  }

  get length(): number {
    return this.history.length;
  }

  get totalTokens(): number {
    return this.history.reduce((acc, message) => {
      return acc + message.tokens;
    }, 0);
  }

  concat(loadedMessages: Message[]) {
    this.history = this.history.concat(loadedMessages);
  }

  loadMessages(history: Message[]) {
    for(let i=0; i < history.length; i++) {
      this.addMessage({
        role: history[i].role, 
        content: history[i].content, 
        tokens: history[i].tokens
      });
    }
  }

  transcribeChat(filename: string) {
    if (!existsSync(config.OUTPUT_PATH)) mkdirSync(config.OUTPUT_PATH);
    const filepath = `${config.OUTPUT_PATH}/${filename}.txt`;

    writeFileSync(filepath, '', 'utf-8',);

    const roleMap = {
      user: "Prompt",
      system: "System",
      assistant: "Response",
      function: "Function",
    }

    for (let i = 0; i < this.history.length; i++) {
      let role = roleMap[this.history[i].role];
      
      if (role !== roleMap.assistant) continue;
    
      const text = this.history[i].content;
      
      appendFileSync(
        filepath,
        `${role.toUpperCase()}:\n${text}\n\n`,  
      )
    }
  }

  serializeForRequest(condition: Condition | null, memory: Message | null) {
    let tokenCount = 0;
    let serializedMessages: ChatCompletionRequestMessage[] = [];
    
    if (condition) tokenCount += condition.tokens;
    if (memory) tokenCount += memory.tokens;

    for (let i = this.history.length - 1; i >= 0; i--) {
      let thisMessage = this.history[i];

      if (tokenCount + thisMessage.tokens > config.INPUT_MAX_TOKENS) break;
      
      tokenCount += thisMessage.tokens;
      serializedMessages.unshift(thisMessage.serializeForRequest());
    }

    let systemMessageCount = 0;

    if (memory) {
      serializedMessages.unshift(memory.serializeForRequest());
      systemMessageCount++;
    }

    if (condition) {
      serializedMessages.unshift(condition.serializeForRequest());
      systemMessageCount++;
    }
    
    console.log(`Request Composition - ${serializedMessages.length}/${this.history.length} history - ${systemMessageCount} system`)
    
    return serializedMessages;
  }
}
