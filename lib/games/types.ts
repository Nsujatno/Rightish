export type GameMetadata = {
  id: string;
  name: string;
  instructions: string;
  defaultRoundCount: number;
  defaultDurationSeconds: number;
  limits: {
    minRounds: number;
    maxRounds: number;
    minDurationSeconds: number;
    maxDurationSeconds: number;
  };
};

export type ScoredResult = { score: number };

// Pure game rules can run in the browser for practice and on the server for rooms.
// Room clients send an answer, never a score. Rendering belongs to app/components.
export type GameDefinition<Challenge, Answer, Result extends ScoredResult, Options = undefined> = GameMetadata & {
  defaultOptions: Options;
  validateOptions: (input: unknown) => input is Options;
  generate: (seed: string, options?: Options) => Challenge;
  validateAnswer: (challenge: Challenge, input: unknown) => input is Answer;
  score: (challenge: Challenge, answer: Answer | null, options?: Options) => Result;
};

export type GameMatchSettings = {
  roundCount: number;
  durationSeconds: number;
  options: unknown;
};

export type MatchSettings<GameId extends string = string> = {
  enabledGameIds: readonly GameId[];
  gameSettings: Partial<Record<GameId, GameMatchSettings>>;
};

export type PlayerRoundResult<Result extends ScoredResult> = {
  playerId: string;
  nickname: string;
  result: Result;
  totalScore: number;
  previousRank: number | null;
};

export type RoundViewProps<Challenge, Answer> = {
  challenge: Challenge;
  onAnswerChange: (answer: Answer | null) => void;
  onConfirm: () => void;
};
