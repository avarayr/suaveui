export const camelCaseToSpaced = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])/g, " $1")
    // first letter of each word is capitalized
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());

export const base64ToUint8Array = (base64: string) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(b64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const getBase64FromArrayBuffer = (arrayBuffer: ArrayBuffer) => {
  return window.btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
};
