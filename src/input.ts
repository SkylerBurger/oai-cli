import readline from "readline";


const commandLineReader = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    commandLineReader.question(query, ans => resolve(ans));
  });
};
