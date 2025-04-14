import pandas as pd

df = pd.read_csv('data/processed/features.csv')
print(df['TEAM'].unique())  # See which teams are included
