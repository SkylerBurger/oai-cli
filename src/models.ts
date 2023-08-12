import { ContextSize } from "./interfaces.js";


export class GPTModel {
  contextSizes: ContextSize[];
  currentSizeIndex: number;

  constructor(contextSizes: ContextSize[] = []) {
    this.contextSizes = contextSizes;
    this.currentSizeIndex = 0;
  }

  get name() {
    return this.contextSizes[this.currentSizeIndex].name;
  }

  get maxTokens() {
    return this.contextSizes[this.currentSizeIndex].maxTokens;
  }

  get inputCost() {
    return this.contextSizes[this.currentSizeIndex].inputCost;
  }

  get outputCost() {
    return this.contextSizes[this.currentSizeIndex].outputCost;
  }

  get tokenDenominator() {
    return this.contextSizes[this.currentSizeIndex].tokenDenominator;
  }

  downscale() {
    if (this.currentSizeIndex > 0) {
      this.currentSizeIndex--;
    }
  }

  upscale() {
    if (this.currentSizeIndex + 1 < this.contextSizes.length) {
      this.currentSizeIndex++;
    }
  }
}

export const gpt3 = new GPTModel(
  [
    { name: "gpt-3.5-turbo", maxTokens: 4096, inputCost: .0015, outputCost: .002, tokenDenominator: 1000},
    { name: "gpt-3.5-turbo-16k", maxTokens: 16384, inputCost: .003, outputCost: .004, tokenDenominator: 1000},
  ]
)

export const gpt4 = new GPTModel(
  [
    { name: "gpt-4", maxTokens: 8192, inputCost: .03, outputCost: .06, tokenDenominator: 1000},
    { name: "gpt-4-32k", maxTokens: 32768, inputCost: .006, outputCost: .012, tokenDenominator: 1000},
  ]
)
