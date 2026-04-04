import { spawn } from "node:child_process";
import { existsSync, statSync, watchFile, unwatchFile } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const serverEntry = path.resolve(artifactDir, "dist/index.mjs");

function startProcess(command, args) {
  return spawn(command, args, {
    cwd: artifactDir,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
    },
  });
}

function stopProcess(child) {
  if (!child || child.killed) {
    return;
  }

  child.kill("SIGTERM");
}

async function runInitialBuild() {
  await new Promise((resolve, reject) => {
    const build = startProcess("node", ["./build.mjs"]);

    build.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Initial build exited from signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`Initial build failed with exit code ${code}`));
        return;
      }

      resolve();
    });
  });
}

async function main() {
  await runInitialBuild();

  const buildWatcher = startProcess("node", ["./build.mjs", "--watch"]);
  let restartingServer = false;
  let serverProcess = null;
  let restartTimeout = null;
  let shuttingDown = false;

  const launchServer = () => {
    const child = startProcess("node", ["--enable-source-maps", "./dist/index.mjs"]);

    child.on("exit", (code) => {
      const wasRestarting = restartingServer;
      restartingServer = false;

      if (shuttingDown || wasRestarting) {
        return;
      }

      stopProcess(buildWatcher);
      process.exit(code ?? 0);
    });

    return child;
  };

  serverProcess = launchServer();

  const restartServer = () => {
    if (shuttingDown) {
      return;
    }

    if (restartTimeout) {
      clearTimeout(restartTimeout);
    }

    restartTimeout = setTimeout(() => {
      restartingServer = true;
      stopProcess(serverProcess);
      serverProcess = launchServer();
    }, 100);
  };

  let lastMtimeMs = existsSync(serverEntry) ? statSync(serverEntry).mtimeMs : 0;

  watchFile(serverEntry, { interval: 300 }, (current, previous) => {
    if (current.mtimeMs === 0 || current.mtimeMs === previous.mtimeMs) {
      return;
    }

    if (current.mtimeMs !== lastMtimeMs) {
      lastMtimeMs = current.mtimeMs;
      restartServer();
    }
  });

  const shutdown = () => {
    shuttingDown = true;
    unwatchFile(serverEntry);
    if (restartTimeout) {
      clearTimeout(restartTimeout);
    }
    stopProcess(serverProcess);
    stopProcess(buildWatcher);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  buildWatcher.on("exit", (code) => {
    if (code && code !== 0) {
      stopProcess(serverProcess);
      process.exit(code);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
