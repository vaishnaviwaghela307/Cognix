"""
Step 6: Data Split
Train Test Split, Stratified, Scaling
"""

import pandas as pd
import logging
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder

logger = logging.getLogger(__name__)

class DataSplitter:
    """
    Split and Scale Data
    """
    
    def __init__(self, df):
        self.df = df
        
    def split_data(self):
        print("\n" + "="*70)
        print("STEP 6: DATASET SPLITTING")
        print("="*70)
        
        X = self.df.drop('disease', axis=1)
        y = self.df['disease']
        
        # Encode target
        le = LabelEncoder()
        y_encoded = le.fit_transform(y)
        
        # Split (80-20)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        print(f"\nSplit Configuration:")
        print(f"  Train size: {len(X_train)} samples ({len(X_train)/len(X)*100:.1f}%)")
        print(f"  Test size:  {len(X_test)} samples ({len(X_test)/len(X)*100:.1f}%)")
        
        # Scaling
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        print("\n✓ Feature scaling complete!")
        print(f"  Scaler fitted on training data applied to both sets")
        
        return X_train, X_test, y_train, y_test, scaler, le, X_train_scaled, X_test_scaled

if __name__ == "__main__":
    # Test logic placeholder
    pass
