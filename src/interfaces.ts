import { Message } from "./message.js";


export interface ChatState {
  messages: {
    archive: Message[];
    recent: Message[];
  };
  condition: {
    name: string;
    instructions: string;
  };
}

export interface Condition {
  name: string;
  instructions: string;
}

export interface ContextSize {
  name: string;
  maxTokens: number;
  inputCost: number;
  outputCost: number
  tokenDenominator: number;
}