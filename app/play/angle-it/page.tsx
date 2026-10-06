import type { Metadata } from "next";
import SoloAngleIt from "@/app/components/games/solo-angle-it";

export const metadata: Metadata = {
  title: "Angle It — Rightish",
  description: "Five angles. One very confident guess. Rotate the hand to match the requested angle.",
};

export default async function AngleItPage({ searchParams }: {
  searchParams: Promise<{ seed?: string | string[] }>;
}) {
  const { seed } = await searchParams;
  const initialSeed = typeof seed === "string" && /^[a-zA-Z0-9:_-]{1,100}$/.test(seed) ? seed : undefined;
  return <SoloAngleIt initialSeed={initialSeed} />;
}
