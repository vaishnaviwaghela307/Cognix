"""
Flask Server for Cognitive Disease Prediction
Modular architecture with proper separation of concerns
"""

from flask import Flask, jsonify
from flask_cors import CORS
import logging
import sys
import os
from pathlib import Path
import joblib
import numpy as np

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import get_config
from routes.prediction_routes import prediction_bp
from routes.model_routes import model_bp
from routes.clinical_routes import clinical_bp
from routes.ocr_routes import ocr_bp
from utils.cron_service import initialize_cron_jobs
from routes.speech_routes import speech_bp
from routes.caregiver_routes import caregiver_bp

# Initialize Flask app
app = Flask(__name__)

# Load configuration
config = get_config()
app.config.from_object(config)

# Enable CORS
CORS(app)

# Setup logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global model variables
model = None
scaler = None
label_encoder = None
features = None
model_loaded = False


# ==================== LOAD MODELS ====================

def load_models():
    """Load ML models from disk"""
    global model, scaler, label_encoder, features, model_loaded
    
    try:
        models_dir = config.MODELS_DIR
        
        if not models_dir.exists():
            logger.warning(f"Models directory not found: {models_dir}")
            return False
        
        model_path = models_dir / 'model.pkl'
        scaler_path = models_dir / 'scaler.pkl'
        encoder_path = models_dir / 'label_encoder.pkl'
        features_path = models_dir / 'features.pkl'
        
        if not all(p.exists() for p in [model_path, scaler_path, encoder_path]):
            logger.warning("Model files not found!")
            return False
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        label_encoder = joblib.load(encoder_path)
        
        if features_path.exists():
            features = joblib.load(features_path)
        
        model_loaded = True
        logger.info("✅ Models loaded successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        return False


# Load models on startup
with app.app_context():
    load_models()


# ==================== ROUTES ====================

@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'message': 'Cognix ML Pipeline API',
        'version': '3.0.0',
        'model_loaded': model_loaded,
        'endpoints': {
            'health': '/health',
            'predict': '/predict',
            'test': '/test',
            'clinical_analyze': '/clinical/analyze',
            'clinical_predict': '/clinical/predict',
            'ocr_extract': '/ocr/extract',
            'ocr_predict': '/ocr/extract-and-predict'
        }
    })


@app.route('/health', methods=['GET'])
def health():
    """Detailed health check"""
    return jsonify({
        'status': 'healthy' if model_loaded else 'degraded',
        'model_loaded': model_loaded,
        'config': {
            'environment': app.config.get('ENV', 'development'),
            'debug': app.config.get('DEBUG', False)
        }
    })


# Register blueprints
app.register_blueprint(prediction_bp)
app.register_blueprint(model_bp)
app.register_blueprint(clinical_bp)
app.register_blueprint(ocr_bp)

# Import and register test routes
from routes.test_routes import test_bp
app.register_blueprint(test_bp)
app.register_blueprint(speech_bp)
app.register_blueprint(caregiver_bp)


# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'message': str(error)
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}")
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': str(error)
    }), 500


@app.errorhandler(Exception)
def handle_exception(error):
    """Handle all unhandled exceptions"""
    logger.error(f"Unhandled exception: {error}", exc_info=True)
    return jsonify({
        'success': False,
        'error': 'An unexpected error occurred',
        'message': str(error)
    }), 500


# ==================== MAIN ====================

if __name__ == '__main__':
    logger.info('\n' + '='*60)
    logger.info('🚀 Starting Cognix ML Prediction Service')
    logger.info('='*60)
    logger.info(f'📍 Environment: {app.config.get("ENV", "development")}')
    logger.info(f'📁 Models directory: {config.MODELS_DIR}')
    logger.info(f'🌐 Server: http://{config.HOST}:{config.PORT}')
    logger.info('='*60 + '\n')
    
    # Initialize cron jobs for health checks
    # if os.getenv('ENABLE_CRON', 'false').lower() == 'true':
    #     initialize_cron_jobs()

    
    # Run the Flask app
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )
