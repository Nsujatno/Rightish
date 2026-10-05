import type { Metadata } from "next";
import SoloFlashGrid from "@/app/components/games/solo-flash-grid";

export const metadata: Metadata = {
  title: "Flash Grid — Rightish",
  description: "Five quick grids. Three seconds to remember the glowing squares. How many can you find?",
};

export default async function FlashGridPage({ searchParams }: {
  searchParams: Promise<{ seed?: string | string[] }>;
}) {
  const { seed } = await searchParams;
  const initialSeed = typeof seed === "string" && /^[a-zA-Z0-9:_-]{1,100}$/.test(seed) ? seed : undefined;
  return <SoloFlashGrid initialSeed={initialSeed} />;
}
