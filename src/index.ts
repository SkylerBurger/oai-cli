import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'fs';
import { encode } from 'gpt-3-encoder';
import { 
  ChatCompletionRequestMessage, 
  ChatCompletionRequestMessageRoleEnum, 
  Configuration, 
  OpenAIApi } 
  from 'openai';
import readline from 'readline';

import config from './config.js';


if (!config.OPENAI_API_KEY) throw Error('Missing OpenAI API Key.');

const configuration = new Configuration({
  apiKey: config.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const commandLineReader = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const createMessage = (roleType: ChatCompletionRequestMessageRoleEnum, messageText: string): ChatCompletionRequestMessage => {
  return { role: roleType, content: messageText };
}

var messages: ChatCompletionRequestMessage[] = []
var preconditionMessage: ChatCompletionRequestMessage | null = null;
var messageStateInput: ChatCompletionRequestMessage[] | null = null;


const startUp = () => {
  console.log(chalk.bgGreen('STARTING UP!'));

  if (config.PRECONDITION_PATH) {
    try {
      const text = readFileSync(config.PRECONDITION_PATH, 'utf-8');
      preconditionMessage = JSON.parse(text);
      messages.push((preconditionMessage as ChatCompletionRequestMessage));
      console.log(chalk.green('  - System Precondition: Loaded'));
    } catch(error) {
      console.log(chalk.yellow('  - System Precondition: Not loaded - Failure'));
    }
  } else {
    console.log(chalk.yellow('  - System Precondition: Not Provided'));
  }

  if (config.MESSAGES_STATE_INPUT_PATH) {
    try {
      const text = readFileSync(config.MESSAGES_STATE_INPUT_PATH, 'utf-8');
      messageStateInput = JSON.parse(text);
      messages.concat((messageStateInput as ChatCompletionRequestMessage[]));
      console.log(chalk.green('  - Message State Input: Loaded'));
    } catch(error) {
      console.log(chalk.yellow('  - Message State Input: Not loaded - Failure'));
    }
  } else {
    console.log(chalk.yellow('  - Message State Input: Not Provided'));
  }
  console.log('\n');
}

const estimateTokens = (): number => {
  let tokenCount = 0;
  messages.map((message) => {
    const encoded = encode((message.content as string));
    tokenCount += encoded.length;
  });
  return tokenCount;
}

const writeMessagesToFile = () => {
  if (config.MESSAGES_STATE_OUTPUT_PATH){ 
    writeFileSync(
      config.MESSAGES_STATE_OUTPUT_PATH , 
      JSON.stringify(messages, null, 4), 
      'utf-8'
    );
  }
}

const requestCompletion = async (input: string) => {
  if (input.toLowerCase() === 'n') {
    commandLineReader.close();
  }
  if (estimateTokens() > 13000) {
    await requestChatSummary();
  }
  messages.push(createMessage('user', input));
  console.log(chalk.yellow(`Estimated Tokens: ${estimateTokens()} / 16,384`));
  console.log(chalk.yellow('Awaiting reply...'));
  const chatCompletion = await openai.createChatCompletion({
    model: config.GPT_MODEL,
    messages: messages,
  });
  const responseText: string = chatCompletion?.data?.choices[0]?.message?.content || 'NO RESPONSE FOUND';
  messages.push(createMessage('assistant', responseText));
  console.log(chalk.bgGreen('\nRESPONSE:'), `\n${responseText}\n`)

  writeMessagesToFile();
  prompt();
};


const requestChatSummary = async () => {
  console.log(`REQUESTING SUMMARY  --  message: ${messages.length}, tokens: ${estimateTokens()}`);
  const summaryRequestPrompt = 'Please summarize the chat so far into a single paragraph that GPT would understand as a system message.';
  let summaryRequestMessages: ChatCompletionRequestMessage[] = messages.slice(1);
  summaryRequestMessages.push(createMessage('user', summaryRequestPrompt));

  const chatCompletion = await openai.createChatCompletion({
    model: config.GPT_MODEL,
    messages: summaryRequestMessages
  });
  const responseText = chatCompletion?.data?.choices[0]?.message?.content;
  messages = [
    (preconditionMessage as ChatCompletionRequestMessage), 
    createMessage('system', `Chat History: ${responseText}`)
  ];
  console.log(chalk.yellow(`COMPLETED SUMMARY -- meessage: ${messages.length}, tokens: ${estimateTokens()}`));
}


const prompt = () => {
  console.log(chalk.bgBlue('Prompt:'))
  commandLineReader.question('> ', requestCompletion);
}

commandLineReader.on('close', () => {
  process.exit();
});

// START
startUp();
prompt();
