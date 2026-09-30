"use client";

import { useState, type ReactNode } from "react";
import type { PlayerRoundResult, ScoredResult } from "@/lib/games/types";
import styles from "./games.module.css";

export function Standings<Result extends ScoredResult>({ players, currentPlayerId }: {
  players: PlayerRoundResult<Result>[]; currentPlayerId: string;
}) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore || a.nickname.localeCompare(b.nickname));
  return <section className={styles.standings} aria-label="Match standings">
    <div className={styles.standingsTitle}><h2>How we’re doing.</h2><span>TOTAL POINTS</span></div>
    <ol>{sorted.map((player) => {
      const rank = 1 + sorted.filter((other) => other.totalScore > player.totalScore).length;
      const movement = player.previousRank === null ? 0 : player.previousRank - rank;
      return <li key={player.playerId} data-you={player.playerId === currentPlayerId}>
        <span className={styles.rank}>{rank}</span>
        <strong>{player.nickname}{player.playerId === currentPlayerId && <small>YOU</small>}</strong>
        <span className={styles.rankChange} aria-label={movement > 0 ? `Up ${movement} places` : movement < 0 ? `Down ${-movement} places` : "Rank unchanged"}>{movement > 0 ? `↑ ${movement}` : movement < 0 ? `↓ ${-movement}` : "—"}</span>
        <span className={styles.roundPoints}>+{player.result.score.toLocaleString()}</span>
        <b>{player.totalScore.toLocaleString()}</b>
      </li>;
    })}</ol>
  </section>;
}

/** Same board for solo and room play: render only actual submitted results. */
export function RoundResults<Result extends ScoredResult>({ players, currentPlayerId, renderPreview, renderSummary, renderDetail }: {
  players: PlayerRoundResult<Result>[]; currentPlayerId: string;
  renderPreview: (result: Result) => ReactNode;
  renderSummary: (result: Result) => ReactNode;
  renderDetail: (player: PlayerRoundResult<Result>) => ReactNode;
}) {
  const [selectedId, setSelectedId] = useState(currentPlayerId);
  const selected = players.find((player) => player.playerId === selectedId) ?? players[0];
  const best = Math.max(...players.map((player) => player.result.score));
  return <div className={styles.resultsLayout}>
    <div className={styles.resultsCards} data-solo={players.length === 1}>
      {players.map((player) => <button key={player.playerId} className={styles.resultCard}
        data-you={player.playerId === currentPlayerId} aria-pressed={selected?.playerId === player.playerId}
        onClick={() => setSelectedId(player.playerId)}>
        <div className={styles.resultCardHeader}><strong>{player.nickname}</strong>{player.playerId === currentPlayerId && <span>YOU</span>}</div>
        <div className={styles.resultThumbnail}>{renderPreview(player.result)}</div>
        <div className={styles.resultSummary}>{renderSummary(player.result)}</div>
        <div className={styles.resultCardScore}><b>{player.result.score.toLocaleString()}<small> pts</small></b>{best > 0 && player.result.score === best && players.length > 1 && <span>Closest ✦</span>}</div>
      </button>)}
    </div>
    {selected && <div className={styles.resultDetail} key={selected.playerId}>{renderDetail(selected)}</div>}
  </div>;
}
