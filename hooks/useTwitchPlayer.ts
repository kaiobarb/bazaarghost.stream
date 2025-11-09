"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    Twitch?: {
      Player: any;
    };
  }
}

interface UseTwitchPlayerParams {
  containerId: string;
  videoId: string | null;
  timestamp: number;
  autoplay?: boolean;
  shouldRender?: boolean;
  refreshKey?: number;
}

interface UseTwitchPlayerReturn {
  isReady: boolean;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  error: string | null;
}

/**
 * Custom hook to manage Twitch Player with full API control
 */
export function useTwitchPlayer({
  containerId,
  videoId,
  timestamp,
  autoplay = true,
  shouldRender = false,
  refreshKey = 0,
}: UseTwitchPlayerParams): UseTwitchPlayerReturn {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  // Load Twitch player script
  const loadTwitchScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // Check if already loaded
      if (window.Twitch?.Player) {
        resolve();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="player.twitch.tv/js/embed/v1.js"]');
      if (existingScript) {
        // Wait for it to load
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Twitch script')));
        return;
      }

      // Create and load script
      const script = document.createElement('script');
      script.src = 'https://player.twitch.tv/js/embed/v1.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Twitch player script'));
      document.head.appendChild(script);
    });
  }, []);

  // Control methods
  const play = useCallback(() => {
    if (playerRef.current) {
      console.log('Playing video');
      playerRef.current.play();
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current) {
      console.log('Pausing video');
      playerRef.current.pause();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    if (playerRef.current) {
      console.log('Seeking to', seconds);
      playerRef.current.seek(seconds);
    }
  }, []);

  // Initialize player
  useEffect(() => {
    // Only initialize if we should render and have a video ID
    if (!shouldRender || !videoId || !containerId) {
      return;
    }

    const initPlayer = async () => {
      try {
        // Load script if needed
        if (!scriptLoadedRef.current) {
          await loadTwitchScript();
          scriptLoadedRef.current = true;
        }

        // Check if container exists
        const container = document.getElementById(containerId);
        if (!container) {
          console.warn(`Container ${containerId} not found`);
          return;
        }

        // Clear previous player if exists
        if (playerRef.current) {
          playerRef.current = null;
          container.innerHTML = '';
        }

        // Calculate time string
        const hours = Math.floor(timestamp / 3600);
        const minutes = Math.floor((timestamp % 3600) / 60);
        const seconds = Math.floor(timestamp % 60);
        const timeString = `${hours}h${minutes}m${seconds}s`;

        // Create new player
        const options = {
          video: videoId,
          width: "100%",
          height: "100%",
          autoplay: autoplay,
          time: timeString,
          parent: [typeof window !== "undefined" ? window.location.hostname : "localhost"],
        };

        console.log('Creating Twitch.Player with options:', options);
        playerRef.current = new window.Twitch!.Player(containerId, options);

        // Listen for ready event
        playerRef.current.addEventListener('ready', () => {
          console.log('Player is ready');
          setIsReady(true);
        });

        // Listen for play/pause events for debugging
        playerRef.current.addEventListener('play', () => {
          console.log('Player started playing');
        });

        playerRef.current.addEventListener('pause', () => {
          console.log('Player paused');
        });

      } catch (err) {
        console.error('Failed to initialize Twitch player:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize player');
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      if (playerRef.current) {
        try {
          // Twitch Player doesn't have a destroy method, just clear the container
          const container = document.getElementById(containerId);
          if (container) {
            container.innerHTML = '';
          }
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }
      playerRef.current = null;
      setIsReady(false);
    };
  }, [containerId, videoId, timestamp, autoplay, shouldRender, refreshKey, loadTwitchScript]);

  return {
    isReady,
    play,
    pause,
    seek,
    error,
  };
}