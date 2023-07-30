import { Session } from "./session.js";


const session = new Session();

await session.configure();
session.begin();
