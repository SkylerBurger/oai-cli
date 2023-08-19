import { CreateCompletionResponseUsage } from "openai";

import { Message } from "./message.js";


export interface ChatResponse {
  message: Message, 
  cost: number, 
  tokenUsage: CreateCompletionResponseUsage | null
}

export interface ChatState {
  messages: {
    history: Message[];
  };
  condition: {
    name: string;
    instructions: string;
  };
  memory: string;
}

export interface ContextSize {
  name: string;
  maxTokens: number;
  inputCost: number;
  outputCost: number
  tokenDenominator: number;
}