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
import { Messages } from "./messages.js";
import { gpt3 } from "./models.js";
import { OAIClient } from "./openai.js";
import { CreateCompletionResponseUsage } from "openai";


interface Condition {
  name: string;
  condition: string;
}

export class Session {
  client: OAIClient;
  conditionIndex: number;
  conditions: Condition[];
  messages: Messages;
  sessionCost: number;

  constructor() {
    this.client = new OAIClient(gpt3);
    this.conditionIndex = 0;
    this.conditions = [];
    this.messages = new Messages();
    this.sessionCost = 0;
  }

  async load() {
    ln.greenBanner("STARTING UP!");
    await this.loadConditions();

    const loadState = await question('Load previous state? [Y/n]');
    if (["y", ""].includes(loadState.toLowerCase())) {
      try {
        this.messages.loadState();
        ln.green(`  - Message State Input: ${this.messages.length - 1} Messages Loaded`);
        ln.blank();
        ln.green('Previously...'), 
        ln.normal(`${this.messages.last.content}`);

      } catch (err) {
        ln.red("  - Message State Input: Not loaded - Failure");
        console.error(err);
      }
    } else {
      ln.green("  - Message State Input:"), 
      ln.yellow("    Not Provided");
    }

    ln.blank();
  }

  get condition() {
    return this.conditions[this.conditionIndex];
  }

  async loadConditions() {
    const loadCondition = await question('Load systen precondition? [Y/n]');
    if (["y", ""].includes(loadCondition.toLowerCase())) {
      try {
        const filename = `${config.INPUT_PATH}/conditions.json`;
        const fileContent = readFileSync(filename, "utf-8");
        this.conditions = JSON.parse(fileContent);
        ln.green("  - Conditions: Loaded");
        ln.blank()
        await this.selectCondition();
      } catch (err) {
        ln.red("  - Conditions: Not loaded - Failure");
        console.error(err);
      }
    } else {
      const addConditionAnswer = await question('Add a condition? [Y/n]');
      if (["y", ""].includes(addConditionAnswer.toLowerCase())) {
        await this.addCondition();
      }
      const saveConditions = await question('Save current conditions to file? [Y/n]');
      if (["y", ""].includes(saveConditions.toLowerCase())) {
        await this.saveConditions();
      }
    }
    ln.blank();
  }

  async addCondition() {
    const name = await question('Condition Name: ');
    const conditionText = await question('Condition Instructions: ');
    this.conditions.push({ name, condition: conditionText});
    this.conditionIndex = this.conditions.length - 1;
    ln.green(`  - Condition: "${this.condition.name}" added and set`);
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
      ln.green(`  - Condition: "${this.condition.name}" Loaded`);
    } catch (err) {
      ln.red("  - Condition: Failed to load");
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
      ln.green("  - Conditions: Saved to file");
    } catch (err) {
      ln.red("Error while saving conditions to file...");
      console.error(err);
    }
  }

  logCost(requestCost: number) {
    this.sessionCost += requestCost;

    let costString = "Estimates" + 
      `- Request: $${requestCost.toFixed(3)} ` + 
      `- Session: $${this.sessionCost.toFixed(3)} ` + 
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
    ln.yellow(`Estimated cost of session: $${this.sessionCost.toFixed(3)}`);
  }

  logTokens(tokenUsage: CreateCompletionResponseUsage) {
    ln.yellow(`Request Tokens: ${tokenUsage['prompt_tokens']}`);
    ln.yellow(`Response Tokens: ${tokenUsage['completion_tokens']}`);
    ln.yellow(`Total Tokens: ${tokenUsage['total_tokens']}`);
  }

  async prompt() {
    const input = await question("Prompt");
    if (!input) return;
    this.messages.addMessage("user", input);
    ln.yellow("Awaiting reply...");
    let response;
    try {
      response = await this.client.requestChatCompletion(this.messages.current());
    } catch (err) {
      ln.red("Error while requesting chat completion...");
      console.error(err);
      return
    }
    this.messages.addMessage("assistant", response.message.content);
    ln.greenBanner("\nRESPONSE:");
    ln.normal(`${response.message.content}\n`);
    this.logCost(response.cost);
    if (response.tokenUsage) this.logTokens(response.tokenUsage);
    ln.blank();
    this.messages.saveState();
  }

  async compress() {
    ln.yellow("Compressing via summary..."); 
    const requestCost = await this.messages.compress(this.client);
    this.logCost(requestCost);
    // TODO:: log token usage/limits
  }

  reload() {
    ln.yellow("Reloading messages from state...");
    this.messages.reload();
    ln.green(`${this.messages.length} messages loaded...`);
    ln.blank();
    ln.green('Previously...'); 
    ln.normal(`${this.messages.last.content}\n`);
  }

  async save() {
    let prefix = await question("Filename? ['chat']: ") || "chat";
    const timestamp = new Date().getTime().toString();
    const filename = `${prefix} - ${timestamp}`;
    try {
      ln.yellow("Writing chat to file...");
      this.messages.saveChatToFile(filename);
      ln.green("~ Finished ~");
    } catch (err) {
      ln.red("Error while writing to file:");
      console.error(err);
    }
    ln.blank();
  }

  async backupState() {
    let prefix = await question("Filename? ['messages_state']: ") || "messages_state";
    const timestamp = new Date().getTime().toString();
    const filename = `${prefix} - ${timestamp}`;
    try {
      ln.yellow("Backing up state to file...");
      this.messages.backupMessagesState(filename);
      ln.green("~ Finished ~");
    } catch (err) {
      ln.red("Error while writing to file:");
      console.error(err);
    }
    ln.blank();
  }

  get actionMap(): { [key: string]: () => Promise<void> | void } {
    return {
      "": async () => await this.prompt(),
      "b": async () => await this.backupState(),
      "c": () => process.exit(),
      "p": async () => await this.prompt(),
      "r": () => this.reload(),
      "s": async () => this.save(),
    }
  }

  async selectAction() {
    ln.blueBanner("Select an action:");
    ln.blueBanner("[P] Prompt (default) - [B] Backup State")
    ln.blueBanner("[S] Save Chat - [R] Reload State - [C] Close ");
    const input = await question("");
    ln.blank();
    try {
      await this.actionMap[input]();
    } catch (err) {
      ln.normal("Try again...");
      ln.blank();
    }
    this.selectAction();
  }

}
