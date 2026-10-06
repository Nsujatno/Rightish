"use client";

import { useState, type ComponentType } from "react";
import { Illustration, type GameArt } from "@/app/components/art";
import { gameCatalog, gameRegistry, type GameId } from "@/lib/games/registry";
import { parseMatchSettings } from "@/lib/games/settings";
import { defaultSplitItOptions, isSplitItOptions } from "@/lib/games/split-it";
import {
  defaultFlashGridOptions, isFlashGridOptions, FLASH_GRID_MAX_RECALL_SECONDS,
  FLASH_GRID_MAX_STUDY_SECONDS, FLASH_GRID_MIN_RECALL_SECONDS, FLASH_GRID_MIN_STUDY_SECONDS,
  type FlashGridOptions, type FlashGridRoundOptions,
} from "@/lib/games/flash-grid";
import {
  defaultInternalClockOptions, INTERNAL_CLOCK_MAX_TARGET_SECONDS, INTERNAL_CLOCK_MIN_TARGET_SECONDS,
  isInternalClockOptions, type InternalClockOptions, type InternalClockRoundOptions,
} from "@/lib/games/internal-clock";
import type { GameMatchSettings, MatchSettings } from "@/lib/games/types";
import styles from "./room.module.css";

type GameOptionsEditorProps = {
  options: unknown;
  disabled: boolean;
  onChange: (options: unknown) => void;
};

function SplitItOptionsEditor({ options, disabled, onChange }: GameOptionsEditorProps) {
  const target = isSplitItOptions(options) ? options.targetPercent : defaultSplitItOptions.targetPercent;
  return <label className={styles.settingField}>Target split
    <select value={target} onChange={(event) => onChange({ targetPercent: Number(event.target.value) })} disabled={disabled}>
      {Array.from({ length: 7 }, (_, index) => 50 + index * 5).map((percent) =>
        <option key={percent} value={percent}>{percent} / {100 - percent}</option>)}
    </select>
    <small>Either side can be the larger piece.</small>
  </label>;
}

// New games register their lobby artwork and optional settings editor here.
const gameSettingsUi: Record<GameId, {
  art: GameArt;
  OptionsEditor?: ComponentType<GameOptionsEditorProps>;
  describeOptions?: (options: unknown) => string;
}> = {
  "split-it": {
    art: "split",
    OptionsEditor: SplitItOptionsEditor,
    describeOptions: (options) => {
      const target = isSplitItOptions(options) ? options.targetPercent : defaultSplitItOptions.targetPercent;
      return `${target} / ${100 - target} target`;
    },
  },
  "flash-grid": { art: "grid" },
  "internal-clock": { art: "clock" },
};

function numberError(value: string, minimum: number, maximum: number, label: string) {
  if (!value.trim()) return `Enter ${label}.`;
  const number = Number(value);
  return !Number.isInteger(number) || number < minimum || number > maximum
    ? `Choose a whole number from ${minimum} to ${maximum}.` : null;
}

function FlashGridRoundEditor({ index, round, disabled, onChange }: {
  index: number; round: FlashGridRoundOptions; disabled: boolean;
  onChange: (round: FlashGridRoundOptions) => void;
}) {
  const [studyInput, setStudyInput] = useState(String(round.studySeconds));
  const [recallInput, setRecallInput] = useState(String(round.recallSeconds));
  const studyError = numberError(studyInput, FLASH_GRID_MIN_STUDY_SECONDS, FLASH_GRID_MAX_STUDY_SECONDS, "study seconds");
  const recallError = numberError(recallInput, FLASH_GRID_MIN_RECALL_SECONDS, FLASH_GRID_MAX_RECALL_SECONDS, "choice seconds");
  return <fieldset className={styles.flashRoundSettings} disabled={disabled}>
    <legend>Round {index + 1}</legend>
    <div className={styles.settingsGrid}>
      <label className={styles.settingField}>Grid size
        <select value={round.size} onChange={(event) => onChange({ ...round, size: Number(event.target.value) })}>
          {[3, 4, 5, 6, 7].map((size) => <option key={size} value={size}>{size} × {size}</option>)}
        </select><small>3 × 3 to 7 × 7</small>
      </label>
      <label className={styles.settingField}>Seconds to see
        <input type="number" min={FLASH_GRID_MIN_STUDY_SECONDS} max={FLASH_GRID_MAX_STUDY_SECONDS} step="1"
          value={studyInput} onChange={(event) => { setStudyInput(event.target.value); onChange({ ...round, studySeconds: Number(event.target.value) }); }}
          aria-invalid={!!studyError} />
        <small className={studyError ? styles.settingError : undefined} aria-live="polite">{studyError ?? "1–15 seconds"}</small>
      </label>
      <label className={styles.settingField}>Seconds to choose
        <input type="number" min={FLASH_GRID_MIN_RECALL_SECONDS} max={FLASH_GRID_MAX_RECALL_SECONDS} step="1"
          value={recallInput} onChange={(event) => { setRecallInput(event.target.value); onChange({ ...round, recallSeconds: Number(event.target.value) }); }}
          aria-invalid={!!recallError} />
        <small className={recallError ? styles.settingError : undefined} aria-live="polite">{recallError ?? "5–60 seconds"}</small>
      </label>
    </div>
  </fieldset>;
}

function FlashGridSettingsEditor({ settings, disabled, onChange }: {
  settings: GameMatchSettings; disabled: boolean; onChange: (settings: GameMatchSettings) => void;
}) {
  const [roundsInput, setRoundsInput] = useState(String(settings.roundCount));
  const options = settings.options && typeof settings.options === "object" && "rounds" in settings.options &&
    Array.isArray(settings.options.rounds) ? settings.options as FlashGridOptions : defaultFlashGridOptions;
  const roundsError = numberError(roundsInput, 1, 10, "a round count");
  return <div className={styles.flashSettings}>
    <label className={styles.settingField}>Rounds
      <input type="number" min="1" max="10" step="1" value={roundsInput} disabled={disabled}
        onChange={(event) => {
          const value = event.target.value;
          setRoundsInput(value);
          const count = Number(value);
          const rounds = Array.from({ length: Number.isInteger(count) && count >= 1 && count <= 10 ? count : options.rounds.length },
            (_, index) => options.rounds[index] ?? defaultFlashGridOptions.rounds[index % defaultFlashGridOptions.rounds.length]);
          onChange({ ...settings, roundCount: count, options: { rounds } });
        }} aria-invalid={!!roundsError} />
      <small className={roundsError ? styles.settingError : undefined} aria-live="polite">{roundsError ?? "1–10 rounds"}</small>
    </label>
    {options.rounds.map((round, index) =>
      <FlashGridRoundEditor key={index} index={index} round={round} disabled={disabled}
        onChange={(next) => onChange({ ...settings, options: {
          rounds: options.rounds.map((item, itemIndex) => itemIndex === index ? next : item),
        } })} />)}
  </div>;
}

function InternalClockRoundEditor({ index, round, disabled, onChange }: {
  index: number; round: InternalClockRoundOptions; disabled: boolean;
  onChange: (round: InternalClockRoundOptions) => void;
}) {
  const [targetInput, setTargetInput] = useState(String(round.targetSeconds));
  const targetError = numberError(targetInput, INTERNAL_CLOCK_MIN_TARGET_SECONDS, INTERNAL_CLOCK_MAX_TARGET_SECONDS, "target seconds");
  return <fieldset className={styles.flashRoundSettings} disabled={disabled}>
    <legend>Round {index + 1}</legend>
    <label className={styles.settingField}>Seconds to guess
      <input type="number" min={INTERNAL_CLOCK_MIN_TARGET_SECONDS} max={INTERNAL_CLOCK_MAX_TARGET_SECONDS} step="1"
        value={targetInput} onChange={(event) => { setTargetInput(event.target.value);
          onChange({ targetSeconds: Number(event.target.value) }); }} aria-invalid={!!targetError} />
      <small className={targetError ? styles.settingError : undefined} aria-live="polite">
        {targetError ?? "1–30 seconds. The hidden clock stops five seconds later."}
      </small>
    </label>
  </fieldset>;
}

function InternalClockSettingsEditor({ settings, disabled, onChange }: {
  settings: GameMatchSettings; disabled: boolean; onChange: (settings: GameMatchSettings) => void;
}) {
  const [roundsInput, setRoundsInput] = useState(String(settings.roundCount));
  const options = settings.options && typeof settings.options === "object" && "rounds" in settings.options &&
    Array.isArray(settings.options.rounds) ? settings.options as InternalClockOptions : defaultInternalClockOptions;
  const roundsError = numberError(roundsInput, 1, 10, "a round count");
  return <div className={styles.flashSettings}>
    <label className={styles.settingField}>Rounds
      <input type="number" min="1" max="10" step="1" value={roundsInput} disabled={disabled}
        onChange={(event) => {
          const value = event.target.value;
          setRoundsInput(value);
          const count = Number(value);
          const rounds = Array.from({ length: Number.isInteger(count) && count >= 1 && count <= 10 ? count : options.rounds.length },
            (_, index) => options.rounds[index] ?? defaultInternalClockOptions.rounds[index % defaultInternalClockOptions.rounds.length]);
          onChange({ ...settings, roundCount: count, options: { rounds } });
        }} aria-invalid={!!roundsError} />
      <small className={roundsError ? styles.settingError : undefined} aria-live="polite">{roundsError ?? "1–10 rounds"}</small>
    </label>
    {options.rounds.map((round, index) =>
      <InternalClockRoundEditor key={index} index={index} round={round} disabled={disabled}
        onChange={(next) => onChange({ ...settings, options: {
          rounds: options.rounds.map((item, itemIndex) => itemIndex === index ? next : item),
        } })} />)}
  </div>;
}

function StandardGameSettingsEditor({ game, settings, disabled, onChange, OptionsEditor }: {
  game: (typeof gameCatalog)[number];
  settings: GameMatchSettings;
  disabled: boolean;
  onChange: (settings: GameMatchSettings) => void;
  OptionsEditor?: ComponentType<GameOptionsEditorProps>;
}) {
  const [roundsInput, setRoundsInput] = useState(String(settings.roundCount));
  const [secondsInput, setSecondsInput] = useState(String(settings.durationSeconds));
  const roundsError = numberError(roundsInput, game.limits.minRounds, game.limits.maxRounds, "a round count");
  const secondsError = numberError(secondsInput, game.limits.minDurationSeconds, game.limits.maxDurationSeconds, "seconds per round");
  return <div className={styles.settingsGrid}>
    <label className={styles.settingField}>Rounds
      <input type="number" min={game.limits.minRounds} max={game.limits.maxRounds} step="1"
        value={roundsInput} onChange={(event) => { setRoundsInput(event.target.value);
          onChange({ ...settings, roundCount: Number(event.target.value) }); }} disabled={disabled}
        aria-invalid={!!roundsError} aria-describedby={`${game.id}-rounds-help`} />
      <small id={`${game.id}-rounds-help`} className={roundsError ? styles.settingError : undefined} aria-live="polite">
        {roundsError ?? `${game.limits.minRounds}–${game.limits.maxRounds} rounds`}
      </small>
    </label>
    <label className={styles.settingField}>Seconds per round
      <input type="number" min={game.limits.minDurationSeconds} max={game.limits.maxDurationSeconds} step="1"
        value={secondsInput} onChange={(event) => { setSecondsInput(event.target.value);
          onChange({ ...settings, durationSeconds: Number(event.target.value) }); }} disabled={disabled}
        aria-invalid={!!secondsError} aria-describedby={`${game.id}-seconds-help`} />
      <small id={`${game.id}-seconds-help`} className={secondsError ? styles.settingError : undefined} aria-live="polite">
        {secondsError ?? `${game.limits.minDurationSeconds}–${game.limits.maxDurationSeconds} seconds`}
      </small>
    </label>
    {OptionsEditor && <OptionsEditor options={settings.options} disabled={disabled}
      onChange={(options) => onChange({ ...settings, options })} />}
  </div>;
}

function GameSettingsEditor(props: Parameters<typeof StandardGameSettingsEditor>[0]) {
  if (props.game.id === "flash-grid") return <FlashGridSettingsEditor settings={props.settings} disabled={props.disabled} onChange={props.onChange} />;
  if (props.game.id === "internal-clock") return <InternalClockSettingsEditor settings={props.settings} disabled={props.disabled} onChange={props.onChange} />;
  return <StandardGameSettingsEditor {...props} />;
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.7 2.8h2.6l.5 2.1c.6.2 1.2.4 1.7.7l1.9-1.1 1.8 1.8-1.1 1.9c.3.5.5 1.1.7 1.7l2.1.5v2.6l-2.1.5c-.2.6-.4 1.2-.7 1.7l1.1 1.9-1.8 1.8-1.9-1.1c-.5.3-1.1.5-1.7.7l-.5 2.1h-2.6l-.5-2.1c-.6-.2-1.2-.4-1.7-.7l-1.9 1.1-1.8-1.8 1.1-1.9c-.3-.5-.5-1.1-.7-1.7l-2.1-.5v-2.6l2.1-.5c.2-.6.4-1.2.7-1.7L4.8 6.3l1.8-1.8 1.9 1.1c.5-.3 1.1-.5 1.7-.7l.5-2.1Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>;
}

export function HostSettings({ settings, needsSave, isHost, playerCount, allReady, onSave, onStart }: {
  settings: MatchSettings<GameId>;
  needsSave: boolean;
  isHost: boolean;
  playerCount: number;
  allReady: boolean;
  onSave: (settings: MatchSettings<GameId>) => Promise<void>;
  onStart: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  const [openGameSettings, setOpenGameSettings] = useState<GameId | null>(null);
  const [busy, setBusy] = useState<"save" | "start" | null>(null);
  const valid = parseMatchSettings(draft);
  const changed = needsSave || JSON.stringify(draft) !== JSON.stringify(settings);
  const canStart = !!valid && playerCount >= 2 && allReady && !changed && !busy;
  const settingsError = !valid;

  async function save() {
    if (!valid || !changed || busy) return;
    setBusy("save");
    try { await onSave(valid); }
    finally { setBusy(null); }
  }

  async function start() {
    if (!canStart) return;
    setBusy("start");
    try { await onStart(); }
    finally { setBusy(null); }
  }

  return <section className={styles.settingsCard} aria-labelledby="settings-title">
    <div className={styles.settingsHeading}>
      <div><span className={styles.eyebrow}>THE HOST CALLS THE SHOTS</span><h2 id="settings-title">Match settings <span aria-hidden="true">✦</span></h2></div>
      <span className={styles.settingsSticker}>{isHost ? "your call!" : "host's picks"}</span>
    </div>
    {isHost ? <>
      <div className={styles.gameChoices} role="group" aria-label="Games in the mix">
        <p className={styles.gameChoicesTitle}>Games in the mix</p>
        {gameCatalog.map((game) => {
          const checked = draft.enabledGameIds.includes(game.id);
          const { art, OptionsEditor } = gameSettingsUi[game.id];
          const config = draft.gameSettings[game.id] ?? {
            roundCount: game.defaultRoundCount,
            durationSeconds: game.defaultDurationSeconds,
            options: gameRegistry[game.id].defaultOptions,
          };
          const invalid = checked && !parseMatchSettings({ enabledGameIds: [game.id], gameSettings: { [game.id]: config } });
          const open = openGameSettings === game.id;
          return <div className={styles.gameEntry} key={game.id}>
            <div className={styles.gameChoice}>
              <label className={styles.gameChoiceMain}>
                <input type="checkbox" checked={checked} disabled={!!busy || (checked && draft.enabledGameIds.length === 1)}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    enabledGameIds: event.target.checked
                      ? gameCatalog.map((entry) => entry.id).filter((id) => id === game.id || current.enabledGameIds.includes(id))
                      : current.enabledGameIds.filter((id) => id !== game.id),
                    gameSettings: event.target.checked ? { ...current.gameSettings, [game.id]: current.gameSettings[game.id] ?? config } : current.gameSettings,
                  }))} />
                <span className={styles.gameIcon}><Illustration kind={art} /></span>
                <span className={styles.gameChoiceCopy}><strong>{game.name}</strong><small>{game.instructions}</small></span>
              </label>
              {checked && <button className={styles.gameSettingsButton} type="button" data-invalid={!!invalid}
                aria-label={`${game.name} settings`} aria-expanded={open}
                onClick={() => setOpenGameSettings(open ? null : game.id)} disabled={!!busy}>
                <SettingsIcon /><span>Settings</span>
              </button>}
            </div>
            {checked && invalid && !open && <p className={styles.gameSettingsWarning}>Check {game.name} settings to save.</p>}
            {checked && open && <div className={styles.gameOptionsPanel} id={`game-settings-${game.id}`}>
              <h3>{game.name} settings</h3>
              <GameSettingsEditor game={game} settings={config} OptionsEditor={OptionsEditor} disabled={!!busy}
                onChange={(next) => setDraft((current) => ({ ...current, gameSettings: { ...current.gameSettings, [game.id]: next } }))} />
            </div>}
          </div>;
        })}
      </div>
      <div className={styles.settingsActions}>
        <p className={settingsError ? styles.settingsActionError : undefined} aria-live="polite">{settingsError
          ? "Fix the game settings to save."
          : needsSave ? "Save these settings to update this room. Everyone will ready up again."
          : changed ? "Save your picks. Everyone will ready up again." : "Settings are shared with everyone in the room."}</p>
        <button className={styles.softButton} type="button" onClick={() => void save()} disabled={!changed || !valid || !!busy}
          aria-busy={busy === "save"}>{busy === "save" ? "Saving…" : "Save settings"}</button>
        <button className={styles.goldButton} type="button" onClick={() => void start()} disabled={!canStart}
          aria-busy={busy === "start"}>{busy === "start" ? "Starting…" : "Start match ↗"}</button>
      </div>
      {!canStart && <p className={styles.startHint}>{settingsError ? "Fix the settings above before starting."
        : changed ? "Save settings first." : playerCount < 2 ? "Invite at least one friend to start."
          : !allReady ? "Everyone needs to be ready before you start." : ""}</p>}
    </> : <>
      <div className={styles.gameChoices} role="group" aria-label="Games in the mix">
        <p className={styles.gameChoicesTitle}>Games in the mix</p>
        {gameCatalog.filter((game) => settings.enabledGameIds.includes(game.id)).map((game) => {
          const { art, describeOptions } = gameSettingsUi[game.id];
          const config = settings.gameSettings[game.id]!;
          const open = openGameSettings === game.id;
          return <div className={styles.gameEntry} key={game.id}>
            <div className={styles.gameChoice}>
              <div className={styles.gameChoiceMain}>
                <span className={styles.gameIcon}><Illustration kind={art} /></span>
                <span className={styles.gameChoiceCopy}><strong>{game.name}</strong><small>{game.instructions}</small></span>
              </div>
              <button className={styles.gameSettingsButton} type="button"
                aria-label={`${game.name} settings`} aria-expanded={open}
                onClick={() => setOpenGameSettings(open ? null : game.id)}>
                <SettingsIcon /><span>Settings</span>
              </button>
            </div>
            {open && <div className={styles.gameOptionsPanel} id={`game-settings-${game.id}`}>
              <h3>{game.name} settings</h3>
              {game.id === "flash-grid" && isFlashGridOptions(config.options)
                ? <div className={styles.flashSummary}>{config.options.rounds.map((round, index) =>
                  <p key={index}>Round {index + 1}: {round.size} × {round.size} · {round.studySeconds}s to see · {round.recallSeconds}s to choose</p>)}</div>
                : game.id === "internal-clock" && isInternalClockOptions(config.options)
                  ? <div className={styles.flashSummary}>{config.options.rounds.map((round, index) =>
                    <p key={index}>Round {index + 1}: guess {round.targetSeconds} seconds</p>)}</div>
                : <p className={styles.gameOptionValue}>{config.roundCount} {config.roundCount === 1 ? "round" : "rounds"} · {config.durationSeconds} seconds each
                  {describeOptions && <> · {describeOptions(config.options)}</>}</p>}
            </div>}
          </div>;
        })}
      </div>
      {needsSave && <p className={styles.startHint}>The host needs to update this room’s settings before starting.</p>}
    </>}
  </section>;
}
