import pandas as pd
import os
import ast

CLEANED_DATA_PATH = 'data/processed/games_cleaned.csv'
FEATURES_OUTPUT_PATH = 'data/processed/features.csv'

def safe_parse_list(s):
    try:
        val = ast.literal_eval(s)
        return val if isinstance(val, list) else []
    except:
        return []

def generate_features():
    print("🔄 Loading cleaned game data...")
    df = pd.read_csv(CLEANED_DATA_PATH)

    print("📈 Generating team-level statistics...")
    rows = []
    skipped = 0
    for _, row in df.iterrows():
        teams = safe_parse_list(row['TEAMS'])
        results = safe_parse_list(row['TEAM_RESULTS'])
        total_points = row['TOTAL_POINTS']

        if len(teams) != 2 or len(results) != 2:
            skipped += 1
            continue

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

    print(f"⚠️ Skipped {skipped} malformed rows.")
    flat_df = pd.DataFrame(rows)

    flat_df['GAME_DATE'] = pd.to_datetime(flat_df['GAME_DATE'], errors='coerce')
    flat_df = flat_df.dropna(subset=['GAME_DATE'])
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
