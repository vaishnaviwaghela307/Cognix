"""
Complete ML Pipeline Runner
Executes all 11 steps sequentially
"""

import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ml_pipeline_modules.step01_problem_definition import ProblemDefinition
from ml_pipeline_modules.step02_data_collection import DataCollection
from ml_pipeline_modules.step03_eda import EDA
from ml_pipeline_modules.step04_preprocessing import DataPreprocessing
from ml_pipeline_modules.step05_feature_engineering import FeatureEngineering
from ml_pipeline_modules.step06_data_split import DataSplitter
from ml_pipeline_modules.step07_model_selection import ModelSelection
from ml_pipeline_modules.step08_model_training import ModelTrainer
from ml_pipeline_modules.step09_model_evaluation import ModelEvaluator
from ml_pipeline_modules.step10_hyperparameter_tuning import HyperparameterTuner
from ml_pipeline_modules.step11_model_validation import finalValidator

def run_pipeline():
    try:
        # Step 1
        ProblemDefinition.print_problem_definition()
        
        # Step 2
        df = DataCollection().load_data()
        
        # Step 3
        EDA(df).run_full_eda()
        
        # Step 4
        df_clean = DataPreprocessing(df).run_preprocessing()
        
        # Step 5
        fe_results = FeatureEngineering(df_clean).run_feature_engineering()
        df_final = fe_results['df']
        selected_features = fe_results['selected_features']
        
        # Step 6
        X_train, X_test, y_train, y_test, scaler, le, X_train_s, X_test_s = DataSplitter(df_final).split_data()
        
        # Step 7
        models = ModelSelection.get_models()
        
        # Step 8
        trainer = ModelTrainer(models)
        results = trainer.train_models(X_train_s, y_train, X_test_s, y_test)
        
        # Step 9
        evaluator = ModelEvaluator(results, le)
        best_model_name = evaluator.evaluate(y_test)
        best_model_obj = results[best_model_name]['model']
        
        # Step 10
        tuner = HyperparameterTuner(best_model_name, best_model_obj)
        final_model = tuner.tune(X_train_s, y_train, X_test_s, y_test)
        
        # Step 11
        validator = finalValidator(final_model, scaler, le, selected_features)
        validator.validate_and_save(X_test_s, y_test)
        
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_pipeline()
