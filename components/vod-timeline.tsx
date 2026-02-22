import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VodTimelineProps {
  /** Total VOD duration in seconds */
  durationSeconds: number;
  /** Start/end pairs in seconds, e.g. [120, 300, 600, 900] = two chapters */
  bazaarChapters: number[] | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function VodTimeline({
  durationSeconds,
  bazaarChapters,
}: VodTimelineProps) {
  if (!durationSeconds || durationSeconds <= 0) {
    return <div className="h-2 w-full rounded-full bg-muted" />;
  }

  // Parse start/end pairs from the flat array
  const segments: { start: number; end: number }[] = [];
  if (bazaarChapters && bazaarChapters.length >= 2) {
    for (let i = 0; i < bazaarChapters.length - 1; i += 2) {
      segments.push({
        start: bazaarChapters[i],
        end: bazaarChapters[i + 1],
      });
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden cursor-default">
          {segments.map((seg, i) => {
            const left = (seg.start / durationSeconds) * 100;
            const width = ((seg.end - seg.start) / durationSeconds) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 h-full bg-accent rounded-full"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 0.5)}%`,
                }}
              />
            );
          })}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {segments.length > 0 ? (
          <span>
            {segments.length} bazaar{" "}
            {segments.length === 1 ? "chapter" : "chapters"}
            {" \u2014 "}
            {segments.map((s, i) => (
              <span key={i}>
                {i > 0 && ", "}
                {formatDuration(s.start)}&ndash;{formatDuration(s.end)}
              </span>
            ))}
          </span>
        ) : (
          <span>No bazaar chapters detected</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
