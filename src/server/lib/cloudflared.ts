import { exec, ChildProcess } from "child_process";
import { promisify } from "util";
import { Settings } from "~/server/models/Settings";

const execAsync = promisify(exec);

let cloudflaredProcess: ChildProcess | null = null;

export async function startCloudflared(): Promise<string> {
  if (await isCloudflaredRunning()) {
    throw new Error("Cloudflared is already running");
  }

  try {
    cloudflaredProcess = exec(`cloudflared tunnel --url http://localhost:${parseInt(process.env.PORT || "3000")}`);

    return new Promise((resolve, reject) => {
      let url: string | null = null;

      // For some reason, the output is sent to stderr
      cloudflaredProcess!.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();

        const match = /https:\/\/[^\s]+\.trycloudflare\.com/.exec(output);
        if (match && !url) {
          url = match[0];
          void Settings.setValue("remoteAccessUrl", url).catch((error) => {
            console.error("Failed to set remote access URL:", error);
          });
          resolve(url);
        }
      });

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
  if (!(await isCloudflaredRunning())) {
    console.log("Cloudflared is not running");
    return;
  }

  try {
    await execAsync("pkill cloudflared");
    cloudflaredProcess = null;
    await Settings.setValue("remoteAccessUrl", null);
  } catch (error) {
    console.error("Failed to stop Cloudflared:", error);
    throw error;
  }
}

export async function isCloudflaredRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("pgrep cloudflared");
    return stdout.trim() !== "";
  } catch (error) {
    return false;
  }
}

export async function getCloudflaredStatus(): Promise<{ running: boolean; url: string | null }> {
  const running = await isCloudflaredRunning();
  const url = await Settings.getValue<string>("remoteAccessUrl");

  if (running && !url) {
    // Cloudflared is running but we don't have a URL stored
    // This could happen if the process was started externally
    await stopCloudflared(); // Stop the unexpected process
    return { running: false, url: null };
  }

  if (!running && url) {
    // Cloudflared is not running but we have a URL stored
    // This could happen if the process was killed externally
    await Settings.setValue("remoteAccessUrl", null);
    return { running: false, url: null };
  }

  return { running, url };
}
