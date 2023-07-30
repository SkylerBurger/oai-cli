import chalk, { ChalkInstance } from "chalk";


const render = (format: ChalkInstance) => {
  return (content: string) => console.log(format(content));
}

export default {
  blue: render(chalk.blue),
  green: render(chalk.green),
  yellow: render(chalk.yellow),
  orange: render(chalk.hex("#ff792b")),
  red: render(chalk.red),
  blueBanner: render(chalk.bgBlue),
  greenBanner: render(chalk.bgGreen),
  blank: () => console.log(),
  normal: (s: string) => console.log(s),
}
