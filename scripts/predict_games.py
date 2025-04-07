# scripts/predict_games.py

import pandas as pd
import pickle
from datetime import datetime
from espn_api import fetch_espn_today_games
from sklearn.ensemble import RandomForestClassifier

FEATURES_PATH = 'data/processed/features.csv'
MODEL_PATH = 'models/over_under_model.pkl'

def predict_today_games():
    print("🔮 Loading model and features...")
    with open(MODEL_PATH, 'rb') as f:
        model: RandomForestClassifier = pickle.load(f)

    features_df = pd.read_csv(FEATURES_PATH)
    features_df['GAME_DATE'] = pd.to_datetime(features_df['GAME_DATE'])

    print("🗓️ Getting today’s games from ESPN...")
    espn_games = fetch_espn_today_games()

    if espn_games.empty:
        print("⚠️ No games found to predict today.")
        return

    today = pd.to_datetime(datetime.today().date())
    predictions = []

    for _, row in espn_games.iterrows():
        team1 = row['home_team']
        team2 = row['away_team']

        # Get most recent game for both teams
        team1_stats = features_df[features_df['TEAM'] == team1].sort_values('GAME_DATE').dropna().iloc[-1:]  # dropna added
        team2_stats = features_df[features_df['TEAM'] == team2].sort_values('GAME_DATE').dropna().iloc[-1:]

        if team1_stats.empty or team2_stats.empty:
            print(f"⚠️ Skipping {team1} vs {team2} — missing any historical data.")
            continue

        # If either team lacks full rolling average, warn but continue
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
            'matchup': f"{team2} @ {team1}",
            'prediction': label
        })

    print("\n📊 Predictions for Today:")
    for pred in predictions:
        print(f"➡️ {pred['matchup']}: {pred['prediction']}")

if __name__ == '__main__':
    predict_today_games()
