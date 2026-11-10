// 中国語音声（gTTS で生成した MP3 は public/audio/ に同梱）の再生。
const base = import.meta.env.BASE_URL || '/';

export function audioPath(file) {
  return `${base}audio/${file}`;
}

export function cardAudioFile(card) {
  return card && card.id ? `${card.id}.mp3` : null;
}

export function drillAudioFile(drill, part) {
  return drill && drill.id ? `${drill.id}${part}.mp3` : null;
}

// 間違いノートは、正解文が1文に定まるものだけ音声がある。
const MISTAKE_AUDIO = {
  m001: 'm001.mp3',
  m003: 'm003.mp3',
  m004: 'm004.mp3',
  m005: 'm005.mp3',
};

export function mistakeAudioFile(mistake) {
  return (mistake && MISTAKE_AUDIO[mistake.id]) || null;
}

let activeAudio = null;
let activeFile = null;
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(activeFile);
}

export function subscribeAudio(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function playingFile() {
  return activeFile;
}

export function playAudio(file) {
  if (!file) return;
  if (activeAudio && activeFile === file) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
    activeFile = null;
    notify();
    return;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
    activeFile = null;
  }
  const audio = new Audio(audioPath(file));
  activeAudio = audio;
  activeFile = file;
  const clear = () => {
    if (activeAudio === audio) {
      activeAudio = null;
      activeFile = null;
      notify();
    }
  };
  audio.addEventListener('ended', clear);
  audio.addEventListener('error', clear);
  notify();
  const p = audio.play();
  if (p && typeof p.catch === 'function') p.catch(clear);
}

export function stopAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
    activeFile = null;
    notify();
  }
}
