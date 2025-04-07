# checking to see what varibles are available

import pandas as pd

df = pd.read_csv('data/raw/raw_games.csv')
print(df.columns.tolist())