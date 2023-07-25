import { 
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

  writeToFile() {
    if (!existsSync(config.OUTPUT_PATH)) mkdirSync(config.OUTPUT_PATH);
    writeFileSync(
      `${config.OUTPUT_PATH}/messages_state.json`,
      JSON.stringify(this.list, null, 4),
      'utf-8',
    );
  }

  async compress(client: OAIClient) { 
    const { responseText, requestCost } = await client.requestChatSummary(this.list, config.LOG_COST);
    const summaryMessage = client.createMessage("system", `Chat History: ${responseText}`);
    this.list = [this.list[0], summaryMessage];
    return requestCost;
  }
}
