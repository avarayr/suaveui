import { ChildProcess, spawn } from "child_process";
import { Settings } from "~/server/models/Settings";
import { isUrlAlive } from "~/server/lib/urlCheck";

let cloudflaredProcess: ChildProcess | null = null;

export const startCloudflared = async (): Promise<string> => {
  const existingUrl = await Settings.getValue<string>("remoteAccessUrl");
  if (existingUrl) {
    const isAlive = await isUrlAlive(existingUrl);
    if (isAlive) return existingUrl;
    // If the existing URL is not alive, clear it and start a new tunnel
    await Settings.setValue("remoteAccessUrl", null);
  }

  stopCloudflared();

  return new Promise<string>((resolve, reject) => {
    cloudflaredProcess = spawn(
      "bunx",
      ["cloudflared", "tunnel", "--url", `http://localhost:${process.env.PORT || 3000}`],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    cloudflaredProcess.stderr?.on("data", (data) => {
      const output = (data as Buffer).toString();
      console.log("-0-", output);
      const regex = /https:\/\/.*\.trycloudflare\.com/;
      const match = regex.exec(output);
      if (match) {
        const url = match[0];
        void Settings.setValue("remoteAccessUrl", url);
        resolve(url);
      }
    });

    cloudflaredProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`cloudflared exited with code ${code}`));
      }
      cloudflaredProcess = null;
    });

    setTimeout(() => {
      reject(new Error("Timed out waiting for cloudflared URL"));
    }, 30000);
  });
};

export const stopCloudflared = () => {
  if (cloudflaredProcess) {
    cloudflaredProcess.kill();
    cloudflaredProcess = null;
  }
};
