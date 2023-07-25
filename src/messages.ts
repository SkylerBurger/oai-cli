import { 
  appendFileSync,
  existsSync, 
  mkdirSync, 
  readFileSync, 
  writeFileSync, 
} from "fs";
import { ChatCompletionRequestMessage } from "openai";

import config from "./config.js";
import { OAIClient } from "./openai.js";


export class Messages {
  list: ChatCompletionRequestMessage[];
  precondition: ChatCompletionRequestMessage | null;

  constructor(messages = []) {
    this.list = messages;
    this.precondition = null;
  }

  get last() {
    return this.list.slice(-1)[0];
  }

  get length() {
    return this.list.length;
  }

  push(message: ChatCompletionRequestMessage) {
    this.list.push(message);
  }

  concat(loadedMessages: ChatCompletionRequestMessage[]) {
    this.list = this.list.concat(loadedMessages);
  }

  unshift(message: ChatCompletionRequestMessage) {
    this.list.unshift(message);
  }

  loadPrecondition() {
    if (!config.PRECONDITION_PATH) throw Error("Missing PRECONDITION_PATH");

    const text = readFileSync(config.PRECONDITION_PATH, "utf-8");
    this.precondition = JSON.parse(text);
    this.unshift((this.precondition as ChatCompletionRequestMessage));
  }

  loadState() {
    const fileContent = readFileSync(`${config.OUTPUT_PATH}/messages_state.json`, "utf-8");
    const messageStateInput = JSON.parse(fileContent);
    this.concat(messageStateInput as ChatCompletionRequestMessage[]);
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
    const messagesCopy = [...this.list];

    writeFileSync(
      filepath,
      '',
      'utf-8',
    );

    for (let i = 0; i < messagesCopy.length; i++) {
      const roleMap = {
        user: "Prompt",
        system: "System",
        assistant: "Response",
        function: "Function",
      }
      let role = roleMap[messagesCopy[i]['role']];
      const content = messagesCopy[i]['content'];
      
      appendFileSync(
        filepath,
        `${role}:\n${content}\n\n`,  
      )
    }
  }

  async compress(client: OAIClient) { 
    const { responseText, requestCost } = await client.requestChatSummary(this.list, config.LOG_COST);
    const summaryMessage = client.createMessage("system", `Chat History: ${responseText}`);
    this.list = [this.list[0], summaryMessage];
    return requestCost;
  }
}
