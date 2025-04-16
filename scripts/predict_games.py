import pandas as pd
import joblib
from datetime import datetime
from espn_api import fetch_espn_games
from sklearn.ensemble import RandomForestClassifier

FEATURES_PATH = 'data/processed/features.csv'
MODEL_PATH = 'models/over_under_model.pkl'

# 🔁 ESPN full team name -> abbreviation used in features.csv
TEAM_NAME_MAP = {
    'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN',
    'Charlotte Hornets': 'CHA', 'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE',
    'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET',
    'Golden State Warriors': 'GSW', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
    'LA Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM',
    'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN',
    'New Orleans Pelicans': 'NOP', 'New York Knicks': 'NYK', 'Oklahoma City Thunder': 'OKC',
    'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHX',
    'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SAS',
    'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS'
}

def predict_today_games():
    print("🔮 Loading model and features...")
    with open(MODEL_PATH, 'rb') as f:
        model: RandomForestClassifier = joblib.load(MODEL_PATH)

    features_df = pd.read_csv(FEATURES_PATH)
    features_df['GAME_DATE'] = pd.to_datetime(features_df['GAME_DATE'])

    print("🗓️ Getting today’s games from ESPN...")
    espn_games = pd.DataFrame(fetch_espn_games())

    if espn_games.empty:
        print("⚠️ No games found to predict today.")
        return

    today = pd.to_datetime(datetime.today().date())
    predictions = []

    for _, row in espn_games.iterrows():
        # Normalize full names to abbreviations
        team1 = TEAM_NAME_MAP.get(row['home_team'])
        team2 = TEAM_NAME_MAP.get(row['away_team'])

        if not team1 or not team2:
            print(f"❌ Unknown team name in matchup: {row['away_team']} @ {row['home_team']}")
            continue

        # Get most recent data for both teams
        team1_stats = features_df[features_df['TEAM'] == team1].sort_values('GAME_DATE').dropna().iloc[-1:]
        team2_stats = features_df[features_df['TEAM'] == team2].sort_values('GAME_DATE').dropna().iloc[-1:]

        if team1_stats.empty or team2_stats.empty:
            print(f"⚠️ Skipping {row['away_team']} vs {row['home_team']} — missing historical data.")
            continue

        if pd.isna(team1_stats['AVG_PTS_LAST_5'].values[0]) or pd.isna(team2_stats['AVG_PTS_LAST_5'].values[0]):
            print(f"⚠️ Incomplete data for {team1} vs {team2} — using best available.")

        avg_pts = (
            team1_stats['AVG_PTS_LAST_5'].values[0] +
            team2_stats['AVG_PTS_LAST_5'].values[0]
        ) / 2

        wins = (
            team1_stats['WINS_LAST_5'].values[0] +
            team2_stats['WINS_LAST_5'].values[0]
        ) / 2

        feature_row = pd.DataFrame([{
            'AVG_PTS_LAST_5': avg_pts,
            'WINS_LAST_5': wins
        }])

        prediction = model.predict(feature_row)[0]
        label = 'OVER' if prediction == 1 else 'UNDER'

        predictions.append({
            'matchup': f"{row['away_team']} @ {row['home_team']}",
            'prediction': label
        })

    print("\n📊 Predictions for Today:")
    for pred in predictions:
        print(f"➡️ {pred['matchup']}: {pred['prediction']}")

if __name__ == '__main__':
    predict_today_games()
