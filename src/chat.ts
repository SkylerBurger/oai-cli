import { 
  appendFileSync, 
  existsSync, 
  mkdirSync,
  readFileSync, 
  writeFileSync, 
} from "fs";

import ln from "./formatting.js";
import config from "./config.js";
import { question } from "./input.js";
import { Message } from "./message.js";
import { Messages } from "./messages.js";
import { gpt3 } from "./models.js";
import { OAIClient } from "./openai.js";
import { CreateCompletionResponseUsage } from "openai";


interface Condition {
  name: string;
  condition: string;
}

interface ChatState {
  messages: {
    archive: Message[];
    list: Message[];
  };
  condition: {
    name: string;
    condition: string;
  };
}

export class Chat {
  client: OAIClient;
  conditionIndex: number;
  conditions: Condition[];
  messages: Messages;
  chatCost: number;

  constructor() {
    this.client = new OAIClient(gpt3);
    this.conditionIndex = 0;
    this.conditions = [];
    this.messages = new Messages();
    this.chatCost = 0;
  }

  async configure() {
    ln.greenBanner("STARTING UP!");
    const loadChatReply = await question("Reload previous chat? [y/N]");
    if (loadChatReply.toLowerCase() === "y") {
      try {
        await this.loadChat();
        ln.green(`Chat: ${this.messages.length - 1} Messages Loaded`);
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
      await this.loadConditions();
    }

    ln.blank();
    ln.green("Chat ready...");
    ln.blank();
  }

  async loadChat() { 
    const filename = await question(`Name of JSON file in chats directory (${config.CHATS_PATH})`);
    const chatString = readFileSync(
      `${config.CHATS_PATH}/${filename}.json`,
      "utf-8",
    )
    const chatState: ChatState = JSON.parse(chatString);
    this.messages.loadMessages(chatState.messages.archive, chatState.messages.list);
    this.addCondition(chatState.condition.name, chatState.condition.condition);
  }

  get condition() {
    return this.conditions[this.conditionIndex];
  }

  async loadConditions() {
    const loadCondition = await question('Load saved condition? [Y/n]');
    if (["y", ""].includes(loadCondition.toLowerCase())) {
      try {
        const filename = `${config.INPUT_PATH}/conditions.json`;
        const fileContent = readFileSync(filename, "utf-8");
        this.conditions = JSON.parse(fileContent);
        ln.green(`Conditions: ${this.conditions.length} loaded`);
        ln.blank()
        await this.selectCondition();
      } catch (err) {
        ln.red("Conditions: Failure while loading");
        console.error(err);
      }
    } else {
      const addConditionAnswer = await question('Add a condition? [Y/n]');
      if (["y", ""].includes(addConditionAnswer.toLowerCase())) {
        const name = await question('Condition Name: ');
        const conditionText = await question('Condition Instructions: ');
        await this.addCondition(name, conditionText);
      }
      const saveConditions = await question('Save current conditions to file? [Y/n]');
      if (["y", ""].includes(saveConditions.toLowerCase())) {
        this.saveConditions();
      }
    }
  }

  async addCondition(name: string, conditionText: string) {
    this.conditions.push({ name, condition: conditionText});
    this.conditionIndex = this.conditions.length - 1;
    ln.green(`Condition: "${this.condition.name}" added and set`);
  }

  async selectCondition() {
    for(let i = 0; i < this.conditions.length; i++) {
      ln.blueBanner(`[${i}] ${this.conditions[i].name}`);
      ln.normal(this.conditions[i].condition);
      ln.blank();
    }
    const response = await question("Enter number or [c]ancel");
    if (["c", ""].includes(response.toLowerCase())) {
      ln.yellow("Skipping...");
      return;
    }
    try {
      this.conditionIndex = parseInt(response);
      this.messages.loadCondition(this.condition.condition);
      ln.green(`Condition: "${this.condition.name}" Loaded`);
    } catch (err) {
      ln.red("Condition: Failed to load");
      console.error(err);
    }
  }

  saveConditions() {
    if (!existsSync(config.INPUT_PATH)) mkdirSync(config.INPUT_PATH);
    try {
      writeFileSync(
        `${config.INPUT_PATH}/conditions.json`,
        JSON.stringify(this.conditions),
        "utf-8",
      );
      ln.green("Conditions: Saved to file");
    } catch (err) {
      ln.red("Conditions: Error while saving to file");
      console.error(err);
    }
  }

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

  async prompt() {
    const input = await question("Prompt:");
    if (!input) {
      ln.blank();
      return;
    }
    // TODO: Add check to see recent chat needs to be compressed (summarize + archive)
    this.messages.addMessage({ role: "user", content: input});
    ln.yellow("Awaiting reply...");
    let response;
    try {
      response = await this.client.requestChatCompletion(this.messages.serializeForRequest());
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
    this.saveToFile();
  }

  async compressChat() {
    ln.yellow("Compressing via summary..."); 
    const { cost } = await this.messages.compress(this.client);
    this.logCost(cost);
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

  json(): string {
    return JSON.stringify({
      messages: this.messages,
      condition: this.condition
    });
  }

  saveToFile(filepath: string | null = null) {
    if (!filepath) filepath = `${config.OUTPUT_PATH}/chat_backup.json`;
    writeFileSync(filepath, this.json(), "utf-8");
  }

  async saveChat() {
    let filename = await question("Filename? ['chat_backup']") || "chat_backup";
    try {
      ln.yellow(`Saving chat to file...`);
      if (!existsSync(config.CHATS_PATH)) mkdirSync(config.CHATS_PATH);
      this.saveToFile(`${config.CHATS_PATH}/${filename}.json`);
      ln.green("Chat: Finished saving to file");
    } catch (err) {
      ln.red("Chat: Error while saving to file");
      console.error(err);
    }
    ln.blank();
  }

  get actionMap(): { [key: string]: () => Promise<void> | void } {
    return {
      "": async () => await this.prompt(),
      "p": async () => await this.prompt(),
      "s": async () => this.saveChat(),
      "t": async () => await this.transcribeChat(),
      "x": () => process.exit(),
    }
  }

  async selectAction() {
    ln.orange("Select an action:");
    ln.yellow("[P] Prompt (default) - [X] Close")
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

  async begin() {
    await this.prompt();

    while (true) {
      await this.selectAction();
    }
  }

}
