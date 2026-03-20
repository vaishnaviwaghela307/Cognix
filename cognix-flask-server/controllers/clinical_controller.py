"""
Clinical Assessment Controller
Handles clinical screening with 4-domain scoring system + Dynamic Question Generation
"""

from flask import jsonify, request
import logging
import numpy as np
import re
import json
from groq import Groq
from controllers.question_generator import QuestionGenerator
from utils.xai_engine import XAIEngine

logger = logging.getLogger(__name__)


class ClinicalController:
    """
    Controller for clinical assessment flow:
    1. User answers 4 sub-questions per domain (text)
    2. Convert text answers to severity score (0-10)
    3. Map 4 domain scores to 31 ML features
    4. Predict disease using existing ML model
    """
    
    # ==================== TEXT ANALYSIS ====================
    
    @staticmethod
    def analyze_text_severity(answers, domain_type):
        """
        Analyze text answers and return severity score (0-10)
        
        Args:
            answers: List of 4 text answers
            domain_type: 'demographic', 'cognitive', 'motoric', 'neuropsychiatric'
        
        Returns:
            float: Severity score (0-10)
        """
        
        # Expanded severity keywords (higher score = more severe)
        severity_keywords = {
            'high': [
                'always', 'constantly', 'severe', 'very', 'extremely', 'frequently', 'daily', 'multiple times',
                'continuous', 'persistent', 'chronic', 'intense', 'terrible', 'awful', 'unbearable',
                'overwhelming', 'significant', 'major', 'serious', 'critical', 'acute', 'profound',
                'substantial', 'considerable', 'extensive', 'complete', 'total', 'absolute'
            ],
            'medium': [
                'sometimes', 'occasionally', 'moderate', 'often', 'regularly', 'weekly', 'periodic',
                'intermittent', 'recurring', 'repeated', 'usual', 'common', 'typical', 'normal',
                'average', 'fair', 'reasonable', 'noticeable', 'apparent', 'evident', 'visible'
            ],
            'low': [
                'rarely', 'seldom', 'mild', 'slight', 'infrequent', 'monthly', 'minimal', 'minor',
                'little', 'small', 'limited', 'negligible', 'trivial', 'marginal', 'barely',
                'hardly', 'scarcely', 'few', 'bit', 'somewhat', 'slightly', 'faint'
            ],
            'none': [
                'never', 'no', 'none', 'not at all', 'absent', 'nothing', 'zero', 'nil',
                'negative', 'nope', 'nah', 'not really', 'not much', 'not applicable', 'n/a'
            ]
        }
        
        # Expanded positive indicators (presence of symptoms)
        positive_indicators = {
            'general': [
                'yes', 'yeah', 'yep', 'sure', 'definitely', 'absolutely', 'certainly', 'indeed',
                'problem', 'issue', 'difficulty', 'trouble', 'struggle', 'challenge', 'concern',
                'worry', 'afraid', 'scared', 'anxious', 'nervous', 'stressed', 'frustrated'
            ],
            'cognitive': [
                'forget', 'forgetful', 'memory', 'confused', 'confusion', 'disoriented', 'lost',
                'difficult', 'hard', 'cant remember', 'dont recall', 'blank', 'fuzzy', 'unclear',
                'mix up', 'mixed up', 'wrong', 'mistake', 'error', 'misplace', 'misplaced',
                'concentration', 'focus', 'attention', 'distracted', 'thinking', 'understand',
                'comprehend', 'process', 'learn', 'learning', 'slow', 'slower', 'delayed'
            ],
            'motoric': [
                'shaking', 'shake', 'tremor', 'trembling', 'tremble', 'stiff', 'stiffness',
                'rigid', 'rigidity', 'slow', 'slower', 'slowness', 'balance', 'unbalanced',
                'fall', 'falling', 'fell', 'stumble', 'trip', 'clumsy', 'awkward', 'unsteady',
                'weak', 'weakness', 'tired', 'fatigue', 'exhausted', 'coordination', 'movement',
                'walk', 'walking', 'gait', 'shuffle', 'drag', 'limp', 'freeze', 'stuck'
            ],
            'neuropsychiatric': [
                'hallucination', 'hallucinate', 'see things', 'seeing things', 'visions',
                'hear voices', 'hearing voices', 'sounds', 'noises', 'voices', 'talking',
                'dream', 'dreams', 'nightmare', 'nightmares', 'sleep', 'sleeping', 'insomnia',
                'restless', 'acting out', 'movement', 'talking', 'shouting', 'screaming',
                'alert', 'alertness', 'awareness', 'conscious', 'consciousness', 'awake',
                'drowsy', 'sleepy', 'foggy', 'hazy', 'dazed', 'confused', 'disoriented'
            ]
        }
        
        scores = []
        
        for answer in answers:
            if not answer or not isinstance(answer, str):
                scores.append(0)
                continue
                
            answer_lower = answer.lower().strip()
            
            # Skip very short answers
            if len(answer_lower) < 2:
                scores.append(0)
                continue
            
            score = 0
            
            # Check for severity keywords
            if any(kw in answer_lower for kw in severity_keywords['high']):
                score += 8
            elif any(kw in answer_lower for kw in severity_keywords['medium']):
                score += 5
            elif any(kw in answer_lower for kw in severity_keywords['low']):
                score += 2
            elif any(kw in answer_lower for kw in severity_keywords['none']):
                score = 0
            
            # Check for positive symptom indicators (domain-specific)
            all_indicators = positive_indicators['general']
            if domain_type in positive_indicators:
                all_indicators += positive_indicators[domain_type]
            
            positive_count = sum(1 for indicator in all_indicators if indicator in answer_lower)
            score += min(positive_count * 1.5, 4)  # Cap at +4
            
            # Length-based adjustment (longer answers often indicate more concern)
            if len(answer_lower) > 50:
                score += 1
            elif len(answer_lower) > 100:
                score += 2
            
            # Cap at 10
            scores.append(min(score, 10))
        
        # Average the 4 sub-question scores
        avg_score = np.mean(scores) if scores else 0
        
        # Domain-specific adjustments
        if domain_type == 'demographic':
            # Demographics are less about severity, more about confusion
            avg_score = min(avg_score * 0.7, 10)
        
        return round(float(avg_score), 2)
    
    
    # ==================== FEATURE MAPPING ====================
    
    @staticmethod
    def map_domains_to_features(demographic_score, cognitive_score, motoric_score, neuropsychiatric_score):
        """
        Map 4 domain scores to 31 ML model features
        
        Args:
            demographic_score: 0-10
            cognitive_score: 0-10
            motoric_score: 0-10
            neuropsychiatric_score: 0-10
        
        Returns:
            dict: 31 features for ML model
        """
        
        # Normalize scores to 0-1 range
        demo_norm = demographic_score / 10.0
        cog_norm = cognitive_score / 10.0
        motor_norm = motoric_score / 10.0
        neuro_norm = neuropsychiatric_score / 10.0
        
        # Map to 31 features (based on info.json)
        features = {
            # Direct mappings from neuropsychiatric domain
            'visual_hallucination_freq': neuro_norm * 0.8,  # Primary neuro symptom
            
            # Motor symptoms
            'motor_symptom_severity': motor_norm,
            'gait_speed': 1.0 - motor_norm,  # Inverse relationship
            'fine_motor_control': 1.0 - motor_norm,
            'hand_movement_accuracy': 1.0 - motor_norm,
            'balance_stability_score': 1.0 - motor_norm,
            'reaction_time': motor_norm * 0.7,
            'facial_expression_score': 1.0 - (motor_norm * 0.5),
            
            # Cognitive symptoms
            'cognitive_decline_rate': cog_norm,
            'memory_loss_score': cog_norm * 0.9,
            'short_term_memory_score': 1.0 - cog_norm,
            'attention_span_score': 1.0 - (cog_norm * 0.8),
            'problem_solving_score': 1.0 - cog_norm,
            'decision_making_score': 1.0 - (cog_norm * 0.85),
            
            # Age from demographic (estimate based on confusion level)
            'age': 50 + (demo_norm * 30),  # Range: 50-80 years
            
            # Brain structure (estimated from cognitive + motor decline)
            'cortical_thickness': 1.0 - ((cog_norm + motor_norm) / 2) * 0.6,
            'ventricle_size_index': ((cog_norm + motor_norm) / 2) * 0.5,
            'white_matter_integrity': 1.0 - (cog_norm * 0.6),
            'brainstem_integrity': 1.0 - (motor_norm * 0.5),
            'corpus_callosum_thickness': 1.0 - (cog_norm * 0.4),
            'parietal_lobe_volume': 1.0 - (cog_norm * 0.5),
            'temporal_lobe_volume': 1.0 - (cog_norm * 0.6),
            
            # Neurological markers
            'synaptic_density_index': 1.0 - ((cog_norm + neuro_norm) / 2) * 0.7,
            'glucose_metabolism_rate': 1.0 - (cog_norm * 0.5),
            'neuro_transmitter_level': 1.0 - ((cog_norm + motor_norm + neuro_norm) / 3) * 0.6,
            'neuronal_activity_rate': 1.0 - (cog_norm * 0.5),
            'oxygenation_level': 1.0 - ((cog_norm + motor_norm) / 2) * 0.3,
            
            # Pathological markers
            'brain_iron_concentration': ((motor_norm + neuro_norm) / 2) * 0.6,
            'neuroinflammation_index': ((cog_norm + motor_norm + neuro_norm) / 3) * 0.7,
            'protein_aggregation_level': ((cog_norm + motor_norm) / 2) * 0.8,
            'neural_connectivity_strength': 1.0 - ((cog_norm + neuro_norm) / 2) * 0.6
        }
        
        return features
    
    
    # ==================== API ENDPOINTS ====================
    
    @staticmethod
    def analyze_answers():
        """
        Endpoint: POST /clinical/analyze
        Analyzes text answers and returns severity scores
        
        Request body:
        {
            "domain": "cognitive",
            "answers": ["answer1", "answer2", "answer3", "answer4"]
        }
        
        Response:
        {
            "success": true,
            "severity_score": 7.5
        }
        """
        try:
            data = request.get_json()
            
            if not data or 'domain' not in data or 'answers' not in data:
                return jsonify({
                    'success': False,
                    'error': 'Missing domain or answers in request'
                }), 400
            
            domain = data['domain']
            answers = data['answers']
            
            if not isinstance(answers, list) or len(answers) != 4:
                return jsonify({
                    'success': False,
                    'error': 'Answers must be a list of 4 text responses'
                }), 400
            
            # Analyze and get severity score
            severity_score = ClinicalController.analyze_text_severity(answers, domain)
            
            return jsonify({
                'success': True,
                'domain': domain,
                'severity_score': severity_score,
                'answers_analyzed': len(answers)
            })
            
        except Exception as e:
            logger.error(f"Error analyzing answers: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    
    @staticmethod
    def predict_clinical():
        """
        Endpoint: POST /clinical/predict
        Main clinical prediction using 4 domain scores
        
        Request body:
        {
            "demographic_score": 3.5,
            "cognitive_score": 7.2,
            "motoric_score": 4.8,
            "neuropsychiatric_score": 6.1,
            "user_answers": {
                "demographic": ["ans1", "ans2", "ans3", "ans4"],
                "cognitive": ["ans1", "ans2", "ans3", "ans4"],
                "motoric": ["ans1", "ans2", "ans3", "ans4"],
                "neuropsychiatric": ["ans1", "ans2", "ans3", "ans4"]
            }
        }
        
        Response:
        {
            "success": true,
            "prediction": {
                "predicted_disease": "PARKINSONS",
                "confidence": 0.81,
                "probabilities": {...}
            }
        }
        """
        try:
            from app import model, scaler, label_encoder, model_loaded
            
            if not model_loaded:
                return jsonify({
                    'success': False,
                    'error': 'ML model not loaded'
                }), 500
            
            data = request.get_json()
            
            # Validate input
            required_fields = ['demographic_score', 'cognitive_score', 'motoric_score', 'neuropsychiatric_score']
            if not all(field in data for field in required_fields):
                return jsonify({
                    'success': False,
                    'error': f'Missing required fields: {required_fields}'
                }), 400
            
            # Extract scores
            demo_score = float(data['demographic_score'])
            cog_score = float(data['cognitive_score'])
            motor_score = float(data['motoric_score'])
            neuro_score = float(data['neuropsychiatric_score'])
            
            caregiver_signals = data.get('caregiver_signals')
            
            # Integrate caregiver data if available
            if caregiver_signals:
                from controllers.caregiver_controller import CaregiverController
                domain_scores = {
                    'demographic': demo_score,
                    'cognitive': cog_score,
                    'motoric': motor_score,
                    'neuropsychiatric': neuro_score
                }
                adjusted_scores = CaregiverController.integrate_caregiver_data(domain_scores, caregiver_signals)
                demo_score = adjusted_scores['demographic']
                cog_score = adjusted_scores['cognitive']
                motor_score = adjusted_scores['motoric']
                neuro_score = adjusted_scores['neuropsychiatric']
                logger.info("Caregiver signals integrated into diagnosis scores")

            # Validate score ranges
            scores = [demo_score, cog_score, motor_score, neuro_score]
            if any(s < 0 or s > 10 for s in scores):
                return jsonify({
                    'success': False,
                    'error': 'All scores must be between 0 and 10'
                }), 400
            
            # Map to 31 features
            features_dict = ClinicalController.map_domains_to_features(
                demo_score, cog_score, motor_score, neuro_score
            )
            
            # Prepare feature array in correct order
            feature_order = [
                'visual_hallucination_freq', 'motor_symptom_severity', 'cognitive_decline_rate',
                'memory_loss_score', 'age', 'attention_span_score', 'cortical_thickness',
                'gait_speed', 'short_term_memory_score', 'reaction_time', 'problem_solving_score',
                'ventricle_size_index', 'white_matter_integrity', 'fine_motor_control',
                'brainstem_integrity', 'corpus_callosum_thickness', 'hand_movement_accuracy',
                'brain_iron_concentration', 'facial_expression_score', 'decision_making_score',
                'parietal_lobe_volume', 'synaptic_density_index', 'glucose_metabolism_rate',
                'neuro_transmitter_level', 'neuronal_activity_rate', 'balance_stability_score',
                'neuroinflammation_index', 'temporal_lobe_volume', 'oxygenation_level',
                'protein_aggregation_level', 'neural_connectivity_strength'
            ]
            
            feature_values = np.array([features_dict[f] for f in feature_order]).reshape(1, -1)
            
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
                all_probs[disease] = round(float(probabilities[idx]), 4)
            
            # --- EXPLAINABLE AI PIPELINE ---
            logger.info(f"🔍 Generating clinical explanation for: {disease_name}")
            from config import get_config
            config = get_config()
            
            # Note: Clinical controller uses 'feature_order' list
            category_breakdown, top_features = XAIEngine.calculate_contributions(model, feature_order, features_scaled)
            explanation = XAIEngine.generate_reasoning_trace(config.GROQ_API_KEY, disease_name, confidence, category_breakdown, top_features)
            
            result = {
                'predicted_disease': disease_name,
                'confidence': round(confidence, 4),
                'probabilities': all_probs,
                'domain_scores': {
                    'demographic': demo_score,
                    'cognitive': cog_score,
                    'motoric': motor_score,
                    'neuropsychiatric': neuro_score
                },
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
            logger.error(f"Error in clinical prediction: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    
    @staticmethod
    def generate_questions():
        """
        Endpoint: POST /clinical/generate-questions
        Generate dynamic questions using GROQ AI
        
        Request body:
        {
            "domain": "cognitive"  // optional
        }
        
        Response:
        {
            "success": true,
            "questions": {
                "demographic": ["q1", "q2", "q3", "q4"],
                "cognitive": ["q1", "q2", "q3", "q4"],
                "motoric": ["q1", "q2", "q3", "q4"],
                "neuropsychiatric": ["q1", "q2", "q3", "q4"]
            }
        }
        """
        try:
            from config import get_config
            config = get_config()
            
            data = request.get_json() or {}
            specific_domain = data.get('domain')
            
            # Generate questions using GROQ
            questions_result = QuestionGenerator.generate_questions(
                api_key=config.GROQ_API_KEY,
                specific_domain=specific_domain
            )
            
            return jsonify({
                'success': True,
                'questions': questions_result,
                'generated_by': 'GROQ AI (Llama 3.3 70B)'
            })
            
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
