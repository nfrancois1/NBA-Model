import requests
import datetime
import pandas as pd
import json
import sys

def fetch_espn_games(date_str=None):
    if date_str is None:
        date_str = datetime.datetime.now().strftime("%Y%m%d")

    print(f"Fetching NBA games for date {date_str} from ESPN...", file=sys.stderr)
    url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={date_str}"

    response = requests.get(url)
    response.raise_for_status()
    data = response.json()

    games = data.get("events", [])
    if not games:
        print(f"No games found for {date_str} on ESPN.", file=sys.stderr)
        return []

    game_rows = []
    for game in games:
        competition = game['competitions'][0]
        status = competition['status']['type']['description']
        teams = competition['competitors']
        home = next(team for team in teams if team['homeAway'] == 'home')
        away = next(team for team in teams if team['homeAway'] == 'away')

        # Get the game time if available
        game_time = None
        if 'date' in competition:
            game_time = competition['date']

        is_future_game = status.lower() in ['scheduled', 'pre-game']

        game_rows.append({
            'game_id': game['id'],
            'home_team': home['team']['displayName'],
            'away_team': away['team']['displayName'],
            'home_score': "TBD" if is_future_game else home.get('score', None),
            'away_score': "TBD" if is_future_game else away.get('score', None),
            'status': status,
            'game_time': game_time,
            'is_future_game': is_future_game
        })

    return game_rows

if __name__ == "__main__":
    import sys
    date_str = sys.argv[1] if len(sys.argv) > 1 else None
    games = fetch_espn_games(date_str)
    print(json.dumps(games))