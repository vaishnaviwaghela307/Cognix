"""
Clinical Assessment Routes
Defines endpoints for clinical screening flow
"""

from flask import Blueprint
from controllers.clinical_controller import ClinicalController

# Create blueprint
clinical_bp = Blueprint('clinical', __name__, url_prefix='/clinical')

# Text analysis endpoint
clinical_bp.route('/analyze', methods=['POST'])(ClinicalController.analyze_answers)

# Clinical prediction endpoint
clinical_bp.route('/predict', methods=['POST'])(ClinicalController.predict_clinical)

# Dynamic question generation endpoint
clinical_bp.route('/generate-questions', methods=['POST'])(ClinicalController.generate_questions)
