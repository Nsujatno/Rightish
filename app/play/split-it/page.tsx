import type { Metadata } from "next";
import SoloSplitIt from "@/app/components/games/solo-split-it";

export const metadata: Metadata = {
  title: "Split It — Rightish",
  description: "Five fresh shapes. Five attempts at fifty-fifty. Place your anchors and trust your eyes in Split It.",
};

export default async function SplitItPage({ searchParams }: {
  searchParams: Promise<{ seed?: string | string[] }>;
}) {
  const { seed } = await searchParams;
  const initialSeed = typeof seed === "string" && /^[a-zA-Z0-9:_-]{1,100}$/.test(seed) ? seed : undefined;
  return <SoloSplitIt initialSeed={initialSeed} />;
}
