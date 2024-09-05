import https from "https";

export async function isUrlAlive(url: string, timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const request = https.get(url, { timeout }, (response) => {
      // Any response means the server is up
      resolve(true);
      request.destroy();
    });

    request.on("error", (err) => {
      console.error(`Error checking URL ${url}:`, err.message);
      resolve(false);
    });

    request.on("timeout", () => {
      console.error(`Request to ${url} timed out after ${timeout}ms`);
      request.destroy();
      resolve(false);
    });
  });
}

export async function pollUrlUntilAlive(url: string): Promise<boolean> {
  const MAX_RETRIES = 10;
  const RETRY_DELAY = 2000; // 2 seconds

  for (let i = 0; i < MAX_RETRIES; i++) {
    const isAlive = await isUrlAlive(url);
    if (isAlive) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  }
  return false;
}
