import dotenv from "dotenv";

dotenv.config();

export default {
  GPT_MODEL: process.env.GPT_MODEL || "gpt-3.5-turbo",
  LOG_COST: Boolean(process.env.LOG_COST) || true,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OUTPUT_PATH: process.env.OUTPUT_PATH || './output',
  PRECONDITION_PATH: process.env.PRECONDITION_PATH,
};
