import { exec, ChildProcess } from "child_process";
import { promisify } from "util";
import { Settings } from "~/server/models/Settings";

const execAsync = promisify(exec);

let cloudflaredProcess: ChildProcess | null = null;

export async function startCloudflared(): Promise<string> {
  if (isCloudflaredRunning()) {
    throw new Error("Cloudflared is already running");
  }

  try {
    cloudflaredProcess = exec(
      `bunx --bun cloudflared tunnel --url http://localhost:${parseInt(process.env.PORT || "3000")} --metrics 127.0.0.1:`,
    );

    return new Promise((resolve, reject) => {
      let url: string | null = null;

      function handleOutput(data: Buffer) {
        const output = data.toString();
        console.log("Cloudflared output:", output);

        const rateLimitError = `failed to unmarshal quick Tunnel: invalid character 'e' looking for beginning of value`;
        if (output.includes(rateLimitError)) {
          reject(new Error("Your IP address is being rate-limited by Cloudflare, please try again later."));
        }

        const unknownError = /failed to request quick Tunnel:(\w+)/.exec(output);
        if (unknownError) {
          reject(new Error(`Unknown error: ${unknownError[1]}`));
        }

        const match = /https:\/\/[^\s]+\.trycloudflare\.com/.exec(output);
        if (match && !url) {
          url = match[0];
          void Settings.setValue("remoteAccessUrl", url).catch((error) => {
            console.error("Failed to set remote access URL:", error);
          });
          resolve(url);
        }
      }
      // For some reason, the output is sent to stderr
      cloudflaredProcess!.stderr?.on("data", handleOutput);
      cloudflaredProcess!.stdout?.on("data", handleOutput);

      cloudflaredProcess!.on("exit", (code) => {
        cloudflaredProcess = null;
        void Settings.setValue("remoteAccessUrl", null);
        if (!url) {
          reject(new Error("Cloudflared process exited before URL was obtained"));
        }
      });
    });
  } catch (error) {
    console.error("Failed to start Cloudflared:", error);
    throw error;
  }
}

export async function stopCloudflared(): Promise<void> {
  if (!isCloudflaredRunning()) {
    console.log("Cloudflared is not running");
    return;
  }

  try {
    if (cloudflaredProcess) {
      cloudflaredProcess.kill();
      cloudflaredProcess = null;
    }
    await Settings.setValue("remoteAccessUrl", null);
  } catch (error) {
    console.error("Failed to stop Cloudflared:", error);
    throw error;
  }
}

export function isCloudflaredRunning(): boolean {
  if (cloudflaredProcess === null) {
    return false;
  }

  return !cloudflaredProcess.killed && cloudflaredProcess.exitCode === null;
}

export async function getCloudflaredStatus(): Promise<{ running: boolean; url: string | null }> {
  const running = isCloudflaredRunning();
  const url = await Settings.getValue<string>("remoteAccessUrl");

  return { running, url };
}
