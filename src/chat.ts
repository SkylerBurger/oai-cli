import { 
  appendFileSync, 
  existsSync, 
  mkdirSync,
  readFileSync, 
  writeFileSync, 
} from "fs";

import ln from "./formatting.js";
import {Condition, ConditionManager } from "./condition.js";
import config from "./config.js";
import { question } from "./input.js";
import { ChatState, ChatResponse } from "./interfaces.js";
import { Message } from "./message.js";
import { Messages } from "./messages.js";
import { gpt4Turbo } from "./models.js";
import { OAIClient } from "./openai.js";
import { CreateCompletionResponseUsage } from "openai";


export class Chat {
  client: OAIClient;
  condition: Condition | null = null;
  memory: Message | null = null;
  summary: Message | null = null;
  messages: Messages;
  chatCost: number = 0;

  constructor() {
    this.client = new OAIClient(gpt4Turbo);
    this.messages = new Messages();
  }

  async begin() {
    await this.prompt();

    while (true) {
      await this.prompt();
    }
  }

  async configure() {
    ln.greenBanner("STARTING UP!");
    const loadChatReply = await question("Reload previous chat? [y/N]");
    if (loadChatReply.toLowerCase() === "y") {
      try {
        await this.loadChat();
        ln.green(`Chat: ${ this.messages.length } Messages Loaded`);
        ln.blank();
        ln.green('Previously...'), 
        ln.normal(`${this.messages.last.content}`);
      } catch (err) {
        ln.red("Chat: Error while loading previous chat");
        console.error(err);
      }
    } else {
      ln.yellow("Skipping...")
      ln.blank();
      const conditionManager = new ConditionManager();
      this.condition = await conditionManager.configureConditions();
      if (this.condition) {
        ln.green(`Condition Set: ${ this.condition.name }`);
      } else {
        ln.yellow("Skipping...");
      }
    }

    ln.blank();
    ln.green("Chat ready...");
    ln.blank();
  }

  // ACTION LOOP
  get actionMap(): { [key: string]: () => Promise<void> | void } {
    return {
      "": async () => await this.prompt(),
      "m": async () => await this.setMemory(),
      "p": async () => await this.prompt(),
      "s": async () => await this.saveChat(),
      "t": async () => await this.transcribeChat(),
      "x": async () => await this.exit(),
    }
  }

  async selectAction() {
    ln.orange("Select an action:");
    ln.yellow("[P] Prompt (default) - [M] Memory - [X] Close")
    ln.yellow("[S] Save Chat Session - [T] Transcribe Chat");
    const input = await question("");
    ln.blank();
    try {
      await this.actionMap[input]();
    } catch (err) {
      ln.normal("Try again...");
      ln.blank();
    }
  }

  async setMemory(memoryText: string | null = null) {
    if (memoryText) {
      this.memory = new Message("system", `Reference Notes: ${memoryText}`);
      return;
    }

    if (this.memory) {
      ln.green("Current Memory:");
      ln.normal(this.memory.content);
      ln.blank();
    }

    const userInput = await question("New Memory: ['Enter' with no input to cancel]");
    if (userInput) {
      this.memory = new Message("system", `Reference Notes: ${userInput}`);
      ln.green("Memory set!");
    }

    ln.blank();
  }

  async prompt() {
    const input = await question("Prompt:  ['Enter' with no input for options]");
    if (!input) {
      ln.blank();
      await this.selectAction();
      return;
    }

    this.messages.addMessage({ role: "user", content: input});
    let response: ChatResponse;
    try {
      ln.yellow("Awaiting reply...");
      response = await this.client.requestChatCompletion(this.messages.serializeForRequest(this.condition, this.memory));
    } catch (err) {
      ln.red("Error while requesting chat completion...");
      console.error(err);
      return;
    }
    this.messages.addMessage({ role: "assistant", content: response.message.content });
    ln.blank();
    ln.green("Response:");
    ln.normal(`${response.message.content}\n`);
    if (config.LOG_USAGE) {
      this.logCost(response.cost);
      if (response.tokenUsage) this.logTokens(response.tokenUsage);
    }
    ln.blank();
    this.writeSaveToFile();
  }

  async exit() {
    while(true) {
      let saveReply = await question('Save chat session before quitting? [y/n]');
      saveReply = saveReply.toLocaleLowerCase();
      if (saveReply === "y") {
        await this.saveChat();
        break;
      }
      if (saveReply === "n") {
        break;
      }
    }
    ln.green('Goodbye!');
    process.exit();
  }

  // USAGE
  logCost(requestCost: number) {
    this.chatCost += requestCost;

    let costString = "Estimates" + 
      `- Request: $${requestCost.toFixed(3)} ` + 
      `- Session: $${this.chatCost.toFixed(3)} ` + 
      `- Messages: ${this.messages.length}\n`;
    const costLogPath = `${config.OUTPUT_PATH}/cost_log.txt`;

    try {
      appendFileSync(costLogPath, costString);
    } catch (err) {
      ln.yellow('Cost Log file did not exist, creating now...');
      if (!existsSync(config.OUTPUT_PATH)) mkdirSync(config.OUTPUT_PATH);
      writeFileSync(costLogPath, costString, "utf-8");
    }

    ln.yellow(`Estimated cost of request: $${requestCost.toFixed(3)}`);
    ln.yellow(`Estimated cost of session: $${this.chatCost.toFixed(3)}`);
  }

  logTokens(tokenUsage: CreateCompletionResponseUsage) {
    ln.yellow(`Request Tokens: ${tokenUsage['prompt_tokens']}`);
    ln.yellow(`Response Tokens: ${tokenUsage['completion_tokens']}`);
    ln.yellow(`Total Tokens: ${tokenUsage['total_tokens']}`);
  }

  async transcribeChat() {
    const filename = await question("Filename? ['chat']: ") || "chat";
    try {
      ln.yellow("Writing chat to file...");
      this.messages.transcribeChat(filename);
      ln.green("Chat: Finished writing to file");
    } catch (err) {
      ln.red("Chat: Error while writing to file");
      console.error(err);
    }
    ln.blank();
  }

  // CHAT SESSION STATE
  async loadChat() { 
    const filename = await question(`Name of JSON file in chats directory (${config.CHATS_PATH})`);
    const chatString = readFileSync(
      `${config.CHATS_PATH}/${filename}.json`,
      "utf-8",
    )
    const chatState: ChatState = JSON.parse(chatString);
    this.messages.loadMessages(chatState.messages.history);
    if (chatState.condition) {
      this.condition = new Condition(chatState.condition.name, chatState.condition.instructions);
    }
    if (chatState.memory) {
      this.setMemory(chatState.memory);
    }
  }

  async saveChat() {
    let filename = await question("Filename? ['chat_backup']") || "chat_backup";
    try {
      ln.yellow(`Saving chat to file...`);
      if (!existsSync(config.CHATS_PATH)) mkdirSync(config.CHATS_PATH);
      this.writeSaveToFile(`${config.CHATS_PATH}/${filename}.json`);
      ln.green("Chat: Finished saving to file");
    } catch (err) {
      ln.red("Chat: Error while saving to file");
      console.error(err);
    }
    ln.blank();
  }

  writeSaveToFile(filepath: string | null = null) {
    if (!filepath) filepath = `${config.OUTPUT_PATH}/chat_backup.json`;
    writeFileSync(filepath, this.json(), "utf-8");
  }

  json(): string {
    return JSON.stringify({
      messages: this.messages,
      condition: this.condition ?
        { name: this.condition.name, instructions: this.condition.instructions }
        : null,
      memory: this.memory ? this.memory.content : null,
    });
  }
}
