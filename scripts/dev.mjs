import { spawn } from "node:child_process";
import { Console } from "node:console";
import process from "node:process";

const console = new Console({ stdout: process.stdout, stderr: process.stderr });

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npm, ["run", "dev:server"], { stdio: "inherit" }),
  spawn(npm, ["run", "dev:vite"], { stdio: "inherit" }),
];

let stopping = false;
function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("Could not start the development process:", error.message);
    stopAll(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(
        `A development process stopped (${signal ?? code ?? "unknown"}); stopping the other process.`,
      );
      stopAll(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
