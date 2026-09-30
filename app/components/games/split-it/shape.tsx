import { useId } from "react";
import type { SplitItChallenge } from "@/lib/games/split-it/generator";
import { clipPolygon, extendCut, polygonCentroid, polygonPath, type Cut } from "@/lib/games/split-it/geometry";
import type { SplitItResult } from "@/lib/games/split-it";
import { formatSplit } from "@/lib/games/split-it/format";
import styles from "../games.module.css";

export function CutLine({ cut, className }: { cut: Cut; className?: string }) {
  const line = extendCut(cut);
  return <line x1={line.a.x * 1000} y1={line.a.y * 1000} x2={line.b.x * 1000} y2={line.b.y * 1000} className={className ?? styles.cutLine} />;
}

export function ShapeDrawing({ challenge, cut, result, showPerfect = false, mini = false, cutState }: {
  challenge: SplitItChallenge; cut?: Cut | null; result?: SplitItResult; showPerfect?: boolean; mini?: boolean; cutState?: "preview" | "anchored";
}) {
  const id = useId().replace(/:/g, "");
  const path = polygonPath(challenge.points);
  const activeCut = result?.cut ?? cut;
  const split = !!result?.cut && !showPerfect;
  const cutLength = activeCut ? Math.hypot(activeCut.b.x - activeCut.a.x, activeCut.b.y - activeCut.a.y) : 1;
  const normal = activeCut ? { x: -(activeCut.b.y - activeCut.a.y) / cutLength, y: (activeCut.b.x - activeCut.a.x) / cutLength } : { x: 0, y: 1 };
  const board = [{ x: -1, y: -1 }, { x: 2, y: -1 }, { x: 2, y: 2 }, { x: -1, y: 2 }];
  return <>
    <defs>
      <clipPath id={`${id}-shape`}><path d={path} /></clipPath>
      {activeCut && ([1, -1] as const).map((side) => <clipPath key={side} id={`${id}-${side}`}><path d={polygonPath(clipPolygon(board, activeCut, side))} /></clipPath>)}
    </defs>
    {split && activeCut ? ([1, -1] as const).map((side, index) => {
      const center = polygonCentroid(clipPolygon(challenge.points, activeCut, side));
      return <g key={side} className={styles.piece} style={{ transform: `translate(${normal.x * side * 15}px, ${normal.y * side * 15}px)` }}>
        <g clipPath={`url(#${id}-${side})`}>
          <path d={path} fill={index === 0 ? challenge.color : "#f2d9b6"} className={styles.shapeOutline} />
          <g clipPath={`url(#${id}-shape)`}><CutLine cut={activeCut} className={styles.splitEdge} /></g>
        </g>
        {!mini && result?.fractions && <text x={center.x * 1000} y={center.y * 1000} className={styles.areaLabel}>{formatSplit(result.fractions)[index]}%</text>}
      </g>;
    }) : <path d={path} fill={challenge.color} className={styles.shapeOutline} />}
    {activeCut && !split && <>
      <CutLine cut={activeCut} className={cutState === "preview" ? styles.previewLine : cutState === "anchored" ? styles.guideLine : styles.cutLine} />
      {cutState === "anchored" && <line x1={activeCut.a.x * 1000} y1={activeCut.a.y * 1000} x2={activeCut.b.x * 1000} y2={activeCut.b.y * 1000} className={styles.anchoredLine} />}
    </>}
    {showPerfect && result?.perfectCut && <CutLine cut={result.perfectCut} className={styles.perfectLine} />}
  </>;
}

export function ShapePreview({ challenge, result, showPerfect = false, mini = false }: {
  challenge: SplitItChallenge; result?: SplitItResult; showPerfect?: boolean; mini?: boolean;
}) {
  return <svg viewBox="0 0 1000 1000" className={styles.shapeSvg} role="img" aria-label={result?.fractions ? `Split: ${formatSplit(result.fractions).join(" and ")} percent` : "An irregular shape"}>
    <ShapeDrawing challenge={challenge} result={result} showPerfect={showPerfect} mini={mini} />
  </svg>;
}
