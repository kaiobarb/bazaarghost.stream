"use client";

import type React from "react";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export default function StreamerSearch({
  streams,
}: {
  streams: { name: string }[];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSelectChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.delete("p");
      // params.delete()
      params.set("stream", value);
    } else {
      params.delete("stream");
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const handleInputChange = useDebouncedCallback((input: string) => {
    const params = new URLSearchParams(searchParams);
    console.log(input);
    if (input) {
      params.set("username", input);
    } else {
      params.delete("username");
    }
    replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, 50);

  return (
    <div className="rounded-xl bg-zinc-800/50 p-6 shadow-lg">
      <div
        // onSubmit={handleSearch}
        className="space-y-4 space-x-4 flex flex-wrap"
      >
        <div className="space-y-2 flex-3">
          <label
            htmlFor="streamer"
            className="block text-left text-sm font-medium text-zinc-300"
          >
            Select Streamer
          </label>
          <Select
            value={searchParams.get("stream")?.toString()}
            defaultValue={searchParams.get("streamer")?.toString()}
            onValueChange={handleSelectChange}
          >
            <SelectTrigger className="h-12 border-zinc-700 bg-zinc-900 text-white w-full">
              <SelectValue placeholder="Any Stream" />
            </SelectTrigger>
            <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
              <SelectItem value="*">*</SelectItem>
              {streams.map((stream) => (
                <SelectItem key={stream.name} value={stream.name}>
                  {stream.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-9">
          <label
            htmlFor="username"
            className="block text-left text-sm font-medium text-zinc-300"
          >
            Enter Username
          </label>
          <div className="relative">
            <Input
              id="username"
              type="text"
              defaultValue={searchParams.get("username")?.toString()}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter the username of the player you want to find matchups of"
              className="border-zinc-700 bg-zinc-900 pl-10 text-white placeholder:text-zinc-500"
            />
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
