import { Session } from "./session.js";


const session = new Session();

await session.load();
session.selectAction();
