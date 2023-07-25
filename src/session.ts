import { 
  appendFileSync, 
  existsSync, 
  mkdirSync, 
  writeFileSync, 
} from "fs";

import ln from "./formatting.js";
import config from "./config.js";
import { question } from "./input.js";
import { Messages } from "./messages.js";
import { OAIClient } from "./openai.js";


export class Session {
  client: OAIClient;
  messages: Messages;
  sessionCost: number;

  constructor() {
    this.client = new OAIClient;
    this.messages = new Messages();
    this.sessionCost = 0;
  }

  async load() {
    ln.greenBanner("STARTING UP!");

    const loadCondition = await question('Load systen precondition? [Y/n]: ');
    if (["y", ""].includes(loadCondition.toLowerCase())) {
      try {
        this.messages.loadPrecondition();
        ln.green("  - System Precondition: Loaded");
      } catch (err) {
        ln.red("  - System Precondition: Not loaded - Failure");
        console.error(err);
      }
    } else {
      ln.green("  - System Precondition:")
      ln.yellow("    Not Provided");
    }

    const loadState = await question('Load previous state? [Y/n]: ');
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

  async prompt() {
    ln.blueBanner("Prompt:");
    const input = await question("> ");
    if (!input) return;
    const promptMessage = this.client.createMessage("user", (input as string));
    this.messages.push(promptMessage);
    ln.yellow("Awaiting reply...");

    const { responseText, requestCost } = await this.client.requestChatCompletion(this.messages.list);
    const responseMessage = this.client.createMessage("assistant", responseText);
    this.messages.push(responseMessage);
    // TODO: log token usage/limits
    ln.greenBanner("\nRESPONSE:");
    ln.normal(`${responseText}\n`);
    this.logCost(requestCost);
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
    const input = await question("> ");
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
