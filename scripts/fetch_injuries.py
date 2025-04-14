import os
import json
import requests
import pandas as pd
from datetime import datetime

INJURIES_CSV_PATH = 'data/raw/injuries.csv'

def fetch_injury_report() -> pd.DataFrame:
    """
    Fetches the current NBA injuries from ESPN's JSON endpoint at:
      https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries
    
    Each record in the JSON is under the top-level "injuries" key, looking like:
    {
      "athlete": {...},
      "team": {...},
      "type": {...},
      "details": {...},
      "notes": {...}
    }

    We'll parse these fields:
      - TEAM: team["displayName"]
      - PLAYER: athlete["fullName"]
      - POSITION: athlete["position"]["abbreviation"] (if present)
      - INJURY_TYPE: details["type"] (plus side/detail)
      - INJURY_STATUS: type["description"] (like "out")
      - START_DATE: details["returnDate"]
      - DETAILS: any note or "headline" from notes["items"][0]
    
    Returns:
        pd.DataFrame with columns:
        TEAM, PLAYER, POSITION, INJURY_TYPE, INJURY_STATUS, START_DATE, DETAILS, FETCHED_AT
    """
    url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries"
    print("📡 Fetching NBA injury data from ESPN API...")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"⚠️ Error {resp.status_code} while fetching injury data.")
        return pd.DataFrame()

    data = resp.json()
    print("DEBUG: Top-level keys:", list(data.keys()))
    # Should see something like ['timestamp', 'status', 'season', 'injuries']

    injuries_list = data.get("injuries", [])
    if not injuries_list:
        print("⚠️ No 'injuries' data found in the response or it's empty.")
        return pd.DataFrame()
    
    print(f"DEBUG: Found {len(injuries_list)} injury records to process.")
    if len(injuries_list) > 0:
        print("DEBUG: Example of first injury record structure:", json.dumps(injuries_list[0], indent=2)[:500] + "...")

    all_injuries = []
    for injury_dict in injuries_list:
        # Team
        team_info = injury_dict.get("team", {})
        team_name = team_info.get("displayName", "Unknown")

        # Athlete
        athlete = injury_dict.get("athlete", {})
        player_name = athlete.get("fullName", "Unknown")
        position_info = athlete.get("position", {})
        position = position_info.get("abbreviation", "N/A")

        # Type / Status
        type_info = injury_dict.get("type", {})
        injury_status = type_info.get("description", "Unknown")   # e.g. "out"

        # Additional details
        details = injury_dict.get("details", {})
        raw_injury_type = details.get("type", "Unknown")          # e.g. "Hamstring"
        side = details.get("side", None)                          # e.g. "Right"
        detail = details.get("detail", None)                      # e.g. "Strain"
        start_date = details.get("returnDate", "Unknown")         # e.g. "2025-10-01"

        # Combine these into a single injury_type string
        extras = []
        if detail:
            extras.append(detail)
        if side:
            extras.append(side)
        extras_str = " ".join(extras).strip()
        if extras_str:
            injury_type = f"{raw_injury_type} {extras_str}"
        else:
            injury_type = raw_injury_type

        # Possibly a note
        notes = injury_dict.get("notes", {})
        items = notes.get("items", [])
        if items:
            # Taking the first headline if multiple exist
            note_headline = items[0].get("headline", "")
        else:
            note_headline = ""

        all_injuries.append({
            "TEAM": team_name,
            "PLAYER": player_name,
            "POSITION": position,
            "INJURY_TYPE": injury_type,
            "INJURY_STATUS": injury_status,
            "START_DATE": start_date,
            "DETAILS": note_headline,
            "FETCHED_AT": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })

    df_injuries = pd.DataFrame(all_injuries)
    return df_injuries

def save_injuries_to_csv(injuries_df: pd.DataFrame, csv_path: str = INJURIES_CSV_PATH):
    """
    Saves the fetched injuries to a CSV, appending if the file already exists.
    Duplicates are dropped based on (TEAM, PLAYER, INJURY_STATUS, START_DATE).
    """
    if injuries_df.empty:
        print("⚠️ No injury data to save (DataFrame is empty).")
        return

    # Ensure directory exists
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)

    if os.path.exists(csv_path):
        existing = pd.read_csv(csv_path)
        combined = pd.concat([existing, injuries_df], ignore_index=True)
        combined.drop_duplicates(
            subset=["TEAM", "PLAYER", "INJURY_STATUS", "START_DATE"],
            keep='last',
            inplace=True
        )
        combined.to_csv(csv_path, index=False)
        print(f"✅ Appended new injury records to {csv_path}")
    else:
        injuries_df.to_csv(csv_path, index=False)
        print(f"✅ Created new injury CSV at {csv_path}")

if __name__ == "__main__":
    df_injuries = fetch_injury_report()
    if not df_injuries.empty:
        save_injuries_to_csv(df_injuries, INJURIES_CSV_PATH)
        print("✅ Injury data fetched and saved successfully.")
    else:
        print("⚠️ No injury data was fetched. CSV will not be updated.")