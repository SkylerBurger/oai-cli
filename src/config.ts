import dotenv from 'dotenv';

dotenv.config();

export default {
    GPT_MODEL: process.env.GPT_MODEL || 'gpt-3.5-turbo',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PRECONDITION_PATH: process.env.PRECONDITION_PATH,
    MESSAGES_STATE_INPUT_PATH: process.env.MESSAGES_STATE_INPUT_PATH,
    MESSAGES_STATE_OUTPUT_PATH: process.env.MESSAGES_STATE_OUTPUT_PATH,
}
