import { spawn } from "node:child_process";
import { Console } from "node:console";
import process from "node:process";

const console = new Console({ stdout: process.stdout, stderr: process.stderr });

const node = process.execPath;
const services = [
  {
    name: "API",
    child: spawn(node, ["--import", "tsx", "server/index.ts"], { stdio: "inherit" }),
  },
  {
    name: "Vite",
    child: spawn(node, ["node_modules/vite/bin/vite.js"], { stdio: "inherit" }),
  },
];

let stopping = false;
function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const { child } of services) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}

for (const { name, child } of services) {
  child.on("error", (error) => {
    console.error(`Could not start the ${name} process:`, error.message);
    stopAll(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(
        `${name} stopped (${signal ?? `exit code ${code ?? "unknown"}`}); stopping the other process.`,
      );
      stopAll(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
