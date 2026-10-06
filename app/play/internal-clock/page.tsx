import type { Metadata } from "next";
import SoloInternalClock from "@/app/components/games/solo-internal-clock";

export const metadata: Metadata = {
  title: "Internal Clock — Rightish",
  description: "Start the hidden timer and stop it when you think the target time has passed.",
};

export default function InternalClockPage() {
  return <SoloInternalClock />;
}
