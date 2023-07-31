# OAI-CLI: OpenAI CLI

OAI-CLI is a ChatGPT-like experience in the terminal. I'm using this project as a way to: become more familiar with TypeScript, refresh JavaScript knowledge, and experiment with the OpenAI API.

## My Vocab

This is how I refer to certain pieces of information in this project for clarity.

- **Chat Conversation:** The array of messages between you and the AI assistant.
- **Chat Session:** A specific combination of chat settings + chat conversation history.
- **Chat Settings:** The chosen GPT model, token limits, and condition selected for a chat session.
- **Condition:** A set of instructions used to condition future responses from the AI assistant. Can also be thought of as a "persona" but conditions can be instructional without providing a specific personality.

## Features

- Use your own OpenAI API key for access to the API and billing. All communication is directly between your machine and the OpenAI API.
- Chat converations via the OpenAI API are not used as training data by OpenAI (as of July 2023).
- Chat sessions can be saved to a JSON file and reloaded to pick up where you left off.
- Chat conversations can be pretty printed to a text file for archiving.
- Create and select from a collection of conditions, descriptions of personas or sets of instructions that inform how the AI responds during a chat session. Examples: 
  - A tutor for learning a new programming language that can make references back to a language you already know 
  - A fortune-teller that can reference any well-known divination system
  - A quiz gameshow host featuring a topic you're trying to learn
  - Someone of few words that responds to queries with only one or two paragraphs

## Setup

1. Download the repo to your machine.
2. Navigate to the root of the repo and compile the project, `npx tsc`.
3. Create a `.env` file in the root of the project and add your Open API key as `OPENAI_API_KEY` (or just export it directly to the environment with the same name).
4. Start the program, `npm start`.
5. Follow the prompts on screen to configure and start a new conversation or reload a previous conversation.
6. The state of the current chat session is backed up to file after each prompt. You can also choose to back up a chat session to file so it can be reloaded and continued later.

## Configure Environment

There are a few environment variables you can set in your `.env` or export directly into the environment to alter how the OAC-CLI operates.

- `CHATS_PATH: str = './chats'` - This is where OAI-CLI will look when backing up a chat session or when requested to load a previous chat session.
- `INPUT_PATH: str = './input'` - This is the location where OAI-CLI will look when loading or saving `conditions.json' for future chat sessions.
- `LOG_USAGE: bool = False` - When set to `True`, the OAI-CLI will include a printout after each response to give you an idea of how many tokens you're using, the overall size of the conversation being sent to OpenAI, and the estimated costs of your API usage. API usage costs are also printed to a `cost_log.txt` file in your `OUTPUT_PATH`.
- `OUTPUT_PATH: str = './output` - This is the location where OAI-CLI will save the backup of your current chat session and the cost log if enabled.

