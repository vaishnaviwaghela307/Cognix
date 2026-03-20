"""
Step 4: Data Preprocessing
Duplicates, Data types, Feature Range
"""

import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class DataPreprocessing:
    """
    Data Cleaning and Preprocessing
    """
    
    def __init__(self, df):
        self.df = df.copy()
        
    def run_preprocessing(self):
        print("\n" + "="*70)
        print("STEP 4: DATA PREPROCESSING")
        print("="*70)
        
        # 1. Handle duplicates
        duplicates = self.df.duplicated().sum()
        print(f"\n1. Duplicate Rows: {duplicates}")
        if duplicates > 0:
            self.df = self.df.drop_duplicates()
            print(f"   ✓ Removed {duplicates} duplicate rows")
            
        # 2. Check data types
        print(f"\n2. Data Types:")
        print(f"   Numeric columns: {len(self.df.select_dtypes(include=[np.number]).columns)}")
        print(f"   Object columns: {len(self.df.select_dtypes(include=['object']).columns)}")
        
        # 3. Feature range check
        print(f"\n3. Feature Range Analysis:")
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        normalized_features = 0
        for col in numeric_cols:
            if self.df[col].min() >= 0 and self.df[col].max() <= 1.01: # Tolerance
                normalized_features += 1
                
        print(f"   Features in [0,1] range: {normalized_features}/{len(numeric_cols)}")
        
        print(f"\n✓ Preprocessing complete!")
        print(f"Final dataset shape: {self.df.shape}")
        
        return self.df

if __name__ == "__main__":
    from step02_data_collection import DataCollection
    df = DataCollection().load_data()
    pre = DataPreprocessing(df)
    df_clean = pre.run_preprocessing()
