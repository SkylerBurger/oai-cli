import dotenv from "dotenv";

dotenv.config();

export default {
  CHATS_PATH: process.env.CHATS_PATH || "./chats",
  INPUT_MAX_TOKENS: process.env.INPUT_MAX_TOKENS ? parseInt(process.env.INPUT_MAX_TOKENS) : 0,
  INPUT_PATH: process.env.INPUT_PATH || "./input",
  LOG_USAGE: process.env.LOG_USAGE || false,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OUTPUT_PATH: process.env.OUTPUT_PATH || "./output",
};
