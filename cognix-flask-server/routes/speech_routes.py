"""
Speech & Language Assessment Routes
Uses GROQ for question generation and speech analysis
"""

from flask import Blueprint, request, jsonify, send_file
import logging
from groq import Groq
import os
import json
from config import get_config
import numpy as np
import time
from utils.pdf_generator import generate_speech_report
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

speech_bp = Blueprint('speech', __name__, url_prefix='/speech')

# Initialize GROQ client
config = get_config()
GROQ_API_KEY = config.GROQ_API_KEY
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


@speech_bp.route('/generate-questions', methods=['POST'])
def generate_questions():
    """
    Generate cognitive assessment questions using GROQ
    Returns 5+ questions for speech analysis
    """
    try:
        if not groq_client:
            return jsonify({
                'success': False,
                'error': 'GROQ API not configured'
            }), 500

        logger.info("🎤 Generating speech assessment questions...")

        # Generate questions using GROQ
        prompt = """Generate 5 cognitive assessment questions for detecting early signs of dementia and Alzheimer's disease through speech analysis.

Each question should test different cognitive abilities:
1. Memory recall
2. Language fluency
3. Attention and concentration
4. Executive function
5. Semantic knowledge

Return ONLY a JSON array with this exact structure:
[
  {
    "id": "q1",
    "question": "Can you describe what you did yesterday from morning to evening?",
    "type": "memory_recall",
    "instruction": "Take your time and describe in detail",
    "expectedDuration": 60
  },
  ...
]

Make questions natural and conversational. Focus on open-ended questions that require detailed responses."""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a neuropsychologist specializing in cognitive assessments. Generate questions that can detect speech patterns indicative of cognitive decline."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1500
        )

        questions_text = response.choices[0].message.content.strip()
        
        # Extract JSON from response
        if '```json' in questions_text:
            questions_text = questions_text.split('```json')[1].split('```')[0].strip()
        elif '```' in questions_text:
            questions_text = questions_text.split('```')[1].split('```')[0].strip()
        
        questions = json.loads(questions_text)
        
        logger.info(f"✅ Generated {len(questions)} questions")

        return jsonify({
            'success': True,
            'questions': questions,
            'count': len(questions)
        })

    except Exception as e:
        logger.error(f"❌ Error generating questions: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@speech_bp.route('/analyze', methods=['POST'])
def analyze_speech():
    """
    Analyze speech using Hybrid Approach:
    1. Transcribe Audio (if uploaded) using Groq Whisper
    2. GROQ extracts cognitive scores from transcript
    3. ML Model predicts disease based on these scores
    4. GROQ generates explanation
    5. Generate PDF Report
    """
    try:
        if not groq_client:
            return jsonify({'success': False, 'error': 'GROQ API not configured'}), 500

        # Handle Multipart Request (Audio Files)
        responses = []
        if request.content_type and 'multipart/form-data' in request.content_type:
            try:
                # responses_json should be passed as a field
                responses_data = request.form.get('responses')
                if responses_data:
                    responses = json.loads(responses_data)
                
                # Transcribe Audio Files
                for i, response in enumerate(responses):
                    audio_key = f'audio_{i}'
                    if audio_key in request.files:
                        audio_file = request.files[audio_key]
                        
                        # Transcribe via Groq
                        try:
                            # Groq Python SDK 'file' param expects (filename, file_content)
                            audio_file.filename = "audio.m4a" # Force filename
                            
                            transcription = groq_client.audio.transcriptions.create(
                                file=(audio_file.filename, audio_file.read()),
                                model="whisper-large-v3",
                                prompt="Medical cognitive assessment response"
                            )
                            response['transcript'] = transcription.text
                            logger.info(f"🎤 Transcribed {audio_key}: {transcription.text[:50]}...")
                        except Exception as t_err:
                            logger.error(f"⚠️ Transcription failed for {audio_key}: {t_err}")
                            response['transcript'] = response.get('transcript', "(Unintelligible speech)")
            
            except Exception as e:
                 logger.error(f"❌ Error parsing multipart data: {e}")
                 return jsonify({'success': False, 'error': 'Invalid form data'}), 400

        else:
            # Handle JSON Request (Text only fallback)
            data = request.get_json()
            responses = data.get('responses', [])
        
        if not responses:
            return jsonify({'success': False, 'error': 'No responses provided'}), 400

        logger.info(f"🎤 Analyzing {len(responses)} speech responses...")

        # Step 1: Extract Cognitive Features using GROQ
        responses_text = "\n\n".join([
            f"Question: {r.get('question')}\nAnswer: {r.get('transcript')}"
            for r in responses
        ])

        extraction_prompt = f"""Analyze these speech responses and estimate reliable cognitive scores (0.0 to 1.0) for a medical ML model.
        
        Responses:
        {responses_text}
        
        Return ONLY a JSON object with these exact keys:
        {{
            "speech_fluidity_score": float, (0.0=fluent, 1.0=severe issues),
            "language_processing_score": float, (0.0=good, 1.0=impaired),
            "memory_loss_score": float, (0.0=good memory, 1.0=severe loss),
            "executive_function_score": float, (0.0=good, 1.0=impaired),
            "attention_span_score": float, (0.0=good, 1.0=impaired),
            "reasoning_ability_score": float, (0.0=good, 1.0=impaired),
            "short_term_memory_score": float, (0.0=good, 1.0=impaired)
        }}"""

        import time
        start_time = time.time()
        
        # Use a faster model for feature extraction
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant", 
            messages=[{"role": "user", "content": extraction_prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        scores = json.loads(response.choices[0].message.content)
        logger.info(f"📊 Extracted scores ({(time.time() - start_time):.2f}s): {scores}")

        # Step 2: Prepare Feature Vector for ML Model
        # We need to map extracted scores to the model's 50 features.
        
        # Default baseline - changed to 0.1 (Healthy) to avoid MCI bias
        baseline = 0.1
        
        impairment_factor = np.mean(list(scores.values())) if scores else 0
        
        # Construct feature dictionary (matching prediction_controller.py test data)
        ml_features = {
            'memory_loss_score': scores.get('memory_loss_score', baseline),
            'cognitive_decline_rate': impairment_factor, 
            'motor_symptom_severity': baseline * 0.5, 
            'visual_hallucination_freq': 0.1, 
            'age': 70.0, 
            'frontal_lobe_volume': 1.0 - impairment_factor,
            'temporal_lobe_volume': 1.0 - impairment_factor,
            'parietal_lobe_volume': 1.0 - (impairment_factor * 0.8),
            'occipital_lobe_volume': 0.8,
            'cerebellum_volume': 0.8,
            'brainstem_integrity': 0.9,
            'hippocampus_volume': 1.0 - scores.get('memory_loss_score', baseline),
            'amygdala_volume': 0.8,
            'ventricle_size_index': impairment_factor,
            'corpus_callosum_thickness': 1.0 - impairment_factor,
            'executive_function_score': scores.get('executive_function_score', baseline),
            'language_processing_score': scores.get('language_processing_score', baseline),
            'attention_span_score': scores.get('attention_span_score', baseline),
            'processing_speed_score': scores.get('speech_fluidity_score', baseline),
            'reasoning_ability_score': scores.get('reasoning_ability_score', baseline),
            'orientation_score': 1.0 - impairment_factor,
            'problem_solving_score': 1.0 - scores.get('executive_function_score', baseline),
            'decision_making_score': 1.0 - scores.get('executive_function_score', baseline),
            'short_term_memory_score': scores.get('short_term_memory_score', baseline),
            'long_term_memory_score': scores.get('memory_loss_score', baseline),
            'gait_speed': 0.8,
            'tremor_intensity': 0.1,
            'hand_movement_accuracy': 0.9,
            'coordination_index': 0.9,
            'muscle_rigidity_score': 0.1,
            'balance_stability_score': 0.9,
            'reaction_time': 0.3 + (impairment_factor * 0.5), 
            'fine_motor_control': 0.9,
            'facial_expression_score': 0.9,
            'speech_fluidity_score': scores.get('speech_fluidity_score', baseline),
            'synaptic_density_index': 1.0 - impairment_factor,
            'neural_connectivity_strength': 1.0 - impairment_factor,
            'white_matter_integrity': 1.0 - impairment_factor,
            'gray_matter_density': 1.0 - impairment_factor,
            'glucose_metabolism_rate': 1.0 - impairment_factor,
            'oxygenation_level': 0.95,
            'cortical_thickness': 1.0 - impairment_factor,
            'neuronal_activity_rate': 1.0 - impairment_factor,
            'immune_inflammation_score': impairment_factor,
            'protein_aggregation_level': impairment_factor,
            'neuro_transmitter_level': 1.0 - impairment_factor,
            'brain_iron_concentration': impairment_factor,
            'neuroinflammation_index': impairment_factor,
            'oxidative_stress_score': impairment_factor,
            'vascular_health_index': 1.0 - impairment_factor
        }

        # Step 3: Run Prediction using Loaded ML Model
        from app import model, scaler, label_encoder, features
        
        if not model:
            raise ValueError("ML Model not loaded")

        # Prepare input vector ensuring correct order
        if features:
            feature_values = np.array([ml_features.get(f, 0) for f in features])
        else:
            feature_values = np.array(list(ml_features.values()))
            
        feature_values = feature_values.reshape(1, -1)
        features_scaled = scaler.transform(feature_values)
        
        # Predict
        prediction_idx = model.predict(features_scaled)[0]
        predicted_disease = label_encoder.inverse_transform([prediction_idx])[0]
        probabilities = model.predict_proba(features_scaled)[0]
        confidence = float(max(probabilities))
        
        logger.info(f"🤖 ML Prediction: {predicted_disease} ({confidence:.2f})")

        # Step 4: Generate Explanation via GROQ
        explanation_prompt = f"""
        Based on the patient's speech analysis, the ML model predicted: **{predicted_disease}** with {confidence*100:.1f}% confidence.
        
        Cognitive Scores Extracted (0-1, 1=Impaired):
        - Fluency: {scores.get('speech_fluidity_score', 0)}
        - Memory Loss: {scores.get('memory_loss_score', 0)}
        - Language: {scores.get('language_processing_score', 0)}
        
        Task Responses:
        {responses_text}
        
        Provide a clinical explanation for this prediction.
        Return JSON:
        {{
            "reasoning": "...",
            "recommendations": ["..."],
            "risk_level": "Low/Moderate/High/Critical"
        }}
        """
        
        exp_start = time.time()
        exp_response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": explanation_prompt}],
            temperature=0.7,
            max_tokens=400, # Limit length to speed up
            response_format={"type": "json_object"}
        )
        logger.info(f"📝 Explanation generated ({(time.time() - exp_start):.2f}s)")
        
        explanation = json.loads(exp_response.choices[0].message.content)

        # Final Result Structure
        analysis_result = {
            "predicted_disease": predicted_disease,
            "confidence": confidence,
            "risk_level": explanation.get('risk_level', 'Moderate'),
            "speech_markers": {
                "fluency_score": int((1.0 - scores.get('speech_fluidity_score', 0.5)) * 100), 
                "memory_score": int((1.0 - scores.get('memory_loss_score', 0.5)) * 100),
                "language_score": int((1.0 - scores.get('language_processing_score', 0.5)) * 100),
                "attention_score": int((1.0 - scores.get('attention_span_score', 0.5)) * 100),
                "executive_function_score": int((1.0 - scores.get('executive_function_score', 0.5)) * 100)
            },
            "detected_issues": [k for k,v in scores.items() if v > 0.6], 
            "reasoning": explanation.get('reasoning'),
            "recommendations": explanation.get('recommendations', [])
        }
        
        # Generate PDF Report
        try:
            filename = f"speech_report_{uuid.uuid4().hex[:8]}.pdf"
            generate_speech_report(analysis_result, filename)
            analysis_result['reportUrl'] = f"/speech/download/{filename}"
            logger.info(f"📄 Generated report: {filename}")
        except Exception as pdf_err:
            logger.error(f"⚠️ Failed to generate PDF: {pdf_err}")

        return jsonify({
            'success': True,
            'analysis': analysis_result
        })

    except Exception as e:
        logger.error(f"❌ Error analyzing speech: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@speech_bp.route('/download/<filename>', methods=['GET'])
def serve_report(filename):
    """Serve generated PDF reports"""
    try:
        reports_dir = Path(__file__).parent.parent / 'reports'
        file_path = reports_dir / filename
        
        if not file_path.exists():
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
        
        return send_file(
            str(file_path),
            mimetype='application/pdf',
            as_attachment=False,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Error serving report: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@speech_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'speech-analysis',
        'groq_configured': groq_client is not None
    })
