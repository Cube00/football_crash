import { settingsStore } from "./settingsStore";

/**
 * UI sound effects.
 *
 * Playback is a plain module function rather than a hook: the controls that
 * make noise are leaf components, and every one of them would otherwise have to
 * thread the `sound` setting down from somewhere. `playSound` reads the setting
 * straight off the store at the moment of the click.
 */
export const Sound = {
  /** Every small control — menu, toggles, steppers, presets. */
  SmallButton: "smallButton",
  Bet: "bet",
  Cashout: "cashout",
  Cancel: "cancel",
} as const;

export type Sound = (typeof Sound)[keyof typeof Sound];

const SOURCES: Record<Sound, string> = {
  // The file really is spelled "samllbutton" — matching the asset, not fixing it.
  [Sound.SmallButton]: "/sounds/samllbutton.webm",
  [Sound.Bet]: "/sounds/button.webm",
  [Sound.Cashout]: "/sounds/cashout.webm",
  [Sound.Cancel]: "/sounds/cancel.webm",
};

/**
 * Where the audible part of each clip begins, in seconds.
 *
 * Measured off the files: they all open with 40–110ms of silence, and
 * `samllbutton`/`button` then sit in silence for another three seconds. Playing
 * from 0 puts that lead-in between the click and its sound, which reads as lag.
 * Trimming the assets would make this table unnecessary.
 */
const START_AT: Record<Sound, number> = {
  [Sound.SmallButton]: 0.1,
  [Sound.Bet]: 0.09,
  [Sound.Cashout]: 0.03,
  [Sound.Cancel]: 0.04,
};

/**
 * Clips held per sound. One would cut itself off when a control is tapped twice
 * quickly — three lets the tail of the first ring out under the second.
 */
const VOICES = 3;

interface Pool {
  clips: HTMLAudioElement[];
  next: number;
}

function makeClip(sound: Sound): HTMLAudioElement {
  const clip = new Audio(SOURCES[sound]);
  clip.preload = "auto";
  return clip;
}

const pools = new Map<Sound, Pool>();

function pool(sound: Sound): Pool | null {
  if (typeof Audio === "undefined") return null;

  let entry = pools.get(sound);
  if (!entry) {
    entry = { clips: [makeClip(sound)], next: 0 };
    pools.set(sound, entry);
  }
  return entry;
}

/**
 * Fetches every clip, so the first click is not the one that waits.
 *
 * Deliberately not called at boot: a browser will not play audio before the
 * page has been interacted with anyway, so fetching a few hundred KB while the
 * game is still painting buys nothing and competes with the canvas. The first
 * gesture arms it — by which point the sound is allowed to play.
 */
export function preloadSounds() {
  for (const sound of Object.values(Sound)) pool(sound);
}

/** Warms the pools on the first pointer or key press, then gets out of the way. */
export function preloadSoundsOnFirstGesture(): () => void {
  const warm = () => {
    if (settingsStore.getSnapshot().sound) preloadSounds();
    document.removeEventListener("pointerdown", warm);
    document.removeEventListener("keydown", warm);
  };

  document.addEventListener("pointerdown", warm, { once: true });
  document.addEventListener("keydown", warm, { once: true });

  return () => {
    document.removeEventListener("pointerdown", warm);
    document.removeEventListener("keydown", warm);
  };
}

export function playSound(sound: Sound) {
  if (!settingsStore.getSnapshot().sound) return;

  const entry = pool(sound);
  if (!entry) return;

  // Grow the pool only when a clip is still ringing — three voices' worth of
  // downloads up front is three times the bytes for a sound played once.
  const busy = entry.clips[entry.next].currentTime > START_AT[sound];
  if (busy && entry.clips.length < VOICES) entry.clips.push(makeClip(sound));

  const clip = entry.clips[entry.next];
  entry.next = (entry.next + 1) % entry.clips.length;
  try {
    clip.currentTime = START_AT[sound];
  } catch {
    // Seeking before the metadata arrives: play from the top instead.
  }
  // A refusal — no user gesture yet, or a codec the browser will not take —
  // must never break the click that triggered it.
  void clip.play().catch(() => {});
}


/**
 * The looping beach bed, tied to the menu's Music switch.
 *
 * Kept apart from the one-shots above: it is a single element that runs for the
 * life of the page, and it has to cope with autoplay policy — a browser will
 * refuse to start it until the page has been interacted with, so a refusal
 * arms a retry on the first click or key instead of being swallowed.
 */
const AMBIENT_SRC = "/sounds/ambient.webm";
/** A bed, not an event: well under the click sounds. */
const AMBIENT_VOLUME = 0.35;

let ambientClip: HTMLAudioElement | null = null;
let ambientWanted = false;
let awaitingGesture = false;

function ambient(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!ambientClip) {
    ambientClip = new Audio(AMBIENT_SRC);
    ambientClip.loop = true;
    ambientClip.preload = "auto";
    ambientClip.volume = AMBIENT_VOLUME;
  }
  return ambientClip;
}

function retryOnGesture() {
  if (awaitingGesture) return;
  awaitingGesture = true;

  const retry = () => {
    awaitingGesture = false;
    document.removeEventListener("pointerdown", retry);
    document.removeEventListener("keydown", retry);
    if (ambientWanted) setAmbientPlaying(true);
  };

  document.addEventListener("pointerdown", retry, { once: true });
  document.addEventListener("keydown", retry, { once: true });
}

export function setAmbientPlaying(on: boolean) {
  ambientWanted = on;

  // Switching it off before it ever played: nothing to pause, and building the
  // element here would fetch the track for a player who never asked for it.
  if (!on && !ambientClip) return;

  const clip = ambient();
  if (!clip) return;

  if (!on) {
    clip.pause();
    return;
  }
  void clip.play().catch(retryOnGesture);
}
