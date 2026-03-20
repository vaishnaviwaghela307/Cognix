"""
Model Management Routes
Simple endpoints for model info
"""

from flask import Blueprint, jsonify
import logging
import joblib
from pathlib import Path

logger = logging.getLogger(__name__)

# Create blueprint
model_bp = Blueprint('model', __name__, url_prefix='/model')


@model_bp.route('/info', methods=['GET'])
def get_info():
    """Get model information"""
    try:
        from app import model_loaded, features, label_encoder
        
        if not model_loaded:
            return jsonify({
                'success': False,
                'error': 'Model not loaded'
            }), 500
        
        # Load model info
        models_dir = Path('models/multiclass')
        info_path = models_dir / 'info.json'
        
        if info_path.exists():
            import json
            with open(info_path, 'r') as f:
                info = json.load(f)
        else:
            info = {}
        
        return jsonify({
            'success': True,
            'model_loaded': True,
            'features_count': len(features) if features else 0,
            'classes': list(label_encoder.classes_) if label_encoder else [],
            **info
        })
        
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@model_bp.route('/reload', methods=['POST'])
def reload_model():
    """Reload models from disk"""
    try:
        from app import load_models
        
        logger.info("🔄 Model reload triggered via API")
        success = load_models()
        
        return jsonify({
            'success': success,
            'message': 'Models reloaded successfully' if success else 'Failed to reload models'
        })
        
    except Exception as e:
        logger.error(f"Error reloading models: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
