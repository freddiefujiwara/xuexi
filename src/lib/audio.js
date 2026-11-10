// 中国語の発音をリアルタイムに再生する。
// gTTS と同じ Google 翻訳 TTS エンドポイントをブラウザから直接叩き、
// 取得できなければ端末の音声合成（speechSynthesis）にフォールバックする。
// 音声ファイルは保持しない。
const TTS_BASE = 'https://translate.google.com/translate_tts';

export function googleTtsUrl(text, lang = 'zh-CN') {
  return `${TTS_BASE}?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
}

let activeAudio = null;
let activeText = null;
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(activeText);
}

export function subscribeAudio(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function playingText() {
  return activeText;
}

function clearActive() {
  activeAudio = null;
  activeText = null;
  notify();
}

function fallbackSpeak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    clearActive();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-CN';
  utt.rate = 0.95;
  const voice = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('zh'));
  if (voice) utt.voice = voice;
  utt.onend = () => {
    if (activeText === text) clearActive();
  };
  utt.onerror = utt.onend;
  synth.speak(utt);
}

export function speakChinese(text) {
  if (!text) return;
  if (activeText === text) {
    stopAudio();
    return;
  }
  stopAudio();
  activeText = text;
  const audio = new Audio(googleTtsUrl(text));
  activeAudio = audio;
  let fellBack = false;
  const onFail = () => {
    if (activeAudio !== audio || fellBack) return;
    fellBack = true;
    activeAudio = null;
    fallbackSpeak(text);
  };
  audio.addEventListener('ended', () => {
    if (activeAudio === audio) clearActive();
  });
  audio.addEventListener('error', onFail);
  notify();
  const p = audio.play();
  if (p && typeof p.catch === 'function') p.catch(onFail);
}

export function stopAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (activeText !== null) clearActive();
}
