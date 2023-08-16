import { existsSync,mkdirSync, readFileSync, writeFileSync } from "fs";
import { encode } from "gpt-3-encoder";
import { ChatCompletionRequestMessage } from "openai";

import config  from "./config.js";
import ln from "./formatting.js";
import { question } from "./input.js";


export class Condition {
  name: string;
  instructions: string;
  tokens: number;

  constructor(name: string, instructions: string) {
    this.name = name;
    this.instructions = instructions;
    this.tokens = encode(`system ${this.instructions}`).length;
  }

  serializeForRequest(): ChatCompletionRequestMessage {
    return { role: "system", content: this.instructions }
  }
}

export class ConditionManager {
  conditions: Condition[]

  constructor() {
    this.conditions = this.loadSavedConditions()
  }

  get last(): Condition | null {
    return this.conditions ? this.conditions[this.conditions.length - 1] : null;
  }

  loadSavedConditions() {
    const filename = `${config.INPUT_PATH}/conditions.json`;
    if (!existsSync(filename)) return [];

    try {
      const fileContent = readFileSync(filename, "utf-8");
      const loadedConditions: [] = JSON.parse(fileContent);
      ln.green(`Conditions: ${loadedConditions.length} loaded`);
      ln.blank()
      return loadedConditions.map((loadedCondition: {name: string, instructions: string}) => {
        return new Condition(loadedCondition.name, loadedCondition.instructions)
      })
    } catch (err) {
      ln.red("Conditions: Failure while loading");
      console.error(err);
      return [];
    }
  }

  async addCondition(): Promise<Condition | null> {
    const addConditionAnswer = await question('Add a condition? [Y/n]');
    if (["y", ""].includes(addConditionAnswer.toLowerCase())) {
      const name = await question('Condition Name: ');
      const instructions = await question('Condition Instructions: ');
      const newCondition = new Condition(name, instructions);
      this.conditions.push(newCondition);
      ln.green(`Condition Added: ${ newCondition.name }`);
      return newCondition
    }
    return null;
  }

  async selectCondition() {
    for(let i = 0; i < this.conditions.length; i++) {
      ln.blueBanner(`[${i}] ${this.conditions[i].name}`);
      ln.normal(this.conditions[i].instructions);
      ln.blank();
    }
    const response = await question("Enter number or [c]ancel");
    if (["c", ""].includes(response.toLowerCase())) {
      ln.yellow("Skipping...");
      return;
    }
    try {
      return this.conditions[parseInt(response)];
    } catch (err) {
      ln.red("Condition Failed to load");
      console.error(err);
    }
  }

  async configureConditions(): Promise<Condition | null> {
    // Flow for saved Conditions
    if (this.conditions.length) {
      const selectConfirmation = await question("Select a loaded condition? [Y/n]");
      if (["y", ""].includes(selectConfirmation.toLowerCase())) {
        return await this.selectCondition() || null;
      } else {
        return await this.addCondition();
      }
    }
    // Flow for no saved Conditions
    return await this.addCondition();
  }

  serializeToSave(): string {
    return JSON.stringify(this.conditions.map(condition => {
      return{ name: condition.name, instructions: condition.instructions};
    }));
  }

  saveConditions() {
    if (!existsSync(config.INPUT_PATH)) mkdirSync(config.INPUT_PATH);
    try {
      writeFileSync(
        `${config.INPUT_PATH}/conditions.json`,
        this.serializeToSave(),
        "utf-8",
      );
      ln.green("Conditions: Saved to file");
    } catch (err) {
      ln.red("Conditions: Error while saving to file");
      console.error(err);
    }
  }
}