import dotenv from "dotenv";

dotenv.config();

export default {
  INPUT_PATH: process.env.INPUT_PATH || './input',
  LOG_USAGE: process.env.LOG_USAGE || false,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OUTPUT_PATH: process.env.OUTPUT_PATH || './output',
};
