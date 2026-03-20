"""
Step 9: Model Evaluation
Comparison and Visualization
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix
from pathlib import Path

class ModelEvaluator:
    """
    Evaluate trained models
    """
    
    def __init__(self, results, label_encoder):
        self.results = results
        self.le = label_encoder
        self.output_dir = Path('ml_pipeline_outputs/evaluation')
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def evaluate(self, y_test):
        print("\n" + "="*70)
        print("STEP 9: MODEL PERFORMANCE COMPARISON")
        print("="*70)
        
        comparison_df = pd.DataFrame({
            'Model': list(self.results.keys()),
            'Accuracy': [self.results[m]['accuracy'] for m in self.results],
            'Precision': [self.results[m]['precision'] for m in self.results],
            'Recall': [self.results[m]['recall'] for m in self.results],
            'F1-Score': [self.results[m]['f1_score'] for m in self.results],
            'CV Mean': [self.results[m]['cv_mean'] for m in self.results],
            'CV Std': [self.results[m]['cv_std'] for m in self.results]
        }).sort_values('Accuracy', ascending=False)
        
        print("\n", comparison_df.to_string(index=False))
        
        best_model_name = comparison_df.iloc[0]['Model']
        print(f"\n🏆 Best Model: {best_model_name}")
        print(f"   Accuracy: {comparison_df.iloc[0]['Accuracy']:.4f}")
        
        self.visualize_comparison(comparison_df)
        self.detailed_evaluation(best_model_name, y_test)
        
        return best_model_name
        
    def visualize_comparison(self, df):
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
        colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12']
        
        for idx, (metric, color) in enumerate(zip(metrics, colors)):
            ax = axes[idx // 2, idx % 2]
            df.plot(x='Model', y=metric, kind='bar', ax=ax, color=color, legend=False)
            ax.set_title(f'{metric} Comparison', fontsize=12)
            ax.set_ylim([0.8, 1.0])
            ax.tick_params(axis='x', rotation=45)
            
            for container in ax.containers:
                ax.bar_label(container, fmt='%.3f', fontsize=9)
                
        plt.suptitle('Model Performance Metrics Comparison', fontsize=16, fontweight='bold', y=1.00)
        plt.tight_layout()
        plt.savefig(self.output_dir / 'model_comparison.png', dpi=300)
        print(f"📊 Comparison plots saved: {self.output_dir / 'model_comparison.png'}")
        plt.close()
        
    def detailed_evaluation(self, best_model_name, y_test):
        best_predictions = self.results[best_model_name]['predictions']
        
        print(f"\n{'='*70}")
        print(f"DETAILED EVALUATION: {best_model_name}")
        print(f"{'='*70}")
        print("\nClassification Report:")
        print(classification_report(y_test, best_predictions, target_names=self.le.classes_))
        
        # Confusion Matrix
        cm = confusion_matrix(y_test, best_predictions)
        
        fig, axes = plt.subplots(1, 2, figsize=(18, 8))
        
        # Raw
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[0],
                    xticklabels=self.le.classes_, yticklabels=self.le.classes_)
        axes[0].set_title(f'Confusion Matrix (Raw) - {best_model_name}')
        
        # Normalized
        cm_norm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        sns.heatmap(cm_norm, annot=True, fmt='.2%', cmap='Greens', ax=axes[1],
                    xticklabels=self.le.classes_, yticklabels=self.le.classes_)
        axes[1].set_title(f'Confusion Matrix (Normalized) - {best_model_name}')
        
        plt.tight_layout()
        plt.savefig(self.output_dir / 'confusion_matrix.png', dpi=300)
        print(f"📊 Confusion Matrix saved: {self.output_dir / 'confusion_matrix.png'}")
        plt.close()
