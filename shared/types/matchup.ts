import type { GameStats } from "./stats";

export interface ComparisonRequest {
  leagueId: string;
  firstTeamId: string;
  secondTeamId: string;
  seasonEndYear: number;
}
export interface MatchupRequest extends ComparisonRequest {
  startDate: string;
  endDate: string;
}

export type TeamCategoryTotals = {
  fgm: number;
  fga: number;
  fgPercentage: number | null;

  ftm: number;
  fta: number;
  ftPercentage: number | null;

  threepm: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  to: number;
};

export type SummedStatKey =
  | "fgm"
  | "fga"
  | "ftm"
  | "fta"
  | "threepm"
  | "points"
  | "rebounds"
  | "assists"
  | "steals"
  | "blocks"
  | "to";

export type MatchupCategory =
  | "fgPercentage"
  | "ftPercentage"
  | "threepm"
  | "points"
  | "rebounds"
  | "assists"
  | "steals"
  | "blocks"
  | "to";

export type CategoryWinner = "win" | "lose" | "tie";

export type CategoryComparison = {
  category: MatchupCategory;
  winner: CategoryWinner;
};

export type MatchupTeamResult = {
  teamId: string;
  name: string;
  totals: TeamCategoryTotals;
  missingPlayerIds: string[];
};

export interface ComparisonResult {
  firstTeam: MatchupTeamResult;
  secondTeam: MatchupTeamResult;
  seasonEndYear: number;
  categories: CategoryComparison[];
}

export interface MatchupResult extends ComparisonResult {
  startDate: string;
  endDate: string;
}

export interface PlayerWeeklyProjection {
  playerId: string;
  nbaTeam: string | null;
  scheduledGames: number | null;
  statsSeasonEndYear: number | null;
  perGameStats: GameStats | null;
  projectedStats: GameStats | null;
  statsAvailable: boolean;
  scheduleAvailable: boolean;
}

export interface WeeklyProjectionTeamResult extends MatchupTeamResult {
  players: PlayerWeeklyProjection[];
  missingSchedulePlayerIds: string[];
}

export interface WeeklyProjectionResult extends ComparisonResult {
  startDate: string;
  endDate: string;
  firstTeam: WeeklyProjectionTeamResult;
  secondTeam: WeeklyProjectionTeamResult;
}
