"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { roundSeed } from "@/lib/games/random";
import {
  FLASH_GRID_RECALL_SECONDS, FLASH_GRID_SIZES, FLASH_GRID_STUDY_SECONDS,
  generateFlashGrid, scoreFlashGrid,
  type FlashGridChallenge, type FlashGridResult,
} from "@/lib/games/flash-grid";
import { Celebration } from "./celebration";
import { GameActions, GameShell, RoundHeading } from "./game-shell";
import styles from "./games.module.css";
import gridStyles from "./flash-grid.module.css";

type Phase = "ready" | "study" | "recall" | "reveal" | "finished";
type CompletedRound = { challenge: FlashGridChallenge; result: FlashGridResult; roundIndex: number };
type MatchState = {
  phase: Phase;
  matchSeed: string;
  roundIndex: number;
  challenge: FlashGridChallenge;
  selectedCells: number[];
  deadline: number | null;
  rounds: CompletedRound[];
};

function finishRound(current: MatchState): MatchState {
  if (current.phase !== "recall") return current;
  return {
    ...current, phase: "reveal", deadline: null,
    rounds: [...current.rounds, {
      challenge: current.challenge,
      result: scoreFlashGrid(current.challenge, current.selectedCells),
      roundIndex: current.roundIndex,
    }],
  };
}

export function FlashGridBoard({ challenge, mode, selectedCells = [], result, onToggle }: {
  challenge: FlashGridChallenge;
  mode: "intro" | "study" | "recall" | "reveal" | "waiting";
  selectedCells?: number[];
  result?: FlashGridResult;
  onToggle?: (cell: number) => void;
}) {
  const lit = new Set(challenge.litCells);
  const selected = new Set(result?.selectedCells ?? selectedCells);
  const interactive = mode === "study" || mode === "recall";
  return <div className={gridStyles.board} data-mode={mode} style={{ "--grid-size": challenge.size } as CSSProperties}
    role="group" aria-label={`${challenge.size} by ${challenge.size} Flash Grid`}>
    <div className={gridStyles.grid}>
      {Array.from({ length: challenge.size * challenge.size }, (_, cell) => {
        const row = Math.floor(cell / challenge.size) + 1;
        const column = cell % challenge.size + 1;
        const status = result ? lit.has(cell) ? selected.has(cell) ? "correct" : "missed" : selected.has(cell) ? "extra" : "empty" : "empty";
        const tileStyle = { "--flip-delay": `${(cell % challenge.size) * 24}ms` } as CSSProperties;
        return interactive ? <button key={cell} type="button" className={gridStyles.tile} style={tileStyle}
          data-lit={lit.has(cell)} data-selected={selected.has(cell)} disabled={mode === "study"}
          aria-label={`Row ${row}, column ${column}${mode === "study" && lit.has(cell) ? ", glowing" : ""}`} aria-pressed={mode === "recall" ? selected.has(cell) : undefined}
          onClick={() => onToggle?.(cell)}>
          <span className={gridStyles.tileInner} aria-hidden="true"><span className={gridStyles.tileFront} /><span className={gridStyles.tileBack} /></span>
        </button> : <span key={cell} className={gridStyles.staticTile} data-lit={lit.has(cell)} data-status={status} aria-hidden="true" />;
      })}
    </div>
  </div>;
}

export default function SoloFlashGrid({ initialSeed }: { initialSeed?: string }) {
  const [state, setState] = useState<MatchState>(() => ({
    phase: "ready", matchSeed: initialSeed ?? "preview", roundIndex: 0,
    challenge: generateFlashGrid(roundSeed(initialSeed ?? "preview", 0), 0),
    selectedCells: [], deadline: null, rounds: [],
  }));
  const [now, setNow] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");
  const round = state.rounds.at(-1);
  const totalScore = state.rounds.reduce((sum, item) => sum + item.result.score, 0);
  const remainingSeconds = state.deadline === null ? 0 : Math.max(0, Math.ceil((state.deadline - now) / 1000));

  useEffect(() => {
    if (state.phase !== "study" && state.phase !== "recall") return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setState((current) => {
        if (current.deadline === null || time < current.deadline) return current;
        if (current.phase === "study") {
          const recallDeadline = current.deadline + FLASH_GRID_RECALL_SECONDS * 1000;
          const recalled = { ...current, phase: "recall" as const, deadline: recallDeadline };
          return time >= recallDeadline ? finishRound(recalled) : recalled;
        }
        return finishRound(current);
      });
    };
    tick();
    const interval = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [state.phase, state.deadline]);

  function start(seed?: string) {
    const values = crypto.getRandomValues(new Uint32Array(4));
    const matchSeed = seed ?? Array.from(values, (value) => value.toString(36)).join("-");
    const time = Date.now();
    setCopyMessage("");
    setNow(time);
    setState({
      phase: "study", matchSeed, roundIndex: 0,
      challenge: generateFlashGrid(roundSeed(matchSeed, 0), 0),
      selectedCells: [], deadline: time + FLASH_GRID_STUDY_SECONDS * 1000, rounds: [],
    });
  }

  function toggle(cell: number) {
    const time = Date.now();
    setState((current) => {
      if (current.phase !== "recall") return current;
      if (current.deadline !== null && time >= current.deadline) return finishRound(current);
      return { ...current, selectedCells: current.selectedCells.includes(cell)
        ? current.selectedCells.filter((selected) => selected !== cell)
        : [...current.selectedCells, cell] };
    });
  }

  function submit() {
    setState((current) => finishRound(current));
  }

  function next() {
    const time = Date.now();
    setNow(time);
    setState((current) => {
      if (current.phase !== "reveal") return current;
      const roundIndex = current.roundIndex + 1;
      if (roundIndex >= FLASH_GRID_SIZES.length) return { ...current, phase: "finished" };
      return {
        ...current, phase: "study", roundIndex,
        challenge: generateFlashGrid(roundSeed(current.matchSeed, roundIndex), roundIndex),
        selectedCells: [], deadline: time + FLASH_GRID_STUDY_SECONDS * 1000,
      };
    });
  }

  async function copyChallenge() {
    const url = new URL("/play/flash-grid", window.location.origin);
    url.searchParams.set("seed", state.matchSeed);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyMessage("Copied! This link plays the same five patterns.");
    } catch { setCopyMessage(`Play the same patterns: ${url.toString()}`); }
  }

  return <GameShell round={state.roundIndex + 1} roundCount={FLASH_GRID_SIZES.length} totalScore={totalScore}>
    {state.phase === "ready" && <>
      <RoundHeading eyebrow="NOW YOU SEE IT. NOW YOU DON'T." title="Flash Grid." description="A tiny test for your very confident brain." />
      <section className={styles.introLayout}>
        <div className={`${gridStyles.boardFrame} ${gridStyles.introPreview}`}>
          <div className={gridStyles.boardTop}><span>3 × 3 GRID</span><strong>LOOK CLOSELY</strong></div>
          <FlashGridBoard challenge={state.challenge} mode="intro" />
          <div className={gridStyles.previewFooter}><span>✦</span> Three seconds. Remember the glow.</div>
        </div>
        <div className={styles.introRules}>
          <span className={styles.eyebrow}>BLINK AND YOU’LL MISS IT.</span>
          <h2>Look closely.<br />Then trust your memory.</h2>
          <ol>
            <li><span>1</span><div><strong>Watch the lights.</strong><p>Some squares glow for three seconds. Try to remember where they are.</p></div></li>
            <li><span>2</span><div><strong>Pick what you saw.</strong><p>Tap the squares you remember. Tap again to change your mind before time runs out.</p></div></li>
            <li><span>3</span><div><strong>See what stuck.</strong><p>Correct picks earn points. Extra picks count against your score.</p></div></li>
          </ol>
          <div className={`${styles.introFacts} ${gridStyles.facts}`}><span>5 growing grids</span><i>✦</i><span>3 seconds to study</span><i>✦</i><span>20 seconds to pick</span></div>
          {initialSeed && <p className={styles.sharedChallenge}>You’ve got a shared challenge. Same patterns, fresh guesses.</p>}
          <GameActions><button className={styles.primaryButton} onClick={() => start(initialSeed)}>Let’s flash it <span>↗</span></button></GameActions>
        </div>
      </section>
    </>}

    {(state.phase === "study" || state.phase === "recall") && <>
      <RoundHeading eyebrow={state.phase === "study" ? "TAKE A GOOD LOOK" : "NOW, WHERE WERE THEY?"}
        title={state.phase === "study" ? "Remember these." : "Your turn."}
        description={state.phase === "study" ? "The glowing squares are about to flip away." : "Tap every square you remember. Tap again to undo."}
        seconds={remainingSeconds} />
      <div className={gridStyles.playArea}>
        <div className={gridStyles.boardFrame}>
          <div className={gridStyles.boardTop}><span>{state.challenge.size} × {state.challenge.size} GRID</span><strong>{state.phase === "study" ? "LOOK CLOSELY" : `${state.selectedCells.length} PICKED`}</strong></div>
          <FlashGridBoard challenge={state.challenge} mode={state.phase} selectedCells={state.selectedCells} onToggle={toggle} />
          <span className={gridStyles.boardDoodle} aria-hidden="true">✦</span>
        </div>
        <p className={gridStyles.phaseNote} role="status">{state.phase === "study" ? "Psst… eyes on the bright ones." : "Go on, give those squares a little tap."}</p>
        {state.phase === "recall" && <GameActions><button className={`${styles.primaryButton} ${gridStyles.playAction}`} onClick={submit}>Lock in my picks <span>↗</span></button></GameActions>}
      </div>
    </>}

    {state.phase === "reveal" && round && <>
      {round.result.missed === 0 && round.result.extra === 0 && <Celebration key={`${state.matchSeed}:${state.roundIndex}`} message="Grid genius!" badge={`${round.result.correct} / ${round.challenge.litCells.length}`} detail="Every glowing square, right where you left it." />}
      <RoundHeading eyebrow="LET'S TURN THE LIGHTS BACK ON" title={round.result.score >= 800 ? "You remembered!" : round.result.score >= 400 ? "Right-ish recall." : "A little brain fog."}
        description="Here’s what lit up, what you found, and what snuck by." />
      <section className={gridStyles.revealLayout}>
        <div className={gridStyles.revealBoardWrap}>
          <div className={gridStyles.boardTop}><span>{round.challenge.size} × {round.challenge.size} GRID</span><strong>THE ANSWER</strong></div>
          <FlashGridBoard challenge={round.challenge} mode="reveal" result={round.result} />
        </div>
        <div className={gridStyles.revealPanel}>
          <span className={styles.eyebrow}>THIS ROUND</span>
          <strong className={gridStyles.roundScore}>{round.result.score.toLocaleString()}<small> / 1,000 pts</small></strong>
          <p>{round.result.correct} of {round.challenge.litCells.length} glowing squares found.</p>
          <div className={gridStyles.tally}><span><i data-kind="correct" />Found <b>{round.result.correct}</b></span><span><i data-kind="missed" />Missed <b>{round.result.missed}</b></span><span><i data-kind="extra" />Extra <b>{round.result.extra}</b></span></div>
          <p className={gridStyles.scoringNote}>Each correct pick adds points. Each extra pick takes the same amount away.</p>
        </div>
      </section>
      <div className={`${styles.continueBar} ${styles.mobileActions}`}><p>Take it in. You set the pace.</p><button className={styles.primaryButton} onClick={next}>{state.roundIndex + 1 === FLASH_GRID_SIZES.length ? "Final scores" : "Next grid"} <span>↗</span></button></div>
    </>}

    {state.phase === "finished" && <>
      <RoundHeading eyebrow="FIVE GRIDS. A LOT OF LITTLE SQUARES." title="Still got it?" description="Your brain did its best. Probably." />
      <section className={styles.finalCard}>
        <span className={styles.eyebrow}>YOUR GRAND TOTAL</span>
        <strong className={styles.finalScore}>{totalScore.toLocaleString()}<span> / 5,000</span></strong>
        <p>{totalScore >= 4500 ? "A truly suspicious amount of remembering." : totalScore >= 3000 ? "Your memory has some very good moments." : "Those squares are sneakier than they look."}</p>
        <div className={`${styles.history} ${gridStyles.history}`}>{state.rounds.map((item) => <div key={item.roundIndex}><span>ROUND {item.roundIndex + 1}</span><strong className={gridStyles.historySize}>{item.challenge.size} × {item.challenge.size}</strong><small>{item.result.correct} / {item.challenge.litCells.length} found</small><strong>{item.result.score.toLocaleString()}<small> pts</small></strong></div>)}</div>
        <div className={`${styles.finalActions} ${styles.mobileActions}`}><button className={styles.primaryButton} onClick={() => start()}>Five fresh grids <span>↗</span></button><button className={styles.secondaryButton} onClick={() => start(state.matchSeed)}>Replay these grids ↶</button></div>
        <button className={styles.shareButton} onClick={() => void copyChallenge()}>Challenge a friend with these patterns ↗</button>
        {copyMessage && <p className={styles.copyMessage} role="status">{copyMessage}</p>}
      </section>
    </>}
  </GameShell>;
}
