import { appendFileSync } from "fs";

import { chalk_, alarm, good, notice } from "./chalk.js";
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
    console.log(chalk_.bgGreen("STARTING UP!"));

    const loadCondition = await question('Load systen precondition? [Y/n]: ');
      // TODO: better handling of condition here and again for previous state
      if ((loadCondition as string).toLowerCase() === "y" || (loadCondition as string).toLowerCase() === "") {
        try {
          this.messages.loadPrecondition();
          console.log(good("  - System Precondition: Loaded"));
        } catch (err) {
          console.log(alarm("  - System Precondition: Not loaded - Failure"));
          console.error(err);
        }
      } else {
        console.log(notice("  - System Precondition: Not Provided"));
      }

    const loadState = await question('Load previous state? [Y/n]: ');
      if ((loadState as string).toLowerCase() === "y" || (loadState as string).toLowerCase() === "") {
        try {
          this.messages.loadState();
          console.log(good(`  - Message State Input: ${this.messages.length - 1} Messages Loaded`));
          console.log('\n', good('Previously...'), `\n${this.messages.last.content}`);

        } catch (err) {
          console.log(alarm("  - Message State Input: Not loaded - Failure"));
          console.error(err);
        }
      } else {
        console.log(good("  - Message State Input: "), notice("Not Provided"));
      }

      console.log("\n");
  }

  writeCostToFile(requestCost: number) {
    let costString = `Estimates - Request: $${requestCost.toFixed(3)} - Session: $${this.sessionCost.toFixed(3)}`;
    costString += ` - Messages: ${this.messages.length}`;
    costString += "\n";

    appendFileSync(
      `${config.OUTPUT_PATH}/cost_log.txt`,
      costString,
    );
  }
  
  logCost(requestCost: number) {
    this.sessionCost += requestCost;
    console.log(notice(`Estimated cost of request: $${requestCost.toFixed(3)}`));
    console.log(notice(`Estimated cost of session: $${this.sessionCost.toFixed(3)}`));
  }

  async prompt() {
    console.log(chalk_.bgBlue("Prompt:"));
    const input = await question("> ");
    const promptMessage = this.client.createMessage("user", (input as string));
    this.messages.push(promptMessage);
    console.log(notice("Awaiting reply..."));

    const { responseText, requestCost } = await this.client.requestChatCompletion(this.messages.list);
    const responseMessage = this.client.createMessage("assistant", responseText);
    this.messages.push(responseMessage);
    this.logCost(requestCost);
    this.writeCostToFile(requestCost);
    // TODO: log token usage/limits
    console.log(chalk_.bgGreen("\nRESPONSE:"), `\n${responseText}\n`);
    this.messages.writeToFile();
  }

  async compress() {
    console.log(notice("Compressing via summary...")); 
    const requestCost = await this.messages.compress(this.client);
    this.logCost(requestCost);
    this.writeCostToFile(requestCost);
    // TODO:: log token usage/limits
  }

  reload() {
    console.log(notice("Reloading messages from state..."))
    this.messages.reload();
    console.log(notice(`${this.messages.length} messages loaded...`))
  }

  async selectAction() {
    console.log(chalk_.bgBlue("Select an action:"));
    const input = await question("[P] Prompt - [S] Save - [R] Reload - [C] Close: ");
    switch((input as string).toLowerCase()) {
      case "c":
        process.exit();
      case "p":
        await this.prompt();
      case "r":
        this.reload();
      default:
        await this.selectAction();
    }
    await this.selectAction();
  }

}
