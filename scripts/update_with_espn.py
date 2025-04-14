import requests
import pandas as pd
from datetime import datetime, timedelta
import os

RAW_DATA_PATH = 'data/raw/raw_games.csv'

def fetch_recent_box_scores(days_back=90):
    today = datetime.today()
    recent_data = []

    print(f"📰 Scraping ESPN box scores for the last {days_back} days...")

    for delta in range(days_back):
        date = (today - timedelta(days=delta)).strftime('%Y%m%d')
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={date}"
        resp = requests.get(url)
        if resp.status_code != 200:
            print(f"⚠️ Failed to get data for {date}")
            continue

        games = resp.json().get("events", [])
        for game in games:
            game_id = game['id']
            game_date = game['date'][:10]
            box_url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}"
            box_resp = requests.get(box_url)
            if box_resp.status_code != 200:
                continue

            box_data = box_resp.json()
            teams = box_data.get('boxscore', {}).get('teams', [])

            if not teams or len(teams) != 2:
                continue  # Skip incomplete games

            for team in teams:
                stats = team.get('statistics')
                if not stats:
                    continue  # Skip if no stats are available

                stat_map = {s['name']: s['displayValue'] for s in stats}
                team_info = team['team']

                entry = {
                    'SEASON_ID': '2024-25',
                    'TEAM_ID': team_info.get('id', ''),
                    'TEAM_ABBREVIATION': team_info.get('abbreviation', ''),
                    'TEAM_NAME': team_info.get('displayName', ''),
                    'GAME_ID': game_id,
                    'GAME_DATE': game_date,
                    'MATCHUP': f"{team_info.get('displayName', '')} vs ???",  # Placeholder
                    'WL': team.get('winner', False) and 'W' or 'L',
                    'MIN': stat_map.get('MIN', '240'),
                    'PTS': stat_map.get('PTS', '0'),
                    'FGM': stat_map.get('FGM', '0'),
                    'FGA': stat_map.get('FGA', '0'),
                    'FG_PCT': stat_map.get('FG%', '0'),
                    'FG3M': stat_map.get('3PM', '0'),
                    'FG3A': stat_map.get('3PA', '0'),
                    'FG3_PCT': stat_map.get('3P%', '0'),
                    'FTM': stat_map.get('FTM', '0'),
                    'FTA': stat_map.get('FTA', '0'),
                    'FT_PCT': stat_map.get('FT%', '0'),
                    'OREB': stat_map.get('OREB', '0'),
                    'DREB': stat_map.get('DREB', '0'),
                    'REB': stat_map.get('REB', '0'),
                    'AST': stat_map.get('AST', '0'),
                    'STL': stat_map.get('STL', '0'),
                    'BLK': stat_map.get('BLK', '0'),
                    'TOV': stat_map.get('TO', '0'),
                    'PF': stat_map.get('PF', '0'),
                    'PLUS_MINUS': stat_map.get('+/-', '0')
                }

                recent_data.append(entry)

    return pd.DataFrame(recent_data)

def append_to_raw_csv(new_data: pd.DataFrame):
    if new_data.empty:
        print("⚠️ No new data to append.")
        return

    if os.path.exists(RAW_DATA_PATH):
        existing = pd.read_csv(RAW_DATA_PATH)
        combined = pd.concat([existing, new_data], ignore_index=True)
    else:
        combined = new_data

    combined.drop_duplicates(subset=['GAME_ID', 'TEAM_ID'], inplace=True)
    combined.to_csv(RAW_DATA_PATH, index=False)
    print(f"✅ Appended {len(new_data)} new rows to {RAW_DATA_PATH}")

if __name__ == '__main__':
    new_games_df = fetch_recent_box_scores(days_back=90)
    append_to_raw_csv(new_games_df)
