"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { enterRoom } from "@/lib/rooms/client";
import { readSetting, saveSetting, useSetting, useMotionPreference } from "@/lib/preferences/client";
import { Doodles, Illustration, type GameArt } from "./art";
import styles from "./landing.module.css";

type Modal = "host" | "join" | "how" | GameArt | null;
const games: { kind: GameArt; name: string; subtitle: string; description: string }[] = [
  { kind: "split", name: "Split It", subtitle: "Two halves. One wild guess.", description: "Place two anchors to cut a wobbly shape into two equal halves. Drag either point until you’re happy, then lock it in. The closer to 50/50, the better!" },
  { kind: "grid", name: "Flash Grid", subtitle: "Now you see it. Now you don’t.", description: "A few squares light up for a moment, then disappear. Pick the squares you remember seeing. Your memory is probably great… right?" },
  { kind: "clock", name: "Internal Clock", subtitle: "Time flies. Can you catch it?", description: "Start a hidden timer, then stop it when you think the target time has passed. No clock to watch. Just you and your surprisingly questionable sense of time." },
  { kind: "angle", name: "Angle It", subtitle: "A little turn. A wild guess.", description: "We give you an angle in degrees. Drag the hand until the peach wedge looks just right, then lock it in. Five angles. No degree markings. Just your very confident inner protractor." },
];

function Icon({ kind }: { kind: "plus" | "arrow" | "sound" | "mute" | "motion" | "play" | "help" | "close" }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "plus" && <path d="M12 5v14M5 12h14" />}
    {kind === "arrow" && <path d="M4 12h16m-6-6 6 6-6 6" />}
    {(kind === "sound" || kind === "mute") && <><path d="M11 4 6 8H3v8h3l5 4V4Z" />{kind === "sound" ? <><path d="M15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" /></> : <path d="m16 9 6 6m0-6-6 6" />}</>}
    {kind === "motion" && <><path d="M8 4v16M16 4v16" /><path d="M3 8v8M21 8v8" /></>}
    {kind === "play" && <path d="m8 5 11 7-11 7V5Z" />}
    {kind === "help" && <><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01" /></>}
    {kind === "close" && <path d="m6 6 12 12M18 6 6 18" />}
  </svg>;
}

export default function Landing() {
  const [modal, setModal] = useState<Modal>(null);
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const router = useRouter();
  const activeRoom = useSetting("activeRoom");
  const sound = useSetting("sound") === "true";
  const { paused, motion } = useMotionPreference();
  const dialog = useRef<HTMLDialogElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const game = games.find((item) => item.kind === modal);

  useEffect(() => {
    if (modal && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [modal]);
  useEffect(() => () => { void audio.current?.close(); }, []);

  function pop(enabled = sound) {
    if (!enabled || !window.AudioContext) return;
    try {
      const context = audio.current ?? new AudioContext();
      audio.current = context;
      void context.resume().catch(() => {});
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.setValueAtTime(660, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(360, context.currentTime + 0.1);
      gain.gain.setValueAtTime(0.06, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.13);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.14);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Sound is optional when browser audio is unavailable. */ }
  }

  function open(next: Modal) {
    pop();
    setNickname(readSetting("nickname") ?? "");
    setRoomCode(readSetting("roomCode") ?? "");
    setError("");
    setModal(next);
  }

  async function savePlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = nickname.trim();
    if (!name || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const snapshot = await enterRoom(name, modal === "join" ? roomCode : undefined);
      if (modal === "join") saveSetting("roomCode", roomCode);
      pop();
      router.push(`/room/${snapshot.room.code}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Try again.");
      submitting.current = false;
      setBusy(false);
    }
  }

  return <div className={styles.page} data-paused={paused} data-motion={motion}>
    <a className={styles.skipLink} href="#main">Skip to main content</a>
    <header className={styles.header}>
      <Link className={styles.wordmark} href="/" aria-label="Rightish home">right<span>ish</span><i>.</i></Link>
      <nav className={styles.navigation} aria-label="Main navigation">
        <button className={styles.howButton} onClick={() => open("how")}><Icon kind="help" /><span>How to play</span></button>
        <span className={styles.navDivider} />
        <button className={styles.iconButton} aria-label={sound ? "Turn sound off" : "Turn sound on"} title={sound ? "Sound on" : "Sound off"} aria-pressed={sound} onClick={() => { saveSetting("sound", String(!sound)); pop(!sound); }}><Icon kind={sound ? "sound" : "mute"} /></button>
        <button className={`${styles.iconButton} ${styles.motionButton}`} aria-label={paused ? "Resume animations" : "Pause animations"} title={paused ? "Resume animations" : "Pause animations"} aria-pressed={!paused} onClick={() => { saveSetting("paused", String(!paused)); pop(); }}><Icon kind={paused ? "play" : "motion"} /><span className={styles.motionLabel}>Motion {paused ? "off" : "on"}</span></button>
      </nav>
    </header>

    <main id="main">
      <section className={styles.hero} aria-labelledby="hero-title">
        <Doodles />
        <div className={styles.heroContent}>
          {activeRoom && /^[A-Z0-9]{6}$/.test(activeRoom) && <Link className={styles.resumeRoom} href={`/room/${activeRoom}`} onClick={() => pop()}>
            <svg className={styles.resumeBubble} viewBox="0 0 300 108" fill="none" aria-hidden="true">
              <path d="M22 36 5 23 40 24 40 8 68 18 82 3 100 17 126 7 137 17 162 3 177 17 208 7 216 20 248 12 247 27 278 22 266 39 293 46 273 57 289 73 260 75 259 90 230 83 216 96 196 85 197 104 176 87 153 95 141 83 110 94 100 82 71 91 68 78 36 85 39 68 9 70 25 53 4 45Z" fill="#faf0d6" stroke="#b99957" strokeWidth="2.2" strokeLinejoin="round" />
              <path className={styles.resumeSpark} d="m276 4 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#d77760" />
              <path className={styles.resumeSpark} d="m15 88 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#a6b898" />
            </svg>
            <span className={styles.resumeLabel}>Back to room<strong>{activeRoom}</strong></span>
          </Link>}
          <h1 id="hero-title">Close enough.<br /><span>Fun enough.</span><svg className={styles.underline} viewBox="0 0 440 25" aria-hidden="true"><path d="M8 15Q213-6 428 12M26 23Q222 7 400 20" stroke="#eab64d" strokeWidth="5" strokeLinecap="round" fill="none" /></svg></h1>
          <p className={styles.intro}>A party game for your perfectly imperfect brain.<br className={styles.desktopBreak} /> Trust your gut, challenge your friends, and get it <em>right-ish.</em></p>
          <div className={styles.actions}>
            <button className={`${styles.playButton} ${styles.hostButton}`} onClick={() => open("host")}><span className={styles.buttonIcon}><Icon kind="plus" /></span><span>Host a game<small>You bring the friends.</small></span></button>
            <button className={`${styles.playButton} ${styles.joinButton}`} onClick={() => open("join")}><span className={styles.buttonIcon}><Icon kind="arrow" /></span><span>Join a game<small>Got a room code?</small></span></button>
          </div>
          <div className={styles.reassurance}><span>No downloads</span><i>✦</i><span>No accounts</span><i>✦</i><span>Just your friends</span></div>
          <p className={styles.heroNote}><svg className={styles.noteArrow} width="48" height="86" viewBox="0 0 48 86" fill="none" aria-hidden="true"><path d="M43 78C25 80 10 69 10 56C10 44 34 40 36 52C39 68 12 68 10 49C8 35 11 25 15 18M4 26L15 18L18 31" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg><span>being a little wrong is the whole point.</span></p>
        </div>
      </section>

      <section className={styles.gameSection} aria-labelledby="games-title">
        <div className={styles.sectionHeading}><div><span className={styles.sectionEyebrow}>SMALL CHALLENGES. QUESTIONABLE CONFIDENCE.</span><h2 id="games-title">Meet your brain’s new frenemies.</h2></div><span className={styles.comingSoon}><span /> Four little games. Give them a go.</span></div>
        <div className={styles.games}>
          {games.map((item, index) => <button key={item.kind} className={`${styles.gameCard} ${styles[item.kind]}`} onClick={() => open(item.kind)} aria-label={`Learn about ${item.name}`}><span className={styles.gameNumber}>0{index + 1}</span><div className={styles.cardArt}><Illustration kind={item.kind} /></div><div className={styles.cardBottom}><div><h3>{item.name}</h3><p>{item.subtitle}</p></div><span className={styles.cardArrow}><Icon kind="arrow" /></span></div></button>)}
        </div>
      </section>
      <section className={styles.bottomNote}><span className={styles.tinyFace} aria-hidden="true">☺</span><p>A little perception. A little intuition. <strong>A lot of laughing at yourself.</strong></p></section>
    </main>

    <footer className={styles.footer}><span className={styles.footerBrand}>rightish<span>.</span></span><p>Made for the “one more round” kind of friends.</p><button onClick={() => open("how")}>The very simple rules <span aria-hidden="true">↗</span></button></footer>

    <dialog ref={dialog} className={styles.dialog} aria-labelledby="dialog-title" onClose={() => setModal(null)} onCancel={(event) => { if (busy) event.preventDefault(); }} onClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); if (!busy && event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.current?.close(); }}>
      <button className={styles.closeButton} disabled={busy} onClick={() => dialog.current?.close()} aria-label="Close dialog"><Icon kind="close" /></button>
      {modal === "how" ? <>
        <span className={styles.modalEyebrow}>THE PLAN IS PRETTY SIMPLE</span>
        <h2 id="dialog-title">Good friends.<br />Bad estimates.</h2>
        <p className={styles.modalDescription}>Quick minigames that put your perception, memory, and timing to the test.</p>
        <ol className={styles.steps}><li><span>1</span><div><h3>Get the gang together.</h3><p>One friend hosts. Everyone else joins with a room code and a nickname.</p></div></li><li><span>2</span><div><h3>Go with your gut.</h3><p>Face the same little challenge. Make your best guess before time runs out.</p></div></li><li><span>3</span><div><h3>See how close you got.</h3><p>Reveal the answer, collect points, and insist you’ll win the next round.</p></div></li></ol>
        <div className={styles.previewNotice}>Try all four games solo, or bring your crew together in a multiplayer room.</div>
        <button className={styles.submitButton} onClick={() => dialog.current?.close()}>Got it <Icon kind="arrow" /></button>
      </> : game ? <>
        <div className={`${styles.modalArt} ${styles[game.kind]}`}><Illustration kind={game.kind} /></div>
        <span className={styles.modalEyebrow}>TRY SOLO PRACTICE</span><h2 id="dialog-title">{game.name}</h2><p className={styles.modalDescription}>{game.description}</p>
        <Link className={`${styles.submitButton} ${styles.practiceLink}`}
          href={game.kind === "split" ? "/play/split-it" : game.kind === "grid" ? "/play/flash-grid" : game.kind === "clock" ? "/play/internal-clock" : "/play/angle-it"}>
          Try {game.name} <Icon kind="arrow" /></Link>
      </> : modal === "host" || modal === "join" ? <>
        <span className={styles.modalEyebrow}>LET’S GET YOU READY</span>
        <h2 id="dialog-title">{modal === "host" ? "Your party starts here." : "Come on in."}</h2>
          <p className={styles.modalDescription}>{modal === "host" ? "First things first: what should your friends call you?" : "Bring your nickname and a code from your friend."}</p>
          <form className={styles.form} onSubmit={savePlayer} aria-busy={busy}><label htmlFor="nickname">Your nickname<input id="nickname" name="nickname" disabled={busy} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="e.g. Almost a genius" maxLength={20} pattern=".*\S.*" title="Enter a nickname with at least one non-space character" autoComplete="nickname" required /></label>
            {modal === "join" && <label htmlFor="room-code">Room code<input className={styles.codeInput} id="room-code" name="roomCode" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" minLength={6} maxLength={6} pattern="[A-Z0-9]{6}" title="Enter a six-character room code" autoComplete="off" spellCheck={false} required /><small>Six letters or numbers. Zero secret handshakes.</small></label>}
            {error && <p className={styles.formError} role="alert">{error}</p>}
            <button className={styles.submitButton} type="submit" disabled={busy}>{busy ? modal === "host" ? "Creating your room…" : "Joining your friends…" : modal === "host" ? "Create room" : "Join game"}</button>
          </form>
      </> : null}
    </dialog>
  </div>;
}
