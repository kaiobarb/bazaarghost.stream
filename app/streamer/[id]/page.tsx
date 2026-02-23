import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  getTwitchUser,
  getTwitchVods,
  parseTwitchDuration,
} from "@/lib/twitch";
import { getStreamerByLogin, getStreamerVods } from "@/lib/server-utils";
import type { MergedVod } from "@/components/vod-card";
import { StreamerVodList } from "@/components/streamer-vod-list";
import { CopyId } from "@/components/copy-id";
import { TooltipProvider } from "@/components/ui/tooltip";

export const revalidate = 36000; // 10 hours

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `${id} VODs`,
    description: `Browse VODs and bazaar matchup data for ${id}`,
  };
}

export default async function StreamerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const login = id.toLowerCase();
  const { isEnabled: isAdmin } = await draftMode();

  // Fetch Twitch user info first (we need the numeric user_id for the VODs call)
  const twitchUser = await getTwitchUser(login);
  if (!twitchUser) {
    notFound();
  }

  // Fetch DB streamer + Twitch VODs in parallel
  const [dbStreamer, twitchVods] = await Promise.all([
    getStreamerByLogin(login),
    getTwitchVods(twitchUser.id),
  ]);

  // vod_stats.streamer stores display_name, not login — use it for the query
  const dbVods = dbStreamer?.display_name
    ? await getStreamerVods(dbStreamer.display_name)
    : [];

  // Build a map of DB vods keyed by source_id
  const dbVodMap = new Map(dbVods.map((v) => [v.source_id, v]));
  const dbStreamerId = dbStreamer?.id ?? null;

  // Merge: start from Twitch VODs, enrich with DB data
  const mergedVods: MergedVod[] = twitchVods.map((tv) => {
    const dbVod = dbVodMap.get(tv.id) ?? null;
    const durationSeconds =
      dbVod?.duration_seconds ?? parseTwitchDuration(tv.duration);

    return {
      twitchId: tv.id,
      title: dbVod?.title ?? tv.title,
      publishedAt: dbVod?.published_at ?? tv.published_at ?? tv.created_at,
      durationSeconds,
      thumbnailUrl: tv.thumbnail_url || null,
      twitchUrl: tv.url,
      twitchOnly: !dbVod,
      chunks: dbVod?.chunks ?? null,
      totalDetections: dbVod?.total_detections ?? null,
      bazaarChapters: dbVod?.bazaar_chapters ?? null,
      status: dbVod?.status ?? null,
      streamerId: dbStreamerId,
    };
  });

  // Also include DB vods that are NOT on Twitch anymore (expired/deleted)
  for (const dbVod of dbVods) {
    if (!twitchVods.some((tv) => tv.id === dbVod.source_id)) {
      mergedVods.push({
        twitchId: dbVod.source_id ?? `db-${dbVod.id}`,
        title: dbVod.title ?? "Untitled broadcast",
        publishedAt: dbVod.published_at ?? dbVod.created_at ?? "",
        durationSeconds: dbVod.duration_seconds ?? 0,
        thumbnailUrl: null,
        twitchUrl: dbVod.source_id
          ? `https://www.twitch.tv/videos/${dbVod.source_id}`
          : "#",
        twitchOnly: false,
        chunks: dbVod.chunks ?? null,
        totalDetections: dbVod.total_detections ?? null,
        bazaarChapters: dbVod.bazaar_chapters ?? null,
        status: dbVod.status ?? null,
        streamerId: dbStreamerId,
      });
    }
  }

  // Sort by published date, newest first
  mergedVods.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Compute summary stats from DB vods
  const totalDbVods = dbVods.length;
  const totalDetections = dbVods.reduce(
    (sum, v) => sum + (v.total_detections ?? 0),
    0
  );
  const totalChunks = dbVods.reduce((sum, v) => sum + (v.chunks ?? 0), 0);

  return (
    <TooltipProvider>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to search
        </Link>

        {/* Streamer header */}
        <div className="group mb-8 flex items-center gap-4">
          <Image
            src={twitchUser.profile_image_url}
            alt={twitchUser.display_name}
            width={64}
            height={64}
            className="rounded-full"
          />
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {twitchUser.display_name}
              </h1>
              {dbStreamerId && (
                <CopyId value={String(dbStreamerId)} label="Copy streamer ID" />
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
              <span>{mergedVods.length} VODs on Twitch</span>
              <span>{totalDbVods} tracked in DB</span>
              <span>{totalDetections} total ghosts</span>
              {isAdmin && <span>{totalChunks} total chunks</span>}
            </div>
          </div>
        </div>

        {/* VOD list with search/filter */}
        <StreamerVodList vods={mergedVods} isAdmin={isAdmin} />
      </main>
    </TooltipProvider>
  );
}
