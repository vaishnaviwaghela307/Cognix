"""
Step 10: Hyperparameter Tuning
GridSearchCV
"""

from sklearn.model_selection import GridSearchCV
from sklearn.metrics import accuracy_score

class HyperparameterTuner:
    """
    Tune best model
    """
    
    def __init__(self, best_model_name, best_model_obj):
        self.model_name = best_model_name
        self.model = best_model_obj
        
    def tune(self, X_train, y_train, X_test, y_test):
        print("\n" + "="*70)
        print("STEP 10: HYPERPARAMETER TUNING")
        print("="*70)
        
        # Define grid based on model
        param_grid = {}
        if 'LightGBM' in self.model_name:
            param_grid = {
                'n_estimators': [100, 150, 200],
                'max_depth': [5, 7, 10],
                'learning_rate': [0.01, 0.05, 0.1]
            }
        elif 'XGBoost' in self.model_name:
            param_grid = {
                'n_estimators': [100, 150, 200],
                'max_depth': [3, 5, 7],
                'learning_rate': [0.01, 0.05, 0.1]
            }
        else: # RF or GBM
            param_grid = {
                'n_estimators': [100, 150, 200],
                'max_depth': [10, 15, 20],
                'min_samples_split': [2, 5, 10]
            }
            
        print(f"\nTuning {self.model_name}...")
        print(f"Parameter grid: {param_grid}")
        
        grid_search = GridSearchCV(
            self.model, param_grid, cv=3, scoring='accuracy', n_jobs=-1, verbose=1
        )
        grid_search.fit(X_train, y_train)
        
        print(f"\n✓ Hyperparameter tuning complete!")
        print(f"Best Parameters: {grid_search.best_params_}")
        
        tuned_model = grid_search.best_estimator_
        y_pred = tuned_model.predict(X_test)
        acc_tuned = accuracy_score(y_test, y_pred)
        
        print(f"Tuned Accuracy: {acc_tuned:.4f}")
        
        return tuned_model
