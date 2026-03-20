"""
Step 7: Model Selection
Define models dictionary
"""

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

class ModelSelection:
    """
    Define models to be trained
    """
    
    @staticmethod
    def get_models():
        print("\n" + "="*70)
        print("STEP 7: MODEL SELECTION")
        print("="*70)
        
        models = {
            'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
            'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, random_state=42),
            'XGBoost': XGBClassifier(n_estimators=100, random_state=42, eval_metric='mlogloss'),
            'LightGBM': LGBMClassifier(n_estimators=100, random_state=42, verbose=-1)
        }
        
        print(f"\nSelected Models for Training:")
        for i, name in enumerate(models.keys(), 1):
            print(f"  {i}. {name}")
            
        return models
