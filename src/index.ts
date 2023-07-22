import { readFileSync, writeFileSync } from "fs";
import { encode } from "gpt-3-encoder";
import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi,
} from "openai";
import readline from "readline";

import { alarm, chalk_, good, notice } from "./chalk.js";
import config from "./config.js";

if (!config.OPENAI_API_KEY) throw Error("Missing OpenAI API Key.");

const configuration = new Configuration({
  apiKey: config.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const commandLineReader = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const createMessage = (
  roleType: ChatCompletionRequestMessageRoleEnum,
  messageText: string,
): ChatCompletionRequestMessage => {
  return { role: roleType, content: messageText };
};

var messages: ChatCompletionRequestMessage[] = [];
var preconditionMessage: ChatCompletionRequestMessage | null = null;
var messageStateInput: ChatCompletionRequestMessage[] | null = null;

const startUp = () => {
  console.log(chalk_.bgGreen("STARTING UP!"));

  if (config.PRECONDITION_PATH) {
    try {
      const text = readFileSync(config.PRECONDITION_PATH, "utf-8");
      preconditionMessage = JSON.parse(text);
      messages.push(preconditionMessage as ChatCompletionRequestMessage);
      console.log(good("  - System Precondition: Loaded"));
    } catch (error) {
      console.log(alarm("  - System Precondition: Not loaded - Failure"));
    }
  } else {
    console.log(notice("  - System Precondition: Not Provided"));
  }

  if (config.MESSAGES_STATE_INPUT_PATH) {
    try {
      const text = readFileSync(config.MESSAGES_STATE_INPUT_PATH, "utf-8");
      messageStateInput = JSON.parse(text);
      messages.concat(messageStateInput as ChatCompletionRequestMessage[]);
      console.log(good("  - Message State Input: Loaded"));
    } catch (err) {
      console.log(alarm("  - Message State Input: Not loaded - Failure"));
      console.error(err);
    }
  } else {
    console.log(good("  - Message State Input: "), notice("Not Provided"));
  }
  console.log("\n");
};

const estimateTokens = (): number => {
  let tokenCount = 0;
  messages.map((message) => {
    const encoded = encode(message.content as string);
    tokenCount += encoded.length;
  });
  return tokenCount;
};

const writeMessagesToFile = () => {
  if (config.MESSAGES_STATE_OUTPUT_PATH) {
    writeFileSync(
      config.MESSAGES_STATE_OUTPUT_PATH,
      JSON.stringify(messages, null, 4),
      "utf-8",
    );
  }
};

const requestCompletion = async (input: string) => {
  if (input.toLowerCase() === "n") {
    commandLineReader.close();
  }
  if (estimateTokens() > 13000) {
    await requestChatSummary();
  }
  messages.push(createMessage("user", input));
  console.log(notice(`Estimated Tokens: ${estimateTokens()} / 16,384`));
  console.log(notice("Awaiting reply..."));
  const chatCompletion = await openai.createChatCompletion({
    model: config.GPT_MODEL,
    messages: messages,
  });
  const responseText: string =
    chatCompletion?.data?.choices[0]?.message?.content || "NO RESPONSE FOUND";
  messages.push(createMessage("assistant", responseText));
  console.log(chalk_.bgGreen("\nRESPONSE:"), `\n${responseText}\n`);

  writeMessagesToFile();
  prompt();
};

const requestChatSummary = async () => {
  console.log(
    `REQUESTING SUMMARY  --  message: ${
      messages.length
    }, tokens: ${estimateTokens()}`,
  );
  const summaryRequestPrompt =
    "Please summarize the chat so far into a single paragraph that GPT would understand as a system message.";
  let summaryRequestMessages: ChatCompletionRequestMessage[] =
    messages.slice(1);
  summaryRequestMessages.push(createMessage("user", summaryRequestPrompt));

  const chatCompletion = await openai.createChatCompletion({
    model: config.GPT_MODEL,
    messages: summaryRequestMessages,
  });
  const responseText = chatCompletion?.data?.choices[0]?.message?.content;
  messages = [
    preconditionMessage as ChatCompletionRequestMessage,
    createMessage("system", `Chat History: ${responseText}`),
  ];
  console.log(
    notice(
      `COMPLETED SUMMARY -- meessage: ${
        messages.length
      }, tokens: ${estimateTokens()}`,
    ),
  );
};

const prompt = () => {
  console.log(chalk_.bgBlue("Prompt:"));
  commandLineReader.question("> ", requestCompletion);
};

commandLineReader.on("close", () => {
  process.exit();
});

// START
startUp();
prompt();
