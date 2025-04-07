# scripts/espn_api.py

import requests
import datetime
import pandas as pd

def fetch_espn_today_games():
    print("📡 Fetching today's NBA games from ESPN...")
    today = datetime.datetime.now().strftime("%Y%m%d")
    url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={today}"

    response = requests.get(url)
    response.raise_for_status()
    data = response.json()

    games = data.get("events", [])
    if not games:
        print("⚠️ No games found for today on ESPN.")
        return pd.DataFrame()

    game_rows = []
    for game in games:
        competition = game['competitions'][0]
        status = competition['status']['type']['description']
        teams = competition['competitors']
        home = next(team for team in teams if team['homeAway'] == 'home')
        away = next(team for team in teams if team['homeAway'] == 'away')

        game_rows.append({
            'game_id': game['id'],
            'home_team': home['team']['displayName'],
            'away_team': away['team']['displayName'],
            'home_score': home.get('score', None),
            'away_score': away.get('score', None),
            'status': status,
        })

    df = pd.DataFrame(game_rows)
    print(f"✅ Found {len(df)} games from ESPN:")
    print(df[['away_team', 'home_team', 'status']])
    return df

if __name__ == "__main__":
    fetch_espn_today_games()
