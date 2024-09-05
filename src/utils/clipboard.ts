/** IE, Safari, Edge, Chrome compatible clipboard copy */
export function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    void navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }
}
