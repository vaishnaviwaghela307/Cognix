"""
Step 1: Problem Definition
Setup environment and define the classification problem
"""

import logging
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings

# Configure warnings and style
warnings.filterwarnings('ignore')
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

logger = logging.getLogger(__name__)

class ProblemDefinition:
    """
    Define the ML Problem and Setup Environment
    """
    
    @staticmethod
    def print_problem_definition():
        print("\n" + "="*70)
        print("STEP 1: PROBLEM DEFINITION (ENVIRONMENT SETUP)")
        print("="*70)
        print("✓ All libraries imported successfully!")
        print(f"Python version: {pd.__version__}")
        print(f"NumPy version: {np.__version__}")
        print("\nObjective: Classify neurodegenerative diseases based on clinical features.")
        return ['Alzheimers', 'Parkinsons', 'FTD', 'LBD', 'Vascular', 'MCI']

if __name__ == "__main__":
    ProblemDefinition.print_problem_definition()
