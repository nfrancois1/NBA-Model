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