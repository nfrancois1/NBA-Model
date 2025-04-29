export interface Game {
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number | null | "TBD";
  away_score: number | null | "TBD";
  status: string;
  game_time: string | null;
  is_future_game: boolean;
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