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
import { supabase } from "@/lib/supabase-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmbedGhost {
  detection_id: string;
  username: string;
  rank: string | null;
  frame_time_seconds: number;
}

interface EmbedMeta {
  streamerName: string;
  streamerAvatar: string;
  vodTitle: string;
  date: string;
}

interface EmbedState {
  videoId: string | null;
  timestamp: number | null;
  meta: EmbedMeta | null;
}

interface EmbedContextValue extends EmbedState {
  /** Load a VOD (or seek if already loaded). Pass meta for the info bar. */
  setEmbed: (videoId: string, timestamp: number, meta?: EmbedMeta) => void;
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

  // ---- Player controls ----
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  seek: (seconds: number) => void;
  isPaused: boolean;
  isMuted: boolean;
  /** Current playback position in seconds (polled). */
  currentTime: number;
  /** Total VOD duration in seconds. */
  duration: number;

  // ---- Ghost markers for the timeline (auto-fetched per VOD) ----
  ghosts: EmbedGhost[];

  // ---- VOD data (fetched from vod_embed_info) ----
  bazaarChapters: number[] | null;
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
const POLL_INTERVAL_MS = 500;

export function EmbedProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EmbedState>({
    videoId: null,
    timestamp: null,
    meta: null,
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Player state (polled)
  const [isPaused, setIsPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Ghost markers
  const [ghosts, setGhosts] = useState<EmbedGhost[]>([]);

  // VOD data (fetched from vod_embed_info)
  const [bazaarChapters, setBazaarChapters] = useState<number[] | null>(null);

  const playerRef = useRef<any>(null);
  const currentVideoRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Poll player state ----
  useEffect(() => {
    if (!isReady || !playerRef.current) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        setCurrentTime(p.getCurrentTime() ?? 0);
        setDuration(p.getDuration() ?? 0);
        setIsPaused(p.isPaused() ?? true);
        setIsMuted(p.getMuted() ?? false);
      } catch {
        // Player may not be ready yet
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isReady]);

  // ---- Fetch VOD data + all ghosts when VOD changes ----
  const fetchedVodRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.videoId) {
      setBazaarChapters(null);
      setGhosts([]);
      fetchedVodRef.current = null;
      return;
    }

    // Skip if we already fetched for this VOD
    if (state.videoId === fetchedVodRef.current) return;
    fetchedVodRef.current = state.videoId;

    const fetchVodData = async () => {
      const videoId = state.videoId!;

      // Fetch VOD info and all detections in parallel
      const [vodResult, detectionsResult] = await Promise.all([
        supabase
          .from("vod_embed_info")
          .select("duration_seconds, bazaar_chapters")
          .eq("vod_source_id", videoId)
          .maybeSingle(),
        supabase
          .from("detection_search")
          .select("detection_id, username, rank, frame_time_seconds")
          .eq("vod_source_id", videoId)
          .order("frame_time_seconds", { ascending: true }),
      ]);

      if (vodResult.data) {
        setBazaarChapters(vodResult.data.bazaar_chapters ?? null);
        if (vodResult.data.duration_seconds && duration === 0) {
          setDuration(vodResult.data.duration_seconds);
        }
      }

      if (detectionsResult.data) {
        setGhosts(
          detectionsResult.data
            .filter(
              (d) =>
                d.detection_id && d.username && d.frame_time_seconds != null
            )
            .map((d) => ({
              detection_id: d.detection_id!,
              username: d.username!,
              rank: d.rank ?? null,
              frame_time_seconds: d.frame_time_seconds!,
            }))
        );
      }
    };

    fetchVodData();
  }, [state.videoId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setCurrentTime(0);
    setDuration(0);
    setIsPaused(true);

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
  }, [state.videoId, state.timestamp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (playerRef.current) {
        const container = document.getElementById(CONTAINER_ID);
        if (container) container.innerHTML = "";
        playerRef.current = null;
      }
    };
  }, []);

  // ---- Public API ----
  const setEmbed = useCallback(
    (videoId: string, timestamp: number, meta?: EmbedMeta) => {
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

  const play = useCallback(() => {
    playerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (p.isPaused()) p.play();
      else p.pause();
    } catch {
      // ignore
    }
  }, []);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.setMuted(!p.getMuted());
    } catch {
      // ignore
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    playerRef.current?.seek(seconds);
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
        play,
        pause,
        togglePlay,
        toggleMute,
        seek,
        isPaused,
        isMuted,
        currentTime,
        duration,
        ghosts,
        bazaarChapters,
      }}
    >
      {children}
    </EmbedContext.Provider>
  );
}
