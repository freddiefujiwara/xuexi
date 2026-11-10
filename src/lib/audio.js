// 中国語の発音再生。/music と同方式：
// GAS（xuexi-gas）が Google 翻訳 TTS の MP3 を base64 JSON で返し、
// フロントは Blob URL にして単一の <audio> で再生する。
// ブラウザから TTS を直接叩くことはしない。取得に失敗した場合は
// 端末の音声合成（speechSynthesis）にフォールバックする。
import { API_URL } from '../config.js';

export function ttsApiUrl(text) {
  return `${API_URL}?text=${encodeURIComponent(text)}`;
}

// /music の decodeBase64ToBlob と同じ実装。
export function decodeBase64ToBlob(base64, mime) {
  const binary = atob(String(base64 == null ? '' : base64));
  const chunkSize = 0x8000;
  const parts = [];
  for (let offset = 0; offset < binary.length; offset += chunkSize) {
    const chunk = binary.slice(offset, offset + chunkSize);
    const bytes = new Uint8Array(chunk.length);
    for (let i = 0; i < chunk.length; i += 1) bytes[i] = chunk.charCodeAt(i);
    parts.push(bytes);
  }
  return new Blob(parts, { type: mime || 'audio/mpeg' });
}

let audioEl = null;
const urlCache = new Map();
let activeText = null;
let activeState = null; // 'loading' | 'playing'
let requestSeq = 0;
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn({ text: activeText, state: activeState });
}

export function subscribeAudio(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function playingText() {
  return activeText;
}

export function audioState() {
  return activeState;
}

function getAudioEl() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.addEventListener('ended', () => {
      if (activeState === 'playing') {
        activeText = null;
        activeState = null;
        notify();
      }
    });
  }
  return audioEl;
}

function fallbackSpeak(text, seq) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (seq === requestSeq) {
      activeText = null;
      activeState = null;
      notify();
    }
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-CN';
  utt.rate = 0.95;
  const voice = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('zh'));
  if (voice) utt.voice = voice;
  const done = () => {
    if (seq === requestSeq && activeText === text) {
      activeText = null;
      activeState = null;
      notify();
    }
  };
  utt.onend = done;
  utt.onerror = done;
  synth.speak(utt);
}

export async function speakChinese(text) {
  if (!text) return;
  if (activeText === text) {
    stopAudio();
    return;
  }
  stopAudio();
  const seq = ++requestSeq;
  activeText = text;
  activeState = 'loading';
  notify();
  try {
    let url = urlCache.get(text);
    if (!url) {
      const res = await fetch(ttsApiUrl(text));
      const data = await res.json();
      if (!data || !data.ok || !data.audio) throw new Error('tts unavailable');
      url = URL.createObjectURL(decodeBase64ToBlob(data.audio, data.mimeType));
      urlCache.set(text, url);
    }
    if (seq !== requestSeq) return;
    const el = getAudioEl();
    el.src = url;
    activeState = 'playing';
    notify();
    await el.play();
  } catch (err) {
    if (seq !== requestSeq) return;
    activeState = 'playing';
    notify();
    fallbackSpeak(text, seq);
  }
}

export function stopAudio() {
  requestSeq += 1;
  if (audioEl) audioEl.pause();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (activeText !== null || activeState !== null) {
    activeText = null;
    activeState = null;
    notify();
  }
}
