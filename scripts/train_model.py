import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

FEATURES_PATH = 'data/processed/features.csv'
MODEL_OUTPUT_PATH = 'models/over_under_model.pkl'

THRESHOLD = 220  # You can tune this later based on the average total points

def train_model():
    print("📊 Loading feature data...")
    df = pd.read_csv(FEATURES_PATH)

    print("🎯 Creating target variable (OVER_UNDER)...")
    df = df.dropna(subset=['AVG_PTS_LAST_5', 'WINS_LAST_5'])
    df['OVER_UNDER'] = (df['TOTAL_POINTS'] > THRESHOLD).astype(int)

    print("🔍 Selecting features and splitting data...")
    X = df[['AVG_PTS_LAST_5', 'WINS_LAST_5']]
    y = df['OVER_UNDER']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("🤖 Training Random Forest Classifier...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    print("📈 Evaluating model...")
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"✅ Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred))

    print(f"💾 Saving model to {MODEL_OUTPUT_PATH}...")
    os.makedirs(os.path.dirname(MODEL_OUTPUT_PATH), exist_ok=True)
    joblib.dump(clf, MODEL_OUTPUT_PATH)
    print("🎉 Model training complete and saved!")

if __name__ == '__main__':
    train_model()
