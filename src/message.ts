import { encode } from "gpt-3-encoder";
import { 
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum, 
  CreateCompletionResponseUsage, 
} from "openai"
import { removeStopwords, eng } from 'stopword';

import ln from './formatting.js';


export class Message {
  role: ChatCompletionRequestMessageRoleEnum;
  content: string;
  tokens: number;

  constructor(role: ChatCompletionRequestMessageRoleEnum, content: string, tokens: number | null = null) {
    this.role = role;
    this.content = content;
    this.tokens = tokens || this.encode(content);
  }

  setTokens(tokenUsage: CreateCompletionResponseUsage) {
    if (this.role == 'user') {
      const diff = tokenUsage['prompt_tokens'] - this.tokens;
      ln.yellow(`Diff in estimate to actual: ${diff}`);
      this. tokens = tokenUsage['prompt_tokens'];
    } else if (this.role == 'assistant') {
      const diff = tokenUsage['completion_tokens'] - this.tokens;
      ln.yellow(`Diff in estimate to actual: ${diff}`);
      this.tokens = tokenUsage['completion_tokens'];
    }
    // TODO: determine system messages from first request in a sequence.
  }

  encode(content: string | null): number {
    if (!content) content = this.content;
    if (!content) {
      console.log("nothing there.");
      throw Error(`No content found: ${content}`);
    }
    return encode(content).length;
  }

  serializeForRequest(reduceWords: boolean = false): ChatCompletionRequestMessage {
    let role = this.role;
    let content = '';
    if (reduceWords) {
      let goWords = removeStopwords(this.content.split(' '), eng);
      content = goWords.join(' ');
    } else {
      content = this.content;
    }
    return { role, content };
  }
}
