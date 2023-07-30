import dotenv from "dotenv";

dotenv.config();

export default {
  INPUT_PATH: process.env.INPUT_PATH || './input',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OUTPUT_PATH: process.env.OUTPUT_PATH || './output',
};
