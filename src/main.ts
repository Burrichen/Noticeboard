import { runGeneratorApp } from "./generator";

runGeneratorApp().catch((error: unknown) => {
  console.error("The generator crashed.");
  console.error(error);
  process.exitCode = 1;
});