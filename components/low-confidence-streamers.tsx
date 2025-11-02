"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface LowConfidenceStreamer {
  login: string;
  display_name: string;
  avg_confidence: number;
}

export function LowConfidenceStreamers() {
  const [streamers, setStreamers] = useState<LowConfidenceStreamer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLowConfidenceStreamers = async () => {
      try {
        const { data, error } = await supabase
          .from("streamer_detection_stats")
          .select("login, display_name, avg_confidence")
          .lt("avg_confidence", 0.5)
          .order("display_name", { ascending: true })
          .not("avg_confidence", "is", null);

        if (error) throw error;

        setStreamers(data as LowConfidenceStreamer[]);
      } catch (err) {
        console.error("Error fetching low confidence streamers:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLowConfidenceStreamers();
  }, []);

  if (isLoading || streamers.length === 0) {
    return null;
  }

  return (
    <ul className="list-disc pl-5 space-y-1">
      {streamers.map((streamer) => (
        <li key={streamer.login}>
          {streamer.display_name || streamer.login} -{" "}
          {(streamer.avg_confidence * 100).toFixed(1)}%
        </li>
      ))}
    </ul>
  );
}
