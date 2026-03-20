"""
Step 2: Data Collection
Load dataset and show basic stats
"""

import pandas as pd
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class DataCollection:
    """
    Load dataset from csv
    """
    
    def __init__(self, filepath='ml-pipeline/dataset.csv'):
        self.filepath = Path(filepath)
        
    def load_data(self):
        print("\n" + "="*70)
        print("STEP 2: DATA COLLECTION")
        print("="*70)
        
        try:
            df = pd.read_csv(self.filepath)
            print("DATASET LOADED SUCCESSFULLY")
            print("="*70)
            print(f"\nDataset Shape: {df.shape}")
            print(f"Number of Samples: {df.shape[0]:,}")
            print(f"Number of Features: {df.shape[1] - 1}")
            
            memory_usage = df.memory_usage(deep=True).sum() / 1024**2
            print(f"\nMemory Usage: {memory_usage:.2f} MB")
            
            print("\nFirst few rows:")
            print(df.head())
            
            print("\nDataset Info:")
            print("="*70)
            df.info()
            
            return df
            
        except FileNotFoundError:
            logger.error(f"Dataset not found at {self.filepath}")
            raise

if __name__ == "__main__":
    collector = DataCollection()
    df = collector.load_data()
