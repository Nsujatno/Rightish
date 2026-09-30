import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RoomLobby from "./room-lobby";

export const metadata: Metadata = {
  title: "The lobby — Rightish",
  robots: { index: false, follow: false },
};

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) notFound();
  return <RoomLobby key={code} code={code} />;
}
