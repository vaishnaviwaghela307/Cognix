"""
Prediction Routes
Defines ML prediction endpoints - Multiclass Only
"""

from flask import Blueprint
from controllers.prediction_controller import PredictionController

# Create blueprint
prediction_bp = Blueprint('prediction', __name__)

# Main prediction route (multiclass)
prediction_bp.route('/predict', methods=['POST'])(PredictionController.predict)
prediction_bp.route('/predict/multiclass', methods=['POST'])(PredictionController.predict_multiclass)

# Utility routes
prediction_bp.route('/features', methods=['GET'])(PredictionController.get_features)
prediction_bp.route('/test', methods=['GET'])(PredictionController.test_prediction)
