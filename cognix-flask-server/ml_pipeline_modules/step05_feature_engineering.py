"""
Step 5: Feature Selection & Engineering
Exactly as per ML Pipeline Notebook - Using Random Forest feature importance
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class FeatureEngineering:
    """
    Feature Selection using Random Forest feature importance
    """
    
    def __init__(self, df):
        self.df = df.copy()
        self.output_dir = Path('ml_pipeline_outputs/features')
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def run_feature_engineering(self, importance_threshold=0.01):
        """Feature selection using Random Forest importance"""
        print("\n" + "=" * 70)
        print("STEP 5: FEATURE SELECTION & ENGINEERING")
        print("=" * 70)
        
        # Prepare data
        X = self.df.drop('disease', axis=1)
        y = self.df['disease']
        
        # Encode target
        le = LabelEncoder()
        y_encoded = le.fit_transform(y)
        
        print(f"\nTotal Features: {X.shape[1]}")
        print(f"Target Classes: {list(le.classes_)}")
        
        # Calculate feature importance using Random Forest
        print("\nCalculating feature importance...")
        rf_temp = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        rf_temp.fit(X, y_encoded)
        
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': rf_temp.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nTop 20 Most Important Features:")
        print(feature_importance.head(20).to_string(index=False))
        
        # Visualize feature importance
        self._plot_feature_importance(feature_importance.head(20))
        
        # Select features based on threshold
        selected_features = feature_importance[
            feature_importance['importance'] > importance_threshold
        ]['feature'].tolist()
        
        print(f"\nFeature Selection Results:")
        print(f"  Original features: {len(X.columns)}")
        print(f"  Selected features: {len(selected_features)}")
        print(f"  Removed features: {len(X.columns) - len(selected_features)}")
        
        # Update dataframe with selected features
        X_selected = X[selected_features]
        df_selected = pd.concat([X_selected, y], axis=1)
        
        print(f"\n✓ Feature selection complete!")
        print(f"Final feature set: {X_selected.shape[1]} features")
        print("=" * 70)
        
        # Save feature importance
        feature_importance.to_csv(self.output_dir / 'feature_importance.csv', index=False)
        
        return {
            'selected_features': selected_features,
            'feature_importance': feature_importance,
            'df': df_selected
        }
    
    def _plot_feature_importance(self, top_features):
        """Plot top feature importances"""
        plt.figure(figsize=(12, 10))
        plt.barh(range(len(top_features)), top_features['importance'], color='steelblue')
        plt.yticks(range(len(top_features)), top_features['feature'])
        plt.xlabel('Importance Score', fontsize=12)
        plt.ylabel('Feature', fontsize=12)
        plt.title('Top 20 Feature Importances', fontsize=14, fontweight='bold')
        plt.gca().invert_yaxis()
        plt.grid(axis='x', alpha=0.3)
        plt.tight_layout()
        
        plt.savefig(self.output_dir / 'feature_importance.png', dpi=300, bbox_inches='tight')
        print(f"\n📊 Plot saved: {self.output_dir / 'feature_importance.png'}")
        plt.close()

if __name__ == "__main__":
    from step02_data_collection import DataCollection
    from step04_preprocessing import DataPreprocessing
    
    df = DataCollection().load_data()
    df_clean = DataPreprocessing(df).run_preprocessing()
    FeatureEngineering(df_clean).run_feature_engineering()
