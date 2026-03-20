import joblib
from pathlib import Path

# Load features
features_path = Path(__file__).parent / 'models' / 'multiclass' / 'features.pkl'
features = joblib.load(features_path)

print("Expected features:")
print(features)
print(f"\nTotal features: {len(features)}")
