import readline from "readline";

import ln from "./formatting.js";


const commandLineReader = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    if (query !== "") ln.orange(query);
    commandLineReader.question("> ", ans => resolve(ans));
  });
};
