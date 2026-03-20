"""
Step 11: Final Validation & Saving
Save artifacts to models/ folder
"""

import os
import joblib
import json
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
from datetime import datetime
from pathlib import Path

class finalValidator:
    """
    Final validation and saving
    """
    
    def __init__(self, model, scaler, label_encoder, features_list):
        self.model = model
        self.scaler = scaler
        self.le = label_encoder
        self.features = features_list
        self.models_dir = Path('models/multiclass')
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
    def validate_and_save(self, X_test_scaled, y_test):
        print("\n" + "="*70)
        print("STEP 11: FINAL VALIDATION & SAVING")
        print("="*70)
        
        y_pred = self.model.predict(X_test_scaled)
        
        print("\nFinal Model Performance:")
        print(classification_report(y_test, y_pred, target_names=self.le.classes_))
        
        # Per-class accuracy
        print("\nPer-Class Accuracy:")
        cm = confusion_matrix(y_test, y_pred)
        class_acc = cm.diagonal() / cm.sum(axis=1)
        for i, disease in enumerate(self.le.classes_):
            print(f"  {disease:15s}: {class_acc[i]*100:6.2f}%")
            
        # Save
        print("\nSaving Models...")
        joblib.dump(self.model, self.models_dir / 'model.pkl')
        joblib.dump(self.scaler, self.models_dir / 'scaler.pkl')
        joblib.dump(self.le, self.models_dir / 'label_encoder.pkl')
        joblib.dump(self.features, self.models_dir / 'features.pkl')
        
        # Save info.json
        info = {
            'version': datetime.now().strftime("%Y%m%d_%H%M%S"),
            'features_count': len(self.features),
            'classes': list(self.le.classes_),
            'features_list': self.features
        }
        with open(self.models_dir / 'info.json', 'w') as f:
            json.dump(info, f, indent=4)
            
        print(f"\n✓ Model artifacts saved to: {self.models_dir}")
        print("\n🎉 PIPELINE COMPLETE!")
