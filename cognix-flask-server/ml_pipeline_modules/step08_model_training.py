"""
Step 8: Model Training
Train loop with metrics and CV
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

class ModelTrainer:
    """
    Train and evaluate models
    """
    
    def __init__(self, models):
        self.models = models
        self.results = {}
        
    def train_models(self, X_train_scaled, y_train, X_test_scaled, y_test):
        print("\n" + "="*70)
        print("STEP 8: MODEL TRAINING")
        print("="*70)
        
        for name, model in self.models.items():
            print(f"\nTraining: {name}")
            
            # Train
            model.fit(X_train_scaled, y_train)
            
            # Predict
            y_pred = model.predict(X_test_scaled)
            y_pred_proba = model.predict_proba(X_test_scaled)
            
            # Metrics
            accuracy = accuracy_score(y_test, y_pred)
            precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
            
            # Cross-Validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='accuracy')
            
            self.results[name] = {
                'model': model,
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std(),
                'predictions': y_pred,
                'probabilities': y_pred_proba
            }
            
            print(f"✓ Training complete!")
            print(f"  Accuracy:  {accuracy:.4f}")
            print(f"  F1-Score:  {f1:.4f}")
            print(f"  CV Score:  {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
            
        return self.results
