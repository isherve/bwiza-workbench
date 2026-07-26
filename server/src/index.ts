import "dotenv/config";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 8787);
const app = createApp();

app.listen(PORT, () => {
  console.log(`Bwiza Workbench API running on http://localhost:${PORT}`);
});
