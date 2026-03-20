"""
Step 3: Exploratory Data Analysis
Comprehensive EDA with visualizations saved to output folder
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class EDA:
    """
    Exploratory Data Analysis module
    """
    
    def __init__(self, df):
        self.df = df
        self.output_dir = Path('ml_pipeline_outputs/eda')
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def run_full_eda(self):
        print("\n" + "="*70)
        print("STEP 3: EXPLORATORY DATA ANALYSIS")
        print("="*70)
        
        self.analyze_target_variable()
        self.check_missing_values()
        self.statistical_summary()
        self.analyze_key_features()
        self.correlation_analysis()
        self.outlier_detection()
        
    def analyze_target_variable(self):
        print("\n" + "="*70)
        print("TARGET VARIABLE ANALYSIS")
        print("="*70)

        disease_counts = self.df['disease'].value_counts()
        disease_pct = self.df['disease'].value_counts(normalize=True) * 100

        print("\nDisease Distribution:")
        for disease, count in disease_counts.items():
            pct = disease_pct[disease]
            print(f"  {disease:15s}: {count:4d} samples ({pct:5.2f}%)")

        # Check balance
        max_count = disease_counts.max()
        min_count = disease_counts.min()
        imbalance_ratio = max_count / min_count

        print(f"\nClass Balance Ratio: {imbalance_ratio:.2f}:1")
        if imbalance_ratio < 1.5:
            print("✓ Dataset is well balanced")
        elif imbalance_ratio < 3:
            print("⚠ Moderate class imbalance")
        else:
            print("❌ Significant class imbalance")
            
        # Visualization
        fig, axes = plt.subplots(1, 2, figsize=(16, 6))

        # Bar plot
        disease_counts.plot(kind='bar', ax=axes[0], color='steelblue', edgecolor='black')
        axes[0].set_title('Disease Distribution (Count)', fontsize=14, fontweight='bold')
        axes[0].set_xlabel('Disease', fontsize=12)
        axes[0].set_ylabel('Number of Samples', fontsize=12)
        axes[0].tick_params(axis='x', rotation=45)
        axes[0].grid(axis='y', alpha=0.3)
        for container in axes[0].containers:
            axes[0].bar_label(container, fmt='%d')

        # Pie chart
        colors = sns.color_palette('husl', len(disease_counts))
        axes[1].pie(disease_counts, labels=disease_counts.index, autopct='%1.1f%%', 
                    startangle=90, colors=colors, explode=[0.05]*len(disease_counts))
        axes[1].set_title('Disease Distribution (Percentage)', fontsize=14, fontweight='bold')

        plt.tight_layout()
        plt.savefig(self.output_dir / 'target_distribution.png', dpi=300)
        print(f"📊 Plot saved: {self.output_dir / 'target_distribution.png'}")
        plt.close()

    def check_missing_values(self):
        print("\n" + "="*70)
        print("MISSING VALUES ANALYSIS")
        print("="*70)

        missing_values = self.df.isnull().sum()
        missing_pct = (missing_values / len(self.df)) * 100

        if missing_values.sum() == 0:
            print("\n✓ No missing values found in the dataset!")
        else:
            missing_df = pd.DataFrame({
                'Column': missing_values.index,
                'Missing Count': missing_values.values,
                'Percentage': missing_pct.values
            })
            print(missing_df[missing_df['Missing Count'] > 0])

    def statistical_summary(self):
        print("\n" + "="*70)
        print("STATISTICAL SUMMARY")
        print("="*70)
        numeric_features = self.df.select_dtypes(include=[np.number]).columns.tolist()
        print(f"\nNumber of Numeric Features: {len(numeric_features)}")
        print(self.df[numeric_features].describe().T.head().to_string()) # Show header

    def analyze_key_features(self):
        key_features = [
            'age', 'memory_loss_score', 'cognitive_decline_rate',
            'motor_symptom_severity', 'visual_hallucination_freq',
            'hippocampus_volume'
        ]
        
        # Check if features exist
        existing_features = [f for f in key_features if f in self.df.columns]
        if not existing_features: return

        fig, axes = plt.subplots(2, 3, figsize=(18, 10))
        axes = axes.ravel()

        for idx, feature in enumerate(existing_features):
            if idx < len(axes):
                axes[idx].hist(self.df[feature], bins=30, color='steelblue', edgecolor='black', alpha=0.7)
                axes[idx].set_title(f'{feature}', fontsize=12, fontweight='bold')
                
                mean_val = self.df[feature].mean()
                median_val = self.df[feature].median()
                axes[idx].axvline(mean_val, color='red', linestyle='--', label=f'Mean: {mean_val:.2f}')
                axes[idx].axvline(median_val, color='green', linestyle='--', label=f'Median: {median_val:.2f}')
                axes[idx].legend(fontsize=8)

        plt.suptitle('Key Feature Distributions', fontsize=16, fontweight='bold', y=1.00)
        plt.tight_layout()
        plt.savefig(self.output_dir / 'key_feature_distributions.png', dpi=300)
        print(f"📊 Plot saved: {self.output_dir / 'key_feature_distributions.png'}")
        plt.close()

    def correlation_analysis(self):
        key_features = [
            'age', 'memory_loss_score', 'cognitive_decline_rate',
            'motor_symptom_severity', 'visual_hallucination_freq',
            'hippocampus_volume', 'frontal_lobe_volume', 
            'temporal_lobe_volume', 'executive_function_score', 
            'language_processing_score'
        ]
        features_to_corr = [f for f in key_features if f in self.df.columns]
        
        if len(features_to_corr) > 1:
            corr_matrix = self.df[features_to_corr].corr()

            plt.figure(figsize=(12, 10))
            sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm', center=0,
                        square=True, linewidths=1, cbar_kws={"shrink": 0.8})
            plt.title('Feature Correlation Heatmap', fontsize=14, fontweight='bold', pad=20)
            plt.tight_layout()
            plt.savefig(self.output_dir / 'correlation_heatmap.png', dpi=300)
            print(f"📊 Plot saved: {self.output_dir / 'correlation_heatmap.png'}")
            plt.close()
            
            # Print high correlations
            print("\nHighly Correlated Feature Pairs (|correlation| > 0.7):")
            found = False
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    if abs(corr_matrix.iloc[i, j]) > 0.7:
                        print(f"  {corr_matrix.columns[i]} <-> {corr_matrix.columns[j]}: {corr_matrix.iloc[i, j]:.3f}")
                        found = True
            if not found: print("  No highly correlated pairs found.")

    def outlier_detection(self):
        print("\n" + "="*70)
        print("OUTLIER DETECTION (IQR Method)")
        print("="*70)
        
        key_features = [
            'age', 'memory_loss_score', 'cognitive_decline_rate',
            'motor_symptom_severity', 'visual_hallucination_freq',
            'hippocampus_volume'
        ]
        
        existing_features = [f for f in key_features if f in self.df.columns]
        
        outlier_summary = []
        for feature in existing_features:
            Q1 = self.df[feature].quantile(0.25)
            Q3 = self.df[feature].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            outliers = self.df[(self.df[feature] < lower_bound) | (self.df[feature] > upper_bound)]
            outlier_summary.append({
                'Feature': feature,
                'Outliers': len(outliers),
                'Percentage': f"{(len(outliers)/len(self.df))*100:.2f}%"
            })
            
        print(pd.DataFrame(outlier_summary).to_string(index=False))
        
        # Box Plots
        fig, axes = plt.subplots(2, 3, figsize=(18, 10))
        axes = axes.ravel()
        for idx, feature in enumerate(existing_features):
            if idx < len(axes):
                self.df.boxplot(column=feature, by='disease', ax=axes[idx])
                axes[idx].set_title(f'{feature}')
                axes[idx].set_xlabel('Disease')
                axes[idx].tick_params(axis='x', rotation=45)
        
        plt.suptitle('Feature Box Plots by Disease', fontsize=16, fontweight='bold', y=1.00)
        plt.tight_layout()
        plt.savefig(self.output_dir / 'outlier_boxplots.png', dpi=300)
        print(f"📊 Plot saved: {self.output_dir / 'outlier_boxplots.png'}")
        plt.close()

if __name__ == "__main__":
    from step02_data_collection import DataCollection
    df = DataCollection().load_data()
    EDA(df).run_full_eda()
