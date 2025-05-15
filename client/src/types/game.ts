export interface Injury {
  player: string;
  position: string;
  type: string;
  status: string;
  details: string;
}

export interface TeamInjuries {
  team: string;
  injuries: Injury[];
  impactScore: number; // 0-1 scale
}

export interface Game {
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number | null | "TBD";
  away_score: number | null | "TBD";
  status: string;
  game_time: string | null;
  is_future_game: boolean;
  prediction?: {
    outcome: string;
    confidence: number;
    homeTeamInjuries?: TeamInjuries;
    awayTeamInjuries?: TeamInjuries;
  };
}

export interface BettingSite {
  name: string;
  logo: string;
  url: string;
  odds: {
    homeTeamOdds: string;
    awayTeamOdds: string;
    overUnder: string;
  };
} 