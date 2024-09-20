import * as tts from "@diffusionstudio/vits-web";

let voiceId: tts.VoiceId;

async function initializeTTS(id: tts.VoiceId) {
  voiceId = id;
  try {
    console.log("initializing TTS", voiceId);
    await tts.download(voiceId, (progress) => {
      self.postMessage({
        type: "loadingProgress",
        progress: Math.round((progress.loaded * 100) / progress.total),
      });
    });
    console.log("TTS initialized", voiceId);
    self.postMessage({ type: "loadingComplete" });
  } catch (error) {
    console.error("Error initializing TTS:", error);
  }
}

async function synthesizeSpeech(text: string) {
  try {
    const blob = await tts.predict({ text, voiceId });
    self.postMessage({ type: "result", audio: blob });
  } catch (error) {
    console.error("Error synthesizing speech:", error);
  }
}

async function getAvailableVoices() {
  try {
    const voices = await tts.voices();
    self.postMessage({ type: "availableVoices", voices: voices.map((voice) => voice.key) });
  } catch (error) {
    console.error("Error getting available voices:", error);
  }
}

self.addEventListener("message", (event: { data: { type: string; voiceId: tts.VoiceId; text: string } }) => {
  void (async () => {
    if (event.data.type === "init") {
      await initializeTTS(event.data.voiceId);
    } else if (event.data.type === "speak") {
      await synthesizeSpeech(event.data.text);
    } else if (event.data.type === "getVoices") {
      await getAvailableVoices();
    }
  })();
});
