"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmbedState {
  videoId: string | null;
  timestamp: number | null;
  /** Streamer info shown beneath the player */
  meta: {
    streamerName: string;
    streamerAvatar: string;
    vodTitle: string;
    date: string;
  } | null;
}

interface EmbedContextValue extends EmbedState {
  /** Load a VOD (or seek if already loaded). Pass meta for the info bar. */
  setEmbed: (
    videoId: string,
    timestamp: number,
    meta?: EmbedState["meta"]
  ) => void;
  /** Hide the embed panel entirely. */
  hideEmbed: () => void;
  /** Whether the embed panel is visible. */
  isVisible: boolean;
  /** Whether the Twitch player is ready. */
  isReady: boolean;
  /** Player error, if any. */
  error: string | null;
  /** Stable container ID for the Twitch player div. */
  containerId: string;
}

const EmbedContext = createContext<EmbedContextValue | null>(null);

export function useEmbed(): EmbedContextValue {
  const ctx = useContext(EmbedContext);
  if (!ctx) throw new Error("useEmbed must be used within EmbedProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Twitch script loader (singleton)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    Twitch?: { Player: any };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTwitchScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject();
    if (window.Twitch?.Player) return resolve();

    const existing = document.querySelector(
      'script[src*="player.twitch.tv/js/embed/v1.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Twitch script"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://player.twitch.tv/js/embed/v1.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Twitch player script"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const CONTAINER_ID = "bazaarghost-twitch-embed";

export function EmbedProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EmbedState>({
    videoId: null,
    timestamp: null,
    meta: null,
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<any>(null);
  const currentVideoRef = useRef<string | null>(null);

  // ---- Create / update the Twitch player ----
  useEffect(() => {
    if (!state.videoId) return;

    const sameVideo = state.videoId === currentVideoRef.current;

    if (sameVideo && playerRef.current && state.timestamp != null) {
      // Same VOD — just seek
      playerRef.current.seek(state.timestamp);
      playerRef.current.play();
      return;
    }

    // Different VOD — create new player
    currentVideoRef.current = state.videoId;
    setIsReady(false);
    setError(null);

    const init = async () => {
      try {
        await loadTwitchScript();

        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        // Destroy previous
        if (playerRef.current) {
          playerRef.current = null;
          container.innerHTML = "";
        }

        const hours = Math.floor((state.timestamp ?? 0) / 3600);
        const minutes = Math.floor(((state.timestamp ?? 0) % 3600) / 60);
        const seconds = Math.floor((state.timestamp ?? 0) % 60);

        playerRef.current = new window.Twitch!.Player(CONTAINER_ID, {
          video: state.videoId,
          width: "100%",
          height: "100%",
          autoplay: true,
          time: `${hours}h${minutes}m${seconds}s`,
          parent: [window.location.hostname],
        });

        playerRef.current.addEventListener("ready", () => setIsReady(true));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize player"
        );
      }
    };

    init();

    // No cleanup here — we want the player to persist.
    // Cleanup only runs on unmount of the provider (i.e. never during normal use).
  }, [state.videoId, state.timestamp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        const container = document.getElementById(CONTAINER_ID);
        if (container) container.innerHTML = "";
        playerRef.current = null;
      }
    };
  }, []);

  // ---- Public API ----
  const setEmbed = useCallback(
    (videoId: string, timestamp: number, meta?: EmbedState["meta"]) => {
      setState((prev) => ({
        ...prev,
        videoId,
        timestamp,
        meta: meta ?? prev.meta,
      }));
      setIsVisible(true);
    },
    []
  );

  const hideEmbed = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <EmbedContext.Provider
      value={{
        ...state,
        setEmbed,
        hideEmbed,
        isVisible,
        isReady,
        error,
        containerId: CONTAINER_ID,
      }}
    >
      {children}
    </EmbedContext.Provider>
  );
}
