/* eslint-disable react-refresh/only-export-components --
 * Providers and their hooks belong in one file here: the contexts they share
 * are private to it, and splitting them would only make the delete-on-install
 * step two files instead of one. Fast refresh loses this module on edit; that
 * is a fair price for a folder that exists to be removed. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useKrashClient, useKrashState } from "./hooks";
import { Language, Platform } from "./types";
import type { GameSettings } from "./types";

/**
 * The optional contexts `@krash/react` ships (`.claude/sdk-docs/12-contexts.md`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TEMPORARY, like the rest of `src/sdk` — but implemented rather than inert,
 * for the same reason `dom.ts` is: none of this is server state.
 *
 * `hooks.ts` returns nothing because the values it stands for come from a
 * session, and inventing them would be simulating a backend. A device class, a
 * settings toggle, a currency label and a language code are read from the
 * browser and the URL. A stub returning defaults and no-ops would not be honest
 * emptiness — it would take the settings menu, the responsive layout and the
 * language switch off the air.
 *
 * Behaviour below is the documented behaviour, including the parts that are
 * easy to mistake for bugs:
 *
 *   - the runtime device detect **wins over** the `?platform` URL hint;
 *   - settings are keyed by session token, so nothing persists until the
 *     session exists — and today, without `KrashProvider`, that is never;
 *   - `?extraParams` beats the stored value;
 *   - `?lang=en` removes the parameter rather than writing it.
 *
 * On install this file is deleted and the names come from the SDK:
 *
 *     export {
 *       DeviceProvider, useDevice, SettingsProvider, useSettings,
 *       CurrencyProvider, useCurrency, LanguageProvider, useLanguage,
 *       detectPlatform,
 *     } from "@krash/react";
 *
 * `GameConfigProvider` is deliberately not mirrored: it is inert in the SDK too
 * and only holds defaults until the app copies `useGameConfig()` into it. The
 * skin reads `useGameConfig()` directly instead, which the docs list as the
 * equally valid option.
 * ─────────────────────────────────────────────────────────────────────────
 */

/* ── Device ──────────────────────────────────────────────────────────── */

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const MOBILE_VIEWPORT_MAX_WIDTH = 700;

/**
 * Mobile if the UA says so, **or** the pointer is coarse, **or** the viewport
 * is under 700px. A touch laptop is therefore mobile, and this is checked once
 * — it does not react to a resize.
 */
export function detectPlatform(): Platform {
  if (typeof window === "undefined") return Platform.Desk;

  const ua = navigator?.userAgent ?? "";
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const narrow =
    window.innerWidth > 0 && window.innerWidth < MOBILE_VIEWPORT_MAX_WIDTH;

  return MOBILE_UA.test(ua) || coarse || narrow ? Platform.Mob : Platform.Desk;
}

interface DeviceValue {
  platform: Platform;
  isMobile: boolean;
  isDesktop: boolean;
  setPlatform: (platform: Platform) => void;
}

const DeviceContext = createContext<DeviceValue | null>(null);

export const DeviceProvider = ({ children }: { children: ReactNode }) => {
  // Once, on mount: the URL hint is read for the log only — a runtime detect
  // always returns something, and it is the one that decides.
  const [platform, setPlatform] = useState<Platform>(detectPlatform);

  // Canonicalise the URL to the value actually in use, and drop the alias.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("platform") === platform && !url.searchParams.has("device")) {
      return;
    }
    url.searchParams.set("platform", platform);
    url.searchParams.delete("device");
    window.history.replaceState({}, "", url);
  }, [platform]);

  const value = useMemo(
    () => ({
      platform,
      isMobile: platform === Platform.Mob,
      isDesktop: platform === Platform.Desk,
      setPlatform,
    }),
    [platform],
  );

  return (
    <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
  );
};

export function useDevice(): DeviceValue {
  const value = useContext(DeviceContext);
  if (!value) {
    throw new Error("useDevice must be used within a <DeviceProvider>");
  }
  return value;
}

/* ── Settings ────────────────────────────────────────────────────────── */

/**
 * The SDK's defaults are all `true`. **`music` is deliberately `false` here** —
 * this game opens on a beach with a looping ambient bed, and starting it
 * unasked on every launch is a decision the skin has already made the other
 * way. It is the one place this folder knowingly differs from the package.
 *
 * On install that difference disappears with the file, and the same result is
 * had from the launch URL: `?extraParams={"music":false}`, which the operator
 * sets and which beats the stored value. Raise it with the integration team
 * rather than re-adding a local default on top of `SettingsProvider`.
 */
const DEFAULT_SETTINGS: GameSettings = {
  sound: true,
  music: false,
  animation: true,
};

const SETTINGS_KEY_PREFIX = "krash.settings:";

/** `?extraParams={"sound":false}` — booleans only, and it wins over storage. */
function urlSettingOverrides(): Partial<GameSettings> {
  if (typeof window === "undefined") return {};
  const raw = new URL(window.location.href).searchParams.get("extraParams");
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const overrides: Partial<GameSettings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof GameSettings)[]) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "boolean") overrides[key] = value;
    }
    return overrides;
  } catch {
    return {};
  }
}

function readStoredSettings(token: string): Partial<GameSettings> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY_PREFIX + token);
    return raw ? (JSON.parse(raw) as Partial<GameSettings>) : {};
  } catch {
    return {};
  }
}

/** No token, no write — the SDK loses a pre-session change the same way. */
function writeStoredSettings(token: string | null, settings: GameSettings) {
  if (!token) return;
  try {
    localStorage.setItem(SETTINGS_KEY_PREFIX + token, JSON.stringify(settings));
  } catch {
    // Quota or private mode: the switch still works for this session.
  }
}

interface SettingsValue {
  settings: GameSettings;
  updateSetting: (key: keyof GameSettings, value: boolean) => void;
  toggleSetting: (key: keyof GameSettings) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useKrashState();
  const sessionToken = session?.sessionToken ?? null;

  const [settings, setSettings] = useState<GameSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...urlSettingOverrides(),
  }));
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // The stored value only becomes reachable once there is a token to key it by,
  // so it lands the moment one appears — overwriting anything toggled during
  // the splash, which is exactly what the SDK does and why its docs say not to
  // show the settings UI before the launch has finished.
  //
  // Adjusted during render rather than in an effect: React's own answer for
  // state that has to follow a prop, and it avoids painting one frame of the
  // pre-session values.
  if (sessionToken && loadedFor !== sessionToken) {
    setLoadedFor(sessionToken);
    setSettings({
      ...DEFAULT_SETTINGS,
      ...readStoredSettings(sessionToken),
      ...urlSettingOverrides(),
    });
  }

  const updateSetting = useCallback(
    (key: keyof GameSettings, value: boolean) => {
      setSettings((current) => {
        const next = { ...current, [key]: value };
        writeStoredSettings(sessionToken, next);
        return next;
      });
    },
    [sessionToken],
  );

  const toggleSetting = useCallback(
    (key: keyof GameSettings) => {
      setSettings((current) => {
        const next = { ...current, [key]: !current[key] };
        writeStoredSettings(sessionToken, next);
        return next;
      });
    },
    [sessionToken],
  );

  const value = useMemo(
    () => ({ settings, updateSetting, toggleSetting }),
    [settings, updateSetting, toggleSetting],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("useSettings must be used within a <SettingsProvider>");
  }
  return value;
}

/* ── Currency ────────────────────────────────────────────────────────── */

const DEFAULT_CURRENCY = "USD";

function currencyFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URL(window.location.href).searchParams.get("currency");
  return raw ? raw.trim().toUpperCase() : null;
}

interface CurrencyValue {
  /** Uppercase code. Display only — the bet currency is the SDK's. */
  currency: string;
  setCurrency: (currency: string) => void;
}

const CurrencyContext = createContext<CurrencyValue | null>(null);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const client = useKrashClient();
  const [currency, setCurrencyState] = useState<string>(
    () => currencyFromUrl() ?? DEFAULT_CURRENCY,
  );

  const write = useCallback((next: string) => {
    setCurrencyState(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("currency", next.toLowerCase());
    window.history.replaceState({}, "", url);
  }, []);

  const setCurrency = useCallback(
    (next: string) => write(next.trim().toUpperCase()),
    [write],
  );

  // The real source: `game-config` arrives after every login and reconnect.
  useEffect(
    () => client.on("game-config", (config) => {
      if (config.currencyCode) write(config.currencyCode.toUpperCase());
    }),
    [client, write],
  );

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = currencyFromUrl();
      if (fromUrl) setCurrencyState(fromUrl);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const value = useMemo(
    () => ({ currency, setCurrency }),
    [currency, setCurrency],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency(): CurrencyValue {
  const value = useContext(CurrencyContext);
  if (!value) {
    throw new Error("useCurrency must be used within a <CurrencyProvider>");
  }
  return value;
}

/* ── Language ────────────────────────────────────────────────────────── */

export type TFunction = (key: string, options?: Record<string, unknown>) => string;

const LANGUAGES = Object.values(Language) as string[];

/** `?lang` must match an enum value exactly — `pt-BR`, not `pt-br`. */
function languageFromUrl(): Language {
  if (typeof window === "undefined") return Language.EN;
  const raw = new URL(window.location.href).searchParams.get("lang");
  return raw && LANGUAGES.includes(raw) ? (raw as Language) : Language.EN;
}

interface LanguageValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: TFunction;
}

const LanguageContext = createContext<LanguageValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
  /** Must come from `useTranslation()`, not `i18n.t` — see 12-contexts. */
  t?: TFunction;
  changeLanguage?: (language: Language) => void;
}

const identity: TFunction = (key) => key;

export const LanguageProvider = ({
  children,
  t = identity,
  changeLanguage,
}: LanguageProviderProps) => {
  const [language, setLanguage] = useState<Language>(languageFromUrl);

  useEffect(() => {
    changeLanguage?.(language);

    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    // English is the default, so it is spelled by the parameter's absence.
    if (language === Language.EN) url.searchParams.delete("lang");
    else url.searchParams.set("lang", language);
    window.history.replaceState({}, "", url);
  }, [language, changeLanguage]);

  useEffect(() => {
    const onPopState = () => setLanguage(languageFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used within a <LanguageProvider>");
  }
  return value;
}
