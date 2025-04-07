import pandas as pd
import os

CLEANED_DATA_PATH = 'data/processed/games_cleaned.csv'
FEATURES_OUTPUT_PATH = 'data/processed/features.csv'

def generate_features():
    print("🔄 Loading cleaned game data...")
    df = pd.read_csv(CLEANED_DATA_PATH)

    print("📈 Generating team-level statistics...")
    # Flatten data: one row per team per game
    rows = []
    for _, row in df.iterrows():
        teams = row['TEAMS']
        results = row['TEAM_RESULTS']
        total_points = row['TOTAL_POINTS']

        for i in range(2):
            team = teams[i]
            opponent = teams[1 - i]
            win = 1 if results[i] == 'W' else 0
            rows.append({
                'GAME_ID': row['GAME_ID'],
                'GAME_DATE': row['GAME_DATE'],
                'TEAM': team,
                'OPPONENT': opponent,
                'WON': win,
                'TOTAL_POINTS': total_points
            })

    flat_df = pd.DataFrame(rows)

    # Sort by team and game date
    flat_df['GAME_DATE'] = pd.to_datetime(flat_df['GAME_DATE'])
    flat_df = flat_df.sort_values(['TEAM', 'GAME_DATE'])

    print("🔁 Calculating rolling features...")
    flat_df['AVG_PTS_LAST_5'] = flat_df.groupby('TEAM')['TOTAL_POINTS'].transform(lambda x: x.shift(1).rolling(5).mean())
    flat_df['WINS_LAST_5'] = flat_df.groupby('TEAM')['WON'].transform(lambda x: x.shift(1).rolling(5).sum())

    print(f"💾 Saving features to {FEATURES_OUTPUT_PATH}...")
    os.makedirs(os.path.dirname(FEATURES_OUTPUT_PATH), exist_ok=True)
    flat_df.to_csv(FEATURES_OUTPUT_PATH, index=False)
    print("✅ Features generated successfully!")

if __name__ == '__main__':
    generate_features()
