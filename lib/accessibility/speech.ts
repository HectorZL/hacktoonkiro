export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function createSpanishUtterance(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  const spanishVoice = window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith("es"));

  utterance.lang = spanishVoice?.lang ?? "es-ES";
  utterance.voice = spanishVoice ?? null;
  utterance.rate = 0.78;
  utterance.pitch = 1;
  return utterance;
}

export function stopSpeaking() {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

function speak(text: string, replaceCurrentSpeech: boolean) {
  if (!isSpeechSupported()) {
    return false;
  }

  const synthesis = window.speechSynthesis;
  if (replaceCurrentSpeech) {
    synthesis.cancel();
  }
  synthesis.resume();
  synthesis.speak(createSpanishUtterance(text));

  // Chrome/Brave can leave speechSynthesis paused after changing camera permissions
  // or cancelling a previous utterance. Resume again after the utterance is queued.
  window.setTimeout(() => synthesis.resume(), 100);
  return true;
}

export function speakInSpanish(text: string) {
  return speak(text, true);
}

export function queueInSpanish(text: string) {
  return speak(text, false);
}
