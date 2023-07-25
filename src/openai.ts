import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  CreateCompletionResponseUsage,
  Configuration,
  OpenAIApi,
} from "openai";

import config from "./config.js";


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

  constructor() {
    this.api = configureApi();
    this.rateLimits = null;
    this.tokenUsage = null;
  }

  createMessage(role: ChatCompletionRequestMessageRoleEnum, content: string): ChatCompletionRequestMessage {
    return { role, content };
  }

  calculateRequestCost() {
    if (!this.tokenUsage) return 0;

    const tokenDenominator = 1000;
    const inputCost = 0.003;
    const outputCost = 0.004;

    // Calculation from OpenAI Docs: https://openai.com/pricing
    // (200 * 0.0015 + 850 * 0.002) / 1000 = $0.002
    return (this.tokenUsage.prompt_tokens * inputCost + this.tokenUsage.completion_tokens * outputCost) / tokenDenominator;
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
    const response = await this.api.createChatCompletion({
      model: config.GPT_MODEL,
      messages: messages,
    });
    this.tokenUsage = response.data.usage || null;
    this.processRateLimits(response.request.res.headers || null);
    const responseText: string = response.data?.choices[0]?.message?.content || "NO RESPONSE FOUND";
    const requestCost: number = this.calculateRequestCost();
    return { responseText, requestCost };
  }

  async requestChatSummary(messages: ChatCompletionRequestMessage[], logCost: boolean) {
    const summaryRequestPrompt =
      "Please summarize the chat so far into a single paragraph that GPT would understand as a system message.";
    let summaryRequestMessages: ChatCompletionRequestMessage[] = messages.slice(1);
    summaryRequestMessages.push(this.createMessage("user", summaryRequestPrompt));

    return await this.requestChatCompletion(summaryRequestMessages);
  }
}
