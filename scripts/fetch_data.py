# Directory: scripts/fetch_data.py

import os
import time
import pandas as pd
from nba_api.stats.endpoints import leaguegamefinder
from nba_api.stats.static import teams
from nba_api.stats.endpoints import boxscoretraditionalv2


def get_team_id(team_name):
    nba_teams = teams.get_teams()
    for team in nba_teams:
        if team_name.lower() in team['full_name'].lower():
            return team['id']
    return None


def fetch_games_by_team(team_id, season='2023-24'):
    gamefinder = leaguegamefinder.LeagueGameFinder(team_id_nullable=team_id, season_nullable=season)
    games = gamefinder.get_data_frames()[0]
    return games


def save_games_to_csv(games_df, team_name):
    filename = f"data/raw/{team_name.replace(' ', '_').lower()}_games.csv"
    games_df.to_csv(filename, index=False)
    print(f"Saved to {filename}")


def fetch_and_save_all_teams():
    nba_teams = teams.get_teams()
    for team in nba_teams:
        print(f"Fetching: {team['full_name']}")
        try:
            games = fetch_games_by_team(team['id'])
            save_games_to_csv(games, team['full_name'])
            time.sleep(1.2)  # avoid rate limiting
        except Exception as e:
            print(f"Error fetching {team['full_name']}: {e}")


if __name__ == '__main__':
    os.makedirs("data/raw", exist_ok=True)
    fetch_and_save_all_teams()
