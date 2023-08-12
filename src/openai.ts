import {
  ChatCompletionRequestMessage,
  CreateCompletionResponseUsage,
  Configuration,
  OpenAIApi,
} from "openai";

import config from "./config.js";
import { Message } from "./message.js";
import { GPTModel } from "./models.js";


interface RateLimits {
  requestsLimit: string,
  requestsRemaining: string,
  requestsResetCountdown: string,
  tokenLimit: string,
  tokensRemaining: string,
  tokensResetCountdown: string,
}

const configureApi = () => {
  if (!config.OPENAI_API_KEY) throw Error("Missing OpenAI API Key.");

  const configuration = new Configuration({
    apiKey: config.OPENAI_API_KEY,
  });

  return new OpenAIApi(configuration);
}

export class OAIClient {
  api: OpenAIApi;
  rateLimits: RateLimits | null;
  tokenUsage: CreateCompletionResponseUsage | null;
  model: GPTModel;

  constructor(model: GPTModel) {
    this.api = configureApi();
    this.model = model;
    this.rateLimits = null;
    this.tokenUsage = null;
  }

  calculateRequestCost() {
    if (!this.tokenUsage) return 0;

    // Calculation from OpenAI Docs: https://openai.com/pricing
    // (200 * 0.0015 + 850 * 0.002) / 1000 = $0.002
    return (this.tokenUsage.prompt_tokens * this.model.inputCost 
      + this.tokenUsage.completion_tokens * this.model.outputCost) 
      / this.model.tokenDenominator;
  }

  processRateLimits(headers: any) {
    if (!headers) this.rateLimits = null;
    this.rateLimits = {
      requestsLimit: headers['x-ratelimit-limit-requests'],
      requestsRemaining: headers['x-ratelimit-remaining-requests'],
      requestsResetCountdown: headers['x-ratelimit-reset-requests'],
      tokenLimit: headers['x-ratelimit-limit-tokens'],
      tokensRemaining: headers['x-ratelimit-remaining-tokens'],
      tokensResetCountdown: headers['x-ratelimit-reset-tokens'],  
    }
  }

  async requestChatCompletion(messages: ChatCompletionRequestMessage[]) {
    // TODO: Check if request fits current contextSize, upscale
    // If ((total_tokens + max_tokens) >= model_max_tokens) switch model;
    // Maybe a separate function because it will need to check next contextSize to see if it fits
    // Otherwise the current chat needs to be compressed and archived.

    const response = await this.api.createChatCompletion({
      model: this.model.name,
      messages: messages,
      // max_tokens: 400,
    });
    this.tokenUsage = response.data.usage || null;
    this.processRateLimits(response.request.res.headers || null);
    const content: string = response.data?.choices[0]?.message?.content || "NO RESPONSE FOUND";
    const assistantMessage = new Message("assistant", content)
    const cost: number = this.calculateRequestCost();
    return { message: assistantMessage, cost, tokenUsage: this.tokenUsage };
  }

  async requestChatSummary(messages: ChatCompletionRequestMessage[]) {
    const summaryRequestPrompt =
      "Please summarize the chat so far into a single paragraph that GPT would understand as a system message.";
    messages.push({ role: "user", content: summaryRequestPrompt});
    return await this.requestChatCompletion(messages);
  }
}
