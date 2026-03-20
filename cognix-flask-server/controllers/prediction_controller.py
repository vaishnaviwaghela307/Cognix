"""
Prediction Controller
Handles HTTP requests for ML predictions
"""

from flask import jsonify, request, current_app
import logging
import numpy as np
from utils.xai_engine import XAIEngine

logger = logging.getLogger(__name__)


class PredictionController:
    """
    Prediction controller using multiclass model
    """
    
    @staticmethod
    def predict():
        """Main prediction endpoint"""
        try:
            from app import model, scaler, label_encoder, features, model_loaded
            
            if not model_loaded:
                return jsonify({
                    'success': False,
                    'error': 'Model not loaded'
                }), 500
            
            data = request.get_json()
            
            if not data or 'features' not in data:
                return jsonify({
                    'success': False,
                    'error': 'Missing features in request body'
                }), 400
            
            input_data = data['features']
            
            # Prepare features
            if features:
                feature_values = np.array([input_data.get(f, 0) for f in features])
            else:
                feature_values = np.array(list(input_data.values()))
            
            feature_values = feature_values.reshape(1, -1)
            
            # Scale and predict
            features_scaled = scaler.transform(feature_values)
            prediction = model.predict(features_scaled)[0]
            probabilities = model.predict_proba(features_scaled)[0]
            
            # Get disease name
            disease_name = label_encoder.inverse_transform([prediction])[0]
            confidence = float(max(probabilities))
            
            # Get all probabilities
            all_probs = {}
            for idx, disease in enumerate(label_encoder.classes_):
                all_probs[disease] = float(probabilities[idx])
            
            # --- EXPLAINABLE AI PIPELINE ---
            logger.info(f"🔍 Generating explanation for: {disease_name}")
            from config import get_config
            config = get_config()

            category_breakdown, top_features = XAIEngine.calculate_contributions(model, features, features_scaled)
            explanation = XAIEngine.generate_reasoning_trace(config.GROQ_API_KEY, disease_name, confidence, category_breakdown, top_features)
            
            result = {
                'predicted_disease': disease_name.upper(),
                'confidence': confidence,
                'all_predictions': all_probs,
                'explainability': {
                    'symptom_breakdown': category_breakdown,
                    'top_features': top_features,
                    'reasoning_trace': explanation
                }
            }
            
            return jsonify({
                'success': True,
                'prediction': result
            })
            
        except Exception as e:
            logger.error(f"Error in prediction: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @staticmethod
    def predict_multiclass():
        """Alias for main prediction method"""
        return PredictionController.predict()
    
    @staticmethod
    def get_features():
        """Get model information"""
        try:
            from app import model_loaded, features, label_encoder
            
            if not model_loaded:
                return jsonify({
                    'success': False,
                    'error': 'Model not loaded'
                }), 500
            
            return jsonify({
                'success': True,
                'features': features if features else [],
                'diseases': list(label_encoder.classes_) if label_encoder else []
            })
            
        except Exception as e:
            logger.error(f"Error getting features: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @staticmethod
    def test_prediction():
        """Test endpoint with sample data"""
        try:
            from app import model_loaded
            
            if not model_loaded:
                return jsonify({
                    'success': False,
                    'error': 'Model not loaded. Please run: python ml_pipeline_modules/run_pipeline.py'
                }), 500
            
            # Sample test data (50 features)
            sample_features = {
                'memory_loss_score': 0.75,
                'cognitive_decline_rate': 0.68,
                'motor_symptom_severity': 0.35,
                'visual_hallucination_freq': 0.12,
                'age': 72.5,
                'frontal_lobe_volume': 0.65,
                'temporal_lobe_volume': 0.58,
                'parietal_lobe_volume': 0.62,
                'occipital_lobe_volume': 0.55,
                'cerebellum_volume': 0.60,
                'brainstem_integrity': 0.58,
                'hippocampus_volume': 0.52,
                'amygdala_volume': 0.54,
                'ventricle_size_index': 0.45,
                'corpus_callosum_thickness': 0.48,
                'executive_function_score': 0.42,
                'language_processing_score': 0.55,
                'attention_span_score': 0.50,
                'processing_speed_score': 0.48,
                'reasoning_ability_score': 0.45,
                'orientation_score': 0.52,
                'problem_solving_score': 0.48,
                'decision_making_score': 0.50,
                'short_term_memory_score': 0.40,
                'long_term_memory_score': 0.45,
                'gait_speed': 0.55,
                'tremor_intensity': 0.30,
                'hand_movement_accuracy': 0.60,
                'coordination_index': 0.58,
                'muscle_rigidity_score': 0.35,
                'balance_stability_score': 0.55,
                'reaction_time': 0.50,
                'fine_motor_control': 0.58,
                'facial_expression_score': 0.52,
                'speech_fluidity_score': 0.55,
                'synaptic_density_index': 0.48,
                'neural_connectivity_strength': 0.50,
                'white_matter_integrity': 0.52,
                'gray_matter_density': 0.55,
                'glucose_metabolism_rate': 0.50,
                'oxygenation_level': 0.58,
                'cortical_thickness': 0.52,
                'neuronal_activity_rate': 0.55,
                'immune_inflammation_score': 0.65,
                'protein_aggregation_level': 0.70,
                'neuro_transmitter_level': 0.45,
                'brain_iron_concentration': 0.55,
                'neuroinflammation_index': 0.68,
                'oxidative_stress_score': 0.72,
                'vascular_health_index': 0.48
            }
            
            # Make prediction
            response = PredictionController.predict()
            response_data = response.get_json() if hasattr(response, 'get_json') else response[0].get_json()
            
            # Create test request
            from flask import Flask
            test_app = Flask(__name__)
            with test_app.test_request_context(json={'features': sample_features}):
                result = PredictionController.predict()
                return result
            
        except Exception as e:
            logger.error(f"Error in test prediction: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
