const { runApp } = require("./app");

runApp().catch((error) => {
  console.error("The generator crashed.");
  console.error(error);
  process.exitCode = 1;
});
