class GPTModel {
  name: string;
  maxTokens: number;
  inputCost: number;
  outputCost: number;

  constructor(name:string, maxTokens: number, inputCost: number, outputCost: number) {
    this.name = name;
    this.maxTokens = maxTokens;
    this.inputCost = inputCost;
    this.outputCost = outputCost;
  }
}

export default {
  "gpt-3.5": new GPTModel("gpt-3.5-turbo", 4096, .00015, .0002),
  "gpt-3.5-16k": new GPTModel("gpt-3.5-turbo-16k", 16384, .003, .004),
  "gpt-4": new GPTModel("gpt-4", 8192, .003, .006),
  "gpt-4-32k": new GPTModel("gpt-4-32k", 32768, .006, .12)
}
