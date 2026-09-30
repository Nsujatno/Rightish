"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Illustration } from "@/app/components/art";
import { enterRoom, forgetRoom, roomRequest } from "@/lib/rooms/client";
import type { RoomSnapshot } from "@/lib/rooms/types";
import { useLobby } from "@/lib/rooms/use-lobby";
import { defaultMatchSettings, type GameId } from "@/lib/games/registry";
import { hasPerGameSettings, parseMatchSettings } from "@/lib/games/settings";
import type { MatchSettings } from "@/lib/games/types";
import { HostSettings } from "./host-settings";
import { RoomMatch } from "./room-match";
import landing from "@/app/components/landing.module.css";
import styles from "./room.module.css";

const colors = ["#f5d58d", "#c4d9bf", "#c6d3ee", "#efb9a7", "#dcc8e7", "#b8ded8"];
function playerColor(id: string) {
  return colors[[...id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % colors.length];
}

export default function RoomLobby({ code }: { code: string }) {
  const lobby = useLobby(code);
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"join" | "ready" | "leave" | "settings" | "start" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const acting = useRef(false);
  const snapshot = lobby.snapshot;
  const me = snapshot?.players.find((player) => player.user_id === snapshot.currentPlayerId);
  const host = snapshot?.players.find((player) => player.user_id === snapshot.room.host_id);
  const isHost = !!snapshot && snapshot.room.host_id === snapshot.currentPlayerId;
  const needsJoin = lobby.error?.code === "NOT_A_MEMBER";

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (acting.current) return;
    acting.current = true;
    setBusy("join");
    setActionError(null);
    try { await enterRoom(name.trim(), code); lobby.retry(); }
    catch (error) { setActionError(error instanceof Error ? error.message : "We couldn’t join that room. Try again."); }
    finally { acting.current = false; setBusy(null); }
  }

  async function setReady() {
    if (!me || acting.current) return;
    acting.current = true;
    setBusy("ready");
    setActionError(null);
    try {
      const response = await roomRequest<{ snapshot: RoomSnapshot }>(`/api/rooms/${code}`, {
        method: "PATCH", body: JSON.stringify({ ready: !me.is_ready }),
      });
      lobby.update(response.snapshot);
    } catch (error) { setActionError(error instanceof Error ? error.message : "That didn’t go through. Try again."); }
    finally { acting.current = false; setBusy(null); }
  }

  async function leave() {
    if (acting.current) return;
    acting.current = true;
    setBusy("leave");
    setActionError(null);
    try {
      await roomRequest(`/api/rooms/${code}`, { method: "DELETE" });
      forgetRoom(code);
      router.push("/");
    } catch (error) { setActionError(error instanceof Error ? error.message : "We couldn’t leave just yet. Try again."); }
    finally { acting.current = false; setBusy(null); }
  }

  async function saveSettings(settings: MatchSettings<GameId>) {
    if (acting.current) return;
    acting.current = true;
    setBusy("settings");
    setActionError(null);
    try {
      const response = await roomRequest<{ snapshot: RoomSnapshot }>(`/api/rooms/${code}/settings`, {
        method: "PATCH", body: JSON.stringify({ settings }),
      });
      lobby.update(response.snapshot);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Those settings didn’t save. Try again."); }
    finally { acting.current = false; setBusy(null); }
  }

  async function startMatch() {
    if (acting.current) return;
    acting.current = true;
    setBusy("start");
    setActionError(null);
    try {
      const response = await roomRequest<{ snapshot: RoomSnapshot }>(`/api/rooms/${code}/match`, {
        method: "POST", body: JSON.stringify({ action: "start" }),
      });
      lobby.update(response.snapshot);
    } catch (error) { setActionError(error instanceof Error ? error.message : "The match couldn’t start. Try again."); }
    finally { acting.current = false; setBusy(null); }
  }

  async function copyCode() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code);
      setCopyStatus("Room code copied!");
    } catch { setCopyStatus("Copy didn’t work here. You can select the room code above and copy it yourself."); }
  }

  const readyCount = snapshot?.players.filter((player) => player.is_ready).length ?? 0;
  const parsedSettings = snapshot ? parseMatchSettings(snapshot.room.settings) : null;
  const settingsNeedSave = !!snapshot && (!parsedSettings || !hasPerGameSettings(snapshot.room.settings));
  if (snapshot?.match && snapshot.room.status !== "lobby") {
    const matchSettings = parseMatchSettings(snapshot.match.settings);
    if (!matchSettings) return <div className={styles.page}><main className={styles.main}>
      <p className={styles.error} role="alert">This match’s settings couldn’t be loaded. Try reconnecting to the room.</p>
      <button className={styles.softButton} onClick={lobby.retry}>Reconnect</button>
    </main></div>;
    return <RoomMatch key={`${snapshot.match.id}:${snapshot.match.roundIndex}`} code={code}
      snapshot={{ ...snapshot, match: { ...snapshot.match, settings: matchSettings } }}
      onSnapshot={lobby.update} onLeave={leave} />;
  }
  return <div className={styles.page}>
    <a className={landing.skipLink} href="#lobby-main">Skip to lobby</a>
    <header className={`${landing.header} ${styles.header}`}>
      <Link className={landing.wordmark} href="/" aria-label="Rightish home">right<span>ish</span><i>.</i></Link>
      {snapshot ? <div className={styles.intro}>
        <span className={styles.eyebrow}>GOOD FRIENDS. BAD ESTIMATES.</span>
        <h1 id="lobby-title">The almost-right crew.</h1>
        <p>Get everyone in here. The friendly rivalry starts with a room code.</p>
      </div> : <Link className={styles.homeLink} href="/">Back home ↗</Link>}
    </header>

    <main id="lobby-main" className={styles.main} aria-labelledby={snapshot ? "lobby-title" : undefined}>
      {needsJoin ? <section className={styles.gate}>
        <div className={styles.mascot}><Illustration kind="split" /></div>
        <span className={styles.eyebrow}>YOU’RE INVITED · ROOM {code}</span>
        <h1>There’s a spot for you.</h1>
        <p>Your friends brought the room. You bring your questionable confidence.</p>
        <form className={landing.form} onSubmit={join}>
          <label htmlFor="invite-nickname">Your nickname<input id="invite-nickname" name="nickname" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Almost a genius" maxLength={20} pattern=".*\S.*" autoComplete="nickname" required disabled={!!busy} /></label>
          {actionError && <p className={styles.error} role="alert">{actionError}</p>}
          <button className={landing.submitButton} disabled={!!busy} type="submit">{busy === "join" ? "Joining your friends…" : "Join the room"}<span aria-hidden="true">↗</span></button>
        </form>
      </section> : !snapshot ? <section className={styles.gate}>
        <div className={styles.mascot}><Illustration kind="split" /></div>
        <span className={styles.eyebrow}>THE MORE, THE MERRIER</span>
        <h1>{lobby.error ? "A little connection hiccup." : "Finding your friends…"}</h1>
        <p role={lobby.error ? "alert" : "status"}>{lobby.error?.message ?? "Getting your saved player and room connected."}</p>
        {lobby.error && !["ROOM_NOT_FOUND", "ROOM_EXPIRED"].includes(lobby.error.code) && <button className={landing.submitButton} onClick={lobby.retry}>Try connecting again <span aria-hidden="true">↗</span></button>}
        {lobby.error && <Link className={styles.backLink} href="/">Back to the good stuff</Link>}
      </section> : <>
        {(actionError || lobby.error) && <div className={styles.error} role="alert">{actionError ?? lobby.error?.message}{lobby.error && <button className={styles.retryButton} onClick={lobby.retry} disabled={!!busy}>Reconnect</button>}</div>}
        <div className={styles.layout}>
          <aside className={styles.inviteCard} aria-labelledby="invite-title">
            <h2 id="invite-title">Bring your friends.</h2>
            <label className={styles.codeLabel} htmlFor="lobby-code">ROOM CODE</label>
            <input id="lobby-code" className={styles.roomCode} value={snapshot.room.code} readOnly onFocus={(event) => event.target.select()} />
            <button className={`${styles.goldButton} ${styles.copyButton}`} onClick={() => void copyCode()}>Copy code <span aria-hidden="true">⧉</span></button>
            <p className={styles.copyStatus} role="status" aria-live="polite">{copyStatus ?? "Share this code with your friends so they can join the room."}</p>
            <div className={styles.inviteArt}><Illustration kind="split" /></div>
            <span className={styles.artNote}>better together. probably.</span>
          </aside>

          <section className={styles.playersCard} aria-labelledby="players-title">
            <div className={styles.playersHeading}><div><span className={styles.eyebrow}>THE GANG’S GETTING TOGETHER</span><h2 id="players-title">Your players <span>{snapshot.players.length}/{snapshot.room.max_players}</span></h2></div><span className={styles.readyCount}>{readyCount} ready</span></div>
            <ul className={styles.players}>
              {snapshot.players.map((player) => {
                const online = lobby.onlineIds.includes(player.user_id);
                return <li key={player.user_id} className={styles.player} data-away={lobby.presenceSynced && !online}>
                  <span className={styles.avatar} style={{ background: playerColor(player.user_id) }} aria-hidden="true"><span className={styles.eyes} /><span className={styles.smile} /></span>
                  <div className={styles.playerName}><strong>{player.nickname}</strong><span className={styles.playerMeta}>{player.user_id === snapshot.currentPlayerId && <small className={styles.youTag}>You</small>}{player.user_id === snapshot.room.host_id && <small className={styles.hostTag}>Host</small>}<small className={styles.presence} data-online={online}><i />{!lobby.presenceSynced ? "Connecting…" : online ? "Here for the fun" : "Away · spot saved"}</small></span></div>
                  <span className={styles.playerReady} data-ready={player.is_ready}>{player.is_ready ? "✓ Ready" : "Getting comfy"}</span>
                </li>;
              })}
              {snapshot.players.length < snapshot.room.max_players && <li className={styles.emptySpot}><span>+</span><p>Someone’s missing.<small>Send them the code. They’ll get the hint.</small></p></li>}
            </ul>
            <div className={styles.readyBar}><p>{me?.is_ready ? "Confidence: questionable. Ready: absolutely." : "Got your guessing brain on?"}<small>Your spot stays saved if you refresh or disconnect.</small></p><button className={me?.is_ready ? styles.softButton : styles.greenButton} aria-pressed={!!me?.is_ready} disabled={!!busy || !me || snapshot.room.status !== "lobby"} onClick={() => void setReady()}>{busy === "ready" ? "One sec…" : me?.is_ready ? "Not ready yet" : "I’m ready"}</button></div>
          </section>
        </div>
        <HostSettings key={JSON.stringify(snapshot.room.settings)} settings={parsedSettings ?? defaultMatchSettings}
          needsSave={settingsNeedSave}
          isHost={isHost} playerCount={snapshot.players.length} allReady={readyCount === snapshot.players.length}
          onSave={saveSettings} onStart={startMatch} />
        <div className={styles.lobbyFooter}><div className={styles.hostNote}><span aria-hidden="true">✦</span><p>{isHost ? "You’re the host. Assemble your almost-right crew." : `${host?.nickname ?? "Your friend"} is hosting this one.`}<small>Set the match, get ready, and let the questionable estimates begin.</small></p></div><button className={styles.leaveButton} disabled={!!busy} onClick={() => void leave()}>{busy === "leave" ? "Leaving…" : "Leave room"} <span aria-hidden="true">↗</span></button></div>
      </>}
    </main>
    <footer className={styles.footer}>Made for the “one more round” kind of friends.</footer>
  </div>;
}
