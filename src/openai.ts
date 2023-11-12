import OpenAI, {
  ChatCompletionRequestMessage,
  CreateCompletionResponseUsage,
  Configuration,
  OpenAIApi,
  ImagesResponse,
  CreateImageRequest,
} from "openai";

import config from "./config.js";
import { Message } from "./message.js";
import { GPTModel } from "./models.js";
import { ChatResponse } from "./interfaces.js";


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

  async requestChatCompletion(messages: ChatCompletionRequestMessage[]): Promise<ChatResponse> {
    const response = await this.api.createChatCompletion({
      model: this.model.name,
      messages: messages,
    });
    this.tokenUsage = response.data.usage || null;
    this.processRateLimits(response.request.res.headers || null);
    const content: string = response.data?.choices[0]?.message?.content || "NO RESPONSE FOUND";
    const assistantMessage = new Message("assistant", content)
    const cost: number = this.calculateRequestCost();
    return { message: assistantMessage, cost, tokenUsage: this.tokenUsage };
  }

  async requestImageGeneration(prompt: string) {
    const response = await this.api.createImage({
      prompt: prompt,
      n:1,
      size: "1024x1024",
    });
    return response.data;
  }

  async requestChatSummary(messages: ChatCompletionRequestMessage[]) {
    const summaryRequestPrompt =
    "Please write a condensed summary the chat so far that GPT would understand as a system message. After the summary paragraph include a list of each character in the story so far. Include their name and a short description of them.";
    messages.push({ role: "user", content: summaryRequestPrompt});
    return await this.requestChatCompletion(messages);
  }
}
