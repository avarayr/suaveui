export async function isUrlAlive(url: string, timeout = 5000): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(timeout) });
    console.log("response", response);
    return response.ok;
  } catch (error) {
    console.error(`HEAD request failed for ${url}:`, error);
    return false;
  }
}
