import { createApp } from "../server/src/app.js";
import { memoryStore } from "../server/src/store-memory.js";

export default createApp(memoryStore);
