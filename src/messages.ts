import { 
  appendFileSync,
  existsSync, 
  mkdirSync, 
  readFileSync, 
  writeFileSync, 
} from "fs";
import { 
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum, 
} from "openai";

import config from "./config.js";
import { Message } from "./message.js";
import { OAIClient } from "./openai.js";


export class Messages {
  archive: Message[];
  list: Message[];
  precondition: Message | null;

  constructor(messages = []) {
    this.archive = [];
    this.list = messages;
    this.precondition = null;
  }

  addMessage(role: ChatCompletionRequestMessageRoleEnum, text: string) {
    this.push(new Message(role, text));
  }

  current(): ChatCompletionRequestMessage[] {
    return this.list.map(message => {
      return {role: message.role, content: message.content};
    })
  }

  get last() {
    return this.list.slice(-1)[0];
  }

  get length() {
    return this.list.length;
  }

  push(message: Message) {
    this.list.push(message);
  }

  concat(loadedMessages: Message[]) {
    this.list = this.list.concat(loadedMessages);
  }

  unshift(message: Message) {
    this.list.unshift(message);
  }

  loadCondition(condition: string) {
    this.push(new Message("system", condition));
  }

  loadState() {
    const fileContent = readFileSync(`${config.OUTPUT_PATH}/messages_state.json`, "utf-8");
    const messageStateInput = JSON.parse(fileContent);
    this.concat(messageStateInput as Message[]);
  }

  reload() {
    this.list = [];
    if (this.precondition) {
      this.push(this.precondition);
    }
    this.loadState();
  }

  saveState(filename: string | null = null) {
    if (!existsSync(config.OUTPUT_PATH)) mkdirSync(config.OUTPUT_PATH);
    if (!filename) filename = "messages_state"
    writeFileSync(
      `${config.OUTPUT_PATH}/${filename}.json`,
      JSON.stringify(this.list, null, 4),
      'utf-8',
    );
  }

  backupMessagesState(filename:string) {
    if (!existsSync(config.OUTPUT_PATH)) mkdirSync(config.OUTPUT_PATH);
    if (!filename) filename = "messages_state"
    writeFileSync(
      `${config.OUTPUT_PATH}/${filename}.json`,
      JSON.stringify(this.list, null, 4),
      'utf-8',
    );
  }

  saveChatToFile(filename: string) {
    if (!existsSync(config.OUTPUT_PATH)) mkdirSync(config.OUTPUT_PATH);
    const filepath = `${config.OUTPUT_PATH}/${filename}.txt`;

    writeFileSync(filepath, '', 'utf-8',);

    for (let i = 0; i < this.list.length; i++) {
      const roleMap = {
        user: "Prompt",
        system: "System",
        assistant: "Response",
        function: "Function",
      }
      let role = roleMap[this.list[i].role];
      const text = this.list[i].content;
      
      appendFileSync(
        filepath,
        `${role}:\n${text}\n\n`,  
      )
    }
  }

  async compress(client: OAIClient) { 
    const response = await client.requestChatSummary(this.list);
    const summaryMessage = new Message("system", `Chat History: ${response.message.content}`);
    this.archive = this.archive.concat(this.list.slice(1));  // TODO: Refine this
    this.list = [this.list[0], summaryMessage];
    return response.cost;
  }

  // Serialize
  // DeSerialize
}
