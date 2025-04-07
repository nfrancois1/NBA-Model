import pandas as pd
import os

RAW_DATA_PATH = 'data/raw/raw_games.csv'
OUTPUT_PATH = 'data/processed/games_cleaned.csv'

def preprocess_data():
    print("🔄 Loading raw data...")
    df = pd.read_csv(RAW_DATA_PATH)

    print("⚠️ Skipping SEASON_TYPE filter (column not found in data)...")

    # Select key columns
    df = df[['GAME_ID', 'GAME_DATE', 'TEAM_ID', 'TEAM_ABBREVIATION', 'PTS', 'MATCHUP', 'WL']]

    # Create unique identifier for each game by using the lowest team ID
    df['GAME_KEY'] = df.groupby('GAME_ID')['TEAM_ID'].transform('min')

    print("📊 Grouping data to compute total points per game...")
    game_totals = df.groupby('GAME_ID').agg({
        'GAME_DATE': 'first',
        'PTS': 'sum',
        'TEAM_ABBREVIATION': list,
        'WL': list
    }).reset_index()

    game_totals.rename(columns={
        'PTS': 'TOTAL_POINTS',
        'TEAM_ABBREVIATION': 'TEAMS',
        'WL': 'TEAM_RESULTS'
    }, inplace=True)

    print(f"💾 Saving cleaned data to {OUTPUT_PATH}...")
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    game_totals.to_csv(OUTPUT_PATH, index=False)
    print("✅ Done!")

if __name__ == '__main__':
    preprocess_data()
