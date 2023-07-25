import chalk, { ChalkInstance } from "chalk";


const render = (format: ChalkInstance) => {
  return (content: string) => console.log(format(content));
}

export default {
  green: render(chalk.green),
  yellow: render(chalk.yellow),
  red: render(chalk.red),
  blueBanner: render(chalk.bgBlue),
  greenBanner: render(chalk.bgGreen),
  blank: () => console.log(),
  normal: (s: string) => console.log(s),
}
