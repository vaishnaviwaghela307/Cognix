"""
Test Routes - Quick Test & Clinical Test with GROQ AI
Handles question generation, disease prediction, and PDF report generation
"""

from flask import Blueprint, request, jsonify, send_file
from groq import Groq
import os
import json
import logging
from pathlib import Path
from datetime import datetime
import uuid
from utils.report_generator import MedicalReportGenerator
from utils.xai_engine import XAIEngine
import numpy as np
from config import get_config

logger = logging.getLogger(__name__)
test_bp = Blueprint('test', __name__, url_prefix='/test')

config = get_config()

# Initialize GROQ client
groq_client = Groq(api_key=config.GROQ_API_KEY)


@test_bp.route('/quick/generate-questions', methods=['POST'])
def generate_quick_test_questions():
    """
    Generate 7 quick screening questions from a curated pool
    """
    try:
        import random
        logger.info("🎯 Generating quick test questions from curated pool...")
        
        # Curated pool of clinically validated questions
        question_pool = [
            # Memory Questions
            {
                "id": 1, "category": "Memory",
                "question": "How often do you forget where you placed everyday items like keys or wallet?",
                "options": [
                    {"text": "Never or rarely", "score": 0},
                    {"text": "Sometimes (once a week)", "score": 1},
                    {"text": "Often (several times a week)", "score": 2},
                    {"text": "Almost daily", "score": 3}
                ]
            },
            {
                "id": 2, "category": "Memory",
                "question": "Do you have difficulty remembering recent conversations or events from the past few days?",
                "options": [
                    {"text": "No difficulty at all", "score": 0},
                    {"text": "Slight difficulty sometimes", "score": 1},
                    {"text": "Frequently forget recent events", "score": 2},
                    {"text": "Cannot remember most recent events", "score": 3}
                ]
            },
            {
                "id": 3, "category": "Memory",
                "question": "How well can you recall names of people you recently met?",
                "options": [
                    {"text": "Remember names easily", "score": 0},
                    {"text": "Sometimes need reminders", "score": 1},
                    {"text": "Usually forget names quickly", "score": 2},
                    {"text": "Cannot recall names at all", "score": 3}
                ]
            },
            # Attention Questions
            {
                "id": 4, "category": "Attention",
                "question": "How easily can you concentrate on a task without getting distracted?",
                "options": [
                    {"text": "Can focus for extended periods", "score": 0},
                    {"text": "Occasionally lose focus", "score": 1},
                    {"text": "Frequently distracted", "score": 2},
                    {"text": "Cannot maintain focus at all", "score": 3}
                ]
            },
            {
                "id": 5, "category": "Attention",
                "question": "Do you lose track of what you were doing or saying mid-task?",
                "options": [
                    {"text": "Never happens", "score": 0},
                    {"text": "Happens occasionally", "score": 1},
                    {"text": "Happens frequently", "score": 2},
                    {"text": "Happens constantly", "score": 3}
                ]
            },
            {
                "id": 6, "category": "Attention",
                "question": "How well can you follow a conversation when multiple people are talking?",
                "options": [
                    {"text": "No difficulty following", "score": 0},
                    {"text": "Sometimes miss parts", "score": 1},
                    {"text": "Often feel confused", "score": 2},
                    {"text": "Cannot follow at all", "score": 3}
                ]
            },
            # Language Questions
            {
                "id": 7, "category": "Language",
                "question": "Do you experience difficulty finding the right words during conversations?",
                "options": [
                    {"text": "No difficulty", "score": 0},
                    {"text": "Occasionally pause to find words", "score": 1},
                    {"text": "Frequently struggle with words", "score": 2},
                    {"text": "Very difficult to express thoughts", "score": 3}
                ]
            },
            {
                "id": 8, "category": "Language",
                "question": "How well can you understand written instructions or articles?",
                "options": [
                    {"text": "Understand completely", "score": 0},
                    {"text": "Need to re-read sometimes", "score": 1},
                    {"text": "Often confused by text", "score": 2},
                    {"text": "Cannot comprehend written material", "score": 3}
                ]
            },
            {
                "id": 9, "category": "Language",
                "question": "Do you have trouble following the plot of a TV show or movie?",
                "options": [
                    {"text": "Follow without any issues", "score": 0},
                    {"text": "Occasionally lose track", "score": 1},
                    {"text": "Frequently confused by storylines", "score": 2},
                    {"text": "Cannot follow plots at all", "score": 3}
                ]
            },
            # Motor Questions
            {
                "id": 10, "category": "Motor",
                "question": "Do you experience trembling or shaking in your hands during daily activities?",
                "options": [
                    {"text": "No trembling", "score": 0},
                    {"text": "Slight trembling occasionally", "score": 1},
                    {"text": "Noticeable trembling often", "score": 2},
                    {"text": "Severe trembling affecting activities", "score": 3}
                ]
            },
            {
                "id": 11, "category": "Motor",
                "question": "How is your balance when walking or standing?",
                "options": [
                    {"text": "Excellent balance", "score": 0},
                    {"text": "Occasional unsteadiness", "score": 1},
                    {"text": "Frequently unsteady", "score": 2},
                    {"text": "Need support to walk/stand", "score": 3}
                ]
            },
            {
                "id": 12, "category": "Motor",
                "question": "Do you have difficulty with fine motor tasks like buttoning clothes or writing?",
                "options": [
                    {"text": "No difficulty", "score": 0},
                    {"text": "Slight difficulty", "score": 1},
                    {"text": "Significant difficulty", "score": 2},
                    {"text": "Cannot perform these tasks", "score": 3}
                ]
            },
            # Orientation Questions
            {
                "id": 13, "category": "Orientation",
                "question": "Do you sometimes feel confused about the current date or day of the week?",
                "options": [
                    {"text": "Always know the date/day", "score": 0},
                    {"text": "Occasionally unsure", "score": 1},
                    {"text": "Frequently confused", "score": 2},
                    {"text": "Rarely know the date/day", "score": 3}
                ]
            },
            {
                "id": 14, "category": "Orientation",
                "question": "Have you ever felt lost or disoriented in familiar places?",
                "options": [
                    {"text": "Never", "score": 0},
                    {"text": "Once or twice", "score": 1},
                    {"text": "Multiple times", "score": 2},
                    {"text": "Frequently get lost", "score": 3}
                ]
            },
            {
                "id": 15, "category": "Orientation",
                "question": "Do you have trouble recognizing familiar faces?",
                "options": [
                    {"text": "Recognize everyone easily", "score": 0},
                    {"text": "Occasionally need a moment", "score": 1},
                    {"text": "Often don't recognize people", "score": 2},
                    {"text": "Cannot recognize familiar people", "score": 3}
                ]
            },
            # Daily Living Questions
            {
                "id": 16, "category": "Daily Living",
                "question": "How well can you manage your medications or appointments?",
                "options": [
                    {"text": "Manage independently without issues", "score": 0},
                    {"text": "Need occasional reminders", "score": 1},
                    {"text": "Need frequent help", "score": 2},
                    {"text": "Cannot manage without assistance", "score": 3}
                ]
            },
            {
                "id": 17, "category": "Daily Living",
                "question": "Have you noticed changes in your ability to make decisions?",
                "options": [
                    {"text": "No changes, decide confidently", "score": 0},
                    {"text": "Slightly more hesitant", "score": 1},
                    {"text": "Often struggle with decisions", "score": 2},
                    {"text": "Cannot make decisions alone", "score": 3}
                ]
            },
            {
                "id": 18, "category": "Daily Living",
                "question": "How is your sleep quality recently?",
                "options": [
                    {"text": "Sleep well, feel rested", "score": 0},
                    {"text": "Occasionally disturbed sleep", "score": 1},
                    {"text": "Frequently poor sleep", "score": 2},
                    {"text": "Severe sleep problems", "score": 3}
                ]
            },
            # Mood/Behavior Questions
            {
                "id": 19, "category": "Mood",
                "question": "Have you experienced unexplained mood changes recently?",
                "options": [
                    {"text": "Mood is stable", "score": 0},
                    {"text": "Occasional mood swings", "score": 1},
                    {"text": "Frequent mood changes", "score": 2},
                    {"text": "Severe mood instability", "score": 3}
                ]
            },
            {
                "id": 20, "category": "Mood",
                "question": "Do you feel more anxious or worried than usual?",
                "options": [
                    {"text": "Feel calm and relaxed", "score": 0},
                    {"text": "Slightly more anxious", "score": 1},
                    {"text": "Frequently anxious", "score": 2},
                    {"text": "Constantly worried", "score": 3}
                ]
            }
        ]
        
        # Select 15 questions ensuring variety across categories
        # We have 20 total questions in the pool.
        random.shuffle(question_pool)
        selected = question_pool[:15]
        
        # Sort by category to keep it structured
        selected.sort(key=lambda x: x['category'])
        
        # Reassign IDs for the sequence
        for i, q in enumerate(selected):
            q['id'] = i + 1
        
        logger.info(f"✅ Selected {len(selected)} questions for Neural Health Index")
        
        return jsonify({
            'success': True,
            'questions': selected,
            'test_type': 'quick',
            'estimated_time': '2-3 minutes'
        })
        
    except Exception as e:
        logger.error(f"❌ Error generating questions: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@test_bp.route('/quick/analyze', methods=['POST'])
def analyze_quick_test():
    """
    Analyze quick test results and generate small PDF report
    """
    try:
        import numpy as np
        import json
        from app import model, scaler, label_encoder, features, model_loaded
        
        data = request.json
        answers = data.get('answers', [])
        user_id = data.get('user_id', 'anonymous')
        behavioral_metrics = data.get('behavioral_metrics', {})
        
        logger.info(f"📊 Analyzing quick test with {len(answers)} answers and behavioral signals...")
        if behavioral_metrics:
            tt = behavioral_metrics.get('timeTakenPerQuestion', [])
            logger.info(f"⏱️ Received {len(tt)} timing signals")
        else:
            logger.warning("⚠️ No behavioral metrics received in payload")
        
        # 1. Use GROQ to map dynamic answers to ML features
        mapping_prompt = f"""Analyze these patient test answers and estimate the following 31 medical feature scores (0.0 to 1.0).
        
Answers: {json.dumps(answers)}

Features to estimate:
visual_hallucination_freq, motor_symptom_severity, cognitive_decline_rate, memory_loss_score, age, attention_span_score, cortical_thickness, gait_speed, short_term_memory_score, reaction_time, problem_solving_score, ventricle_size_index, white_matter_integrity, fine_motor_control, brainstem_integrity, corpus_callosum_thickness, hand_movement_accuracy, brain_iron_concentration, facial_expression_score, decision_making_score, parietal_lobe_volume, synaptic_density_index, glucose_metabolism_rate, neuro_transmitter_level, neuronal_activity_rate, balance_stability_score, neuroinflammation_index, temporal_lobe_volume, oxygenation_level, protein_aggregation_level, neural_connectivity_strength.

For 'age': Estimate between 50-90 based on symptom severity and context.

Return ONLY a JSON object with feature names as keys and floats as values.

IMPORTANT: Pay close attention to domain-specific markers:
- Repetitive answers or 'forgetting' mentioned items -> memory_loss_score
- Difficulty naming things or word-finding pauses -> language/decision_making_score
- Hesitation or slow responses -> attention_span_score/reaction_time
- Errors in logic or naming -> cortical_thickness/neural_connectivity_strength"""

        mapping_response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": mapping_prompt}],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        feature_estimates = json.loads(mapping_response.choices[0].message.content)
        
        # 2. Predict using ML Model
        predicted_disease = "Assessment Pending"
        confidence = 0.0
        xai_data = {}
        
        if model_loaded:
            try:
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
                
                # Fill missing with 0.5 (neutral)
                vals = [float(feature_estimates.get(f, 0.5)) for f in feature_order]
                logger.info(f"📊 Feature values prepared: {len(vals)} features")
                
                feature_array = np.array(vals).reshape(1, -1)
                
                scaled = scaler.transform(feature_array)
                prediction_idx = model.predict(scaled)[0]
                predicted_disease = label_encoder.inverse_transform([prediction_idx])[0]
                probabilities = model.predict_proba(scaled)[0]
                confidence = float(max(probabilities))
                
                logger.info(f"✅ ML Prediction: {predicted_disease} (Confidence: {confidence:.2%})")
                
                # --- EXPLAINABLE AI PIPELINE ---
                logger.info(f"🔍 Generating XAI for quick test: {predicted_disease}")
                category_breakdown, top_features = XAIEngine.calculate_contributions(model, feature_order, scaled)
                explanation = XAIEngine.generate_reasoning_trace(config.GROQ_API_KEY, predicted_disease, confidence, category_breakdown, top_features)
                
                xai_data = {
                    'symptom_breakdown': category_breakdown,
                    'top_features': top_features,
                    'reasoning_trace': explanation
                }
            except Exception as ml_error:
                logger.error(f"❌ ML Prediction failed: {ml_error}", exc_info=True)
                predicted_disease = "Unable to determine - Please consult a healthcare provider"
                confidence = 0.0
                xai_data = {
                    'symptom_breakdown': {},
                    'top_features': [],
                    'reasoning_trace': "Prediction model encountered an error. Please consult with a healthcare professional for proper assessment."
                }
        else:
            logger.warning("⚠️ ML Model not loaded, using default values")
            predicted_disease = "Model Not Available - Please consult a healthcare provider"
            
        # Ensure predicted_disease is never None or empty - Use GROQ Fallback
        if not predicted_disease or predicted_disease in ["NA", "None", "", "Assessment Pending", "Model Not Available - Please consult a healthcare provider"]:
            logger.warning(f"⚠️ ML prediction failed: '{predicted_disease}', using GROQ fallback")
            
            try:
                # GROQ Fallback: Direct disease prediction
                groq_prediction_prompt = f"""Based on cognitive test answers, predict the most likely condition.

Answers: {json.dumps(answers[:5])}

Conditions: Alzheimers, Parkinsons, MCI, Vascular, FTD, LBD, Healthy

Return JSON: {{"disease": "name", "confidence": 0.0-1.0}}"""

                groq_response = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": groq_prediction_prompt}],
                    temperature=0.2,
                    response_format={"type": "json_object"}
                )
                
                groq_pred = json.loads(groq_response.choices[0].message.content)
                predicted_disease = groq_pred.get("disease", "Healthy")
                confidence = float(groq_pred.get("confidence", 0.6))
                logger.info(f"✅ GROQ Fallback: {predicted_disease} ({confidence:.2%})")
                
            except Exception as groq_error:
                logger.error(f"❌ GROQ fallback failed: {groq_error}")
                predicted_disease = "Healthy"
                confidence = 0.5
        # 3. Generate risk level
        risk_level = "Low"
        if confidence > 0.7: risk_level = "High" if predicted_disease != "Healthy" else "Low"
        elif confidence > 0.4: risk_level = "Moderate"
        
        # 4. Generate Short Summary Report
        report_id = str(uuid.uuid4())
        reports_dir = Path(__file__).parent.parent / 'reports'
        reports_dir.mkdir(exist_ok=True)
        
        report_data = {
            'report_id': report_id,
            'date': datetime.now().strftime('%d %B %Y, %I:%M %p'),
            'type': 'Quick Screening (ML Assisted)',
            'patient_id': user_id,
            'test_score': f"ML Confidence: {confidence*100:.1f}%",
            'predicted_disease': predicted_disease,
            'risk_level': risk_level,
            'test_duration': '2-3 minutes',
            'explainability': xai_data,
            'recommendations': f"Based on ML analysis (Confidence: {confidence*100:.1f}%), indicating {predicted_disease}. Please consult a doctor for a full clinical exam."
        }
        
        report_generator = MedicalReportGenerator(config.GROQ_API_KEY)
        pdf_filename = f"quick_test_{report_id}.pdf"
        pdf_path = reports_dir / pdf_filename
        
        # Generate summary content for the PDF
        summary_prompt = f"""Act as a neurologist. Provide a concise, 3-sentence clinical summary for a rapid screening result indicating {predicted_disease}. 
        Focus on:
        1. Observable patterns detected.
        2. Immediate clinical priority.
        3. Simple next step recommendations.
        Address as a professional clinical note."""
        summary_resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": summary_prompt}],
            max_tokens=250
        )
        summary_text = summary_resp.choices[0].message.content

        # Generate Recommendations
        rec_prompt = f"""Generate 4 professional medical recommendations/remedies for a patient screened for {predicted_disease}. 
        Focus on exercise, diet, cognitive activities, and professional consultation.
        Return a JSON object with a key 'recommendations' containing an array of 4 strings."""
        rec_resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": rec_prompt}],
            response_format={ "type": "json_object" },
            max_tokens=250
        )
        
        try:
            recs_data = json.loads(rec_resp.choices[0].message.content)
            recommendations = recs_data.get('recommendations', [])
            if not isinstance(recommendations, list):
                recommendations = [recommendations] if recommendations else []
        except:
            recommendations = [f"Consult a specialist for {predicted_disease}", "Maintain a healthy lifestyle", "Engage in cognitive exercises", "Regular follow-ups"]

        report_data['recommendations'] = summary_text + "\n\n" + "\n".join([f"- {r}" for r in recommendations])
        
        report_generator.generate_quick_test_report(report_data, str(pdf_path))
        
        # 5. Generate Behavioral Summary via GROQ if metrics exist
        behavioral_summary = ""
        if behavioral_metrics:
            bev_prompt = f"""Analyze these hidden behavioral signals tracked during a cognitive test:
            {json.dumps(behavioral_metrics)}
            
            Identify anomalies like:
            - Excessive hesitation (long delays before input)
            - Response instability (frequent answer modifications)
            - Cognitive friction (high edit counts or backspaces)
            - Motor-cognitive interference (erratic typing speed changes)
            
            Summarize the behavioral findings in 2 concise sentences for a medical professional."""
            
            try:
                bev_resp = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": bev_prompt}],
                    max_tokens=150
                )
                behavioral_summary = bev_resp.choices[0].message.content
            except Exception as e:
                logger.warning(f"Failed to generate behavioral summary: {e}")

        # 7. Calculate domain scores (from the feature estimates)
        domain_scores = {
            "Memory": round(1 - feature_estimates.get('memory_loss_score', 0.5), 2),
            "Attention": round(feature_estimates.get('attention_span_score', 0.5), 2),
            "Language": round(feature_estimates.get('decision_making_score', 0.5), 2),
            "Motor": round(1 - feature_estimates.get('motor_symptom_severity', 0.5), 2),
            "Executive Function": round(feature_estimates.get('problem_solving_score', 0.5), 2),
            "Visuospatial": round(feature_estimates.get('parietal_lobe_volume', 0.5), 2)
        }

        return jsonify({
            'success': True,
            'summary': summary_text,
            'recommendations': recommendations,
            'behavioral_summary': behavioral_summary,
            'prediction': {
                'disease': predicted_disease,
                'confidence': round(confidence, 2),
                'risk': risk_level,
                'explainability': xai_data
            },
            'domain_scores': domain_scores,
            'report': {
                'report_url': f'/test/reports/{pdf_filename}',
                'report_id': report_id
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error analyzing quick test: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@test_bp.route('/clinical/generate-questions', methods=['POST'])
def generate_clinical_test_questions():
    """
    Generate comprehensive clinical assessment questions using GROQ AI
    Mixed types: yes_no, text_input, mcq
    """
    try:
        logger.info("🏥 Generating deep clinical assessment questions with GROQ...")
        
        prompt = """As a senior neurologist conducting a comprehensive cognitive evaluation, generate 15 clinical assessment questions.

IMPORTANT REQUIREMENTS:
1. Generate DEEP, MEANINGFUL clinical questions that have REAL DIAGNOSTIC VALUE
2. Mix THREE types of inputs:
   - "yes_no": Simple yes/no questions for quick screening
   - "text_input": Open-ended questions where patient must type/speak response (for memory, language assessment)
   - "mcq": Multiple choice for severity/frequency assessment

3. Cover these domains: Memory, Attention, Language, Executive Function, Visuospatial, Motor, Orientation, Daily Living
4. Questions should reveal REAL cognitive patterns, not just surface level

Return ONLY a valid JSON array with this structure:
[
  {
    "id": 1,
    "question": "Have you noticed difficulty remembering recent conversations within the last hour?",
    "type": "yes_no",
    "category": "Memory",
    "clinical_weight": 3,
    "follow_up": "If yes, how often does this occur?"
  },
  {
    "id": 2,
    "question": "Please name as many animals as you can think of in 60 seconds.",
    "type": "text_input",
    "category": "Language",
    "clinical_weight": 4,
    "placeholder": "Type all animals you can think of...",
    "expected_min": 12,
    "scoring_note": "Normal: 12+ animals, MCI: 8-11, Impaired: <8"
  },
  {
    "id": 3,
    "question": "How often do you have trouble finding the right word during conversations?",
    "type": "mcq",
    "category": "Language",
    "clinical_weight": 3,
    "options": [
      {"text": "Never or rarely", "score": 0, "severity": "Normal"},
      {"text": "Sometimes (few times a week)", "score": 1, "severity": "Mild"},
      {"text": "Often (daily)", "score": 2, "severity": "Moderate"},
      {"text": "Almost always", "score": 3, "severity": "Severe"}
    ]
  }
]

Generate 15 questions now - approximately 4 yes_no, 4 text_input, and 7 mcq questions covering all domains."""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
            max_tokens=4000,
            response_format={"type": "json_object"}
        )
        
        result_text = response.choices[0].message.content.strip()
        import json
        result = json.loads(result_text)
        
        # Extract questions array
        questions = result.get('questions', result) if isinstance(result, dict) else result
        
        if not isinstance(questions, list) or len(questions) == 0:
            raise Exception("Invalid questions format")
        
        # Ensure each question has required fields
        for i, q in enumerate(questions):
            q['id'] = i + 1
            if 'type' not in q:
                q['type'] = 'mcq'
            if 'clinical_weight' not in q:
                q['clinical_weight'] = 3
            if 'category' not in q:
                q['category'] = 'General'
        
        logger.info(f"✅ Generated {len(questions)} deep clinical questions")
        
        return jsonify({
            'success': True,
            'questions': questions,
            'test_type': 'clinical_comprehensive',
            'total_questions': len(questions),
            'estimated_time': '15-20 minutes',
            'input_types': {
                'yes_no': len([q for q in questions if q.get('type') == 'yes_no']),
                'text_input': len([q for q in questions if q.get('type') == 'text_input']),
                'mcq': len([q for q in questions if q.get('type') == 'mcq'])
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error generating clinical questions: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@test_bp.route('/clinical/analyze', methods=['POST'])
def analyze_clinical_test():
    """
    Analyze clinical test results and generate detailed PDF report with GROQ
    """
    try:
        from app import model, scaler, label_encoder, features, model_loaded
        import numpy as np
        
        data = request.json
        answers = data.get('answers', [])
        user_id = data.get('user_id', 'anonymous')
        behavioral_metrics = data.get('behavioral_metrics', {})
        
        logger.info(f"🏥 Analyzing clinical test with {len(answers)} answers and behavioral signals...")
        
        # 1. Map to Features using GROQ
        mapping_prompt = f"""Analyze these Clinical Evaluation answers (MMSE/MoCA style) and estimate the 31 medical feature scores (0.0 to 1.0).
        
Answers: {json.dumps(answers)}

Features: visual_hallucination_freq, motor_symptom_severity, cognitive_decline_rate, memory_loss_score, age, attention_span_score, cortical_thickness, gait_speed, short_term_memory_score, reaction_time, problem_solving_score, ventricle_size_index, white_matter_integrity, fine_motor_control, brainstem_integrity, corpus_callosum_thickness, hand_movement_accuracy, brain_iron_concentration, facial_expression_score, decision_making_score, parietal_lobe_volume, synaptic_density_index, glucose_metabolism_rate, neuro_transmitter_level, neuronal_activity_rate, balance_stability_score, neuroinflammation_index, temporal_lobe_volume, oxygenation_level, protein_aggregation_level, neural_connectivity_strength.

For 'age': Estimate between 50-90 based on symptom severity and context.

Return ONLY a JSON object."""

        mapping_response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": mapping_prompt}],
            temperature=0,
            response_format={"type": "json_object"}
        )
        feature_estimates = json.loads(mapping_response.choices[0].message.content)

        # 2. ML Prediction
        predicted_disease = "Inconclusive"
        confidence = 0.0
        
        if model_loaded:
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
            vals = [float(feature_estimates.get(f, 0.5)) for f in feature_order]
            
            # Integrate Caregiver Signals if available
            caregiver_signals = data.get('caregiver_signals')
            if caregiver_signals:
                try:
                    from controllers.caregiver_controller import CaregiverController
                    c_signals = caregiver_signals.get('symptom_signals', {})
                    
                    # Behavioral Risk increases motor and neuro symptoms
                    behavior_risk = c_signals.get('behavioral_risk', 0)
                    vals[1] = min(1.0, vals[1] + (behavior_risk * 0.2)) # motor_symptom_severity
                    vals[0] = min(1.0, vals[0] + (behavior_risk * 0.3)) # visual_hallucination_freq
                    
                    # Cognitive Stability decreases cognitive decline
                    cog_stability = c_signals.get('cognitive_stability', 1)
                    vals[2] = min(1.0, vals[2] + ((1 - cog_stability) * 0.3)) # cognitive_decline_rate
                    vals[3] = min(1.0, vals[3] + ((1 - cog_stability) * 0.2)) # memory_loss_score
                    
                    logger.info("Caregiver signals integrated into comprehensive feature estimates")
                except Exception as ce:
                    logger.error(f"Failed to integrate caregiver signals: {ce}")

            feature_array = np.array(vals).reshape(1, -1)
            scaled = scaler.transform(feature_array)
            prediction_idx = model.predict(scaled)[0]
            predicted_disease = label_encoder.inverse_transform([prediction_idx])[0]
            probabilities = model.predict_proba(scaled)[0]
            confidence = float(max(probabilities))
            
            # Validate prediction - Use GROQ Fallback if needed
            if not predicted_disease or predicted_disease in ["NA", "None", ""]:
                logger.warning(f"⚠️ Clinical ML prediction failed, using GROQ fallback")
                try:
                    groq_prompt = f"""Based on clinical assessment answers, predict cognitive condition.

Answers: {json.dumps(answers[:5])}

Conditions: Alzheimers, Parkinsons, MCI, Vascular, FTD, LBD, Healthy

Return JSON: {{"disease": "name", "confidence": 0.0-1.0}}"""

                    groq_response = groq_client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[{"role": "user", "content": groq_prompt}],
                        temperature=0.2,
                        response_format={"type": "json_object"}
                    )
                    groq_pred = json.loads(groq_response.choices[0].message.content)
                    predicted_disease = groq_pred.get("disease", "Healthy")
                    confidence = float(groq_pred.get("confidence", 0.6))
                    logger.info(f"✅ GROQ Fallback (Clinical): {predicted_disease}")
                except Exception as e:
                    logger.error(f"❌ GROQ fallback failed: {e}")
                    predicted_disease = "Healthy"
                    confidence = 0.5
            
            # --- EXPLAINABLE AI PIPELINE ---
            logger.info(f"🔍 Generating XAI for clinical test: {predicted_disease}")
            category_breakdown, top_features = XAIEngine.calculate_contributions(model, feature_order, scaled)
            explanation = XAIEngine.generate_reasoning_trace(config.GROQ_API_KEY, predicted_disease, confidence, category_breakdown, top_features)
            
            xai_data = {
                'symptom_breakdown': category_breakdown,
                'top_features': top_features,
                'reasoning_trace': explanation
            }

        # 3. Generate detailed PDF report with GROQ
        report_id = str(uuid.uuid4())
        reports_dir = Path(__file__).parent.parent / 'reports'
        reports_dir.mkdir(exist_ok=True)
        
        report_data = {
            'report_id': report_id,
            'date': datetime.now().strftime('%d %B %Y, %I:%M %p'),
            'type': 'Comprehensive Clinical Assessment (ML Prediction)',
            'patient_id': user_id,
            'predicted_disease': predicted_disease,
            'ml_confidence': confidence,
            'risk_level': 'High' if confidence > 0.6 else 'Moderate',
            'explainability': xai_data,
            'clinical_features': f"ML Model detected patterns consistent with {predicted_disease}."
        }
        
        report_generator = MedicalReportGenerator(config.GROQ_API_KEY)
        pdf_filename = f"clinical_{report_id}.pdf"
        pdf_path = reports_dir / pdf_filename
        
        report_generator.generate_pdf_report(report_data, str(pdf_path))
        
        # 4. Generate Professional Summary and Recommendations for Response
        summary_prompt = f"""Act as a Senior Neurologist. Write a detailed 4-sentence diagnostic observation for a clinical evaluation that predicted {predicted_disease} with {confidence*100:.1f}% confidence.
        Include:
        - Specific cognitive/motor domain indicators.
        - Differential considerations.
        - Professional clinical outlook.
        - Precise follow-up path.
        Keep the tone academic and professional."""
        summary_resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": summary_prompt}],
            max_tokens=400
        )
        summary_text = summary_resp.choices[0].message.content

        rec_prompt = f"""Generate 5 expert medical recommendations for a patient diagnosed with {predicted_disease}.
        Provide specific lifestyle changes, cognitive therapies, and medical next steps.
        Return ONLY a JSON object with a key 'recommendations' containing an array of 5 strings."""
        rec_resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": rec_prompt}],
            response_format={ "type": "json_object" },
            max_tokens=300
        )
        
        try:
            recs_data = json.loads(rec_resp.choices[0].message.content)
            recommendations = recs_data.get('recommendations', [])
            if not isinstance(recommendations, list):
                recommendations = [recommendations] if recommendations else []
        except:
             recommendations = [f"In-depth neurological consultation for {predicted_disease}", "Begin specialized cognitive rehabilitation", "Pharmacotherapy review", "Support group integration", "Caregiver counseling"]

        # 5. Calculate severity based on confidence and disease type
        severity = "Mild"
        if confidence > 0.8:
            severity = "Severe"
        elif confidence > 0.6:
            severity = "Moderate"
        elif confidence > 0.4:
            severity = "Mild"
        else:
            severity = "Minimal"
        
        # 6. Calculate risk level
        risk_level = "Low"
        if predicted_disease not in ["Healthy", "Normal", "No Significant Findings"]:
            if confidence > 0.7:
                risk_level = "High"
            elif confidence > 0.4:
                risk_level = "Moderate"
        
        # 7. Domain scores summary (from the feature estimates)
        domain_scores = {
            "Memory": round(1 - feature_estimates.get('memory_loss_score', 0.5), 2),
            "Attention": round(feature_estimates.get('attention_span_score', 0.5), 2),
            "Language": round(feature_estimates.get('decision_making_score', 0.5), 2),
            "Motor": round(1 - feature_estimates.get('motor_symptom_severity', 0.5), 2),
            "Executive Function": round(feature_estimates.get('problem_solving_score', 0.5), 2),
            "Visuospatial": round(feature_estimates.get('parietal_lobe_volume', 0.5), 2)
        }

        # 8. Generate Behavioral Summary via GROQ if metrics exist
        behavioral_summary = ""
        if behavioral_metrics:
            bev_prompt = f"""Analyze these hidden behavioral signals tracked during a comprehensive clinical assessment:
            {json.dumps(behavioral_metrics)}
            
            Identify anomalies like:
            - Excessive hesitation (long delays before input)
            - Response instability (frequent answer modifications)
            - Cognitive friction (high edit counts or backspaces)
            - Motor-cognitive interference (erratic typing speed changes)
            
            Summarize the behavioral findings in 2 concise sentences for a medical professional."""
            
            try:
                bev_resp = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": bev_prompt}],
                    max_tokens=150
                )
                behavioral_summary = bev_resp.choices[0].message.content
            except Exception as e:
                logger.warning(f"Failed to generate behavioral summary: {e}")

        return jsonify({
            'success': True,
            'test_type': 'clinical_comprehensive',
            'summary': summary_text,
            'recommendations': recommendations,
            'behavioral_summary': behavioral_summary,
            'prediction': {
                'disease': predicted_disease,
                'confidence': round(confidence, 2),
                'severity': severity,
                'risk': risk_level,
                'explainability': xai_data
            },
            'domain_scores': domain_scores,
            'report': {
                'report_url': f'/test/reports/{pdf_filename}',
                'report_id': report_id,
                'filename': pdf_filename
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error analyzing clinical test: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@test_bp.route('/analyze-trends', methods=['POST'])
def analyze_cognitive_trends():
    """
    Analyze cognitive timeline trends and return clinical summary
    """
    try:
        data = request.json
        timeline = data.get('timeline', [])
        
        if not timeline or len(timeline) < 2:
            return jsonify({
                'success': True, 
                'summary': "Not enough data points yet. Keep taking assessments to track your progress over time.",
                'metrics': {}
            })
            
        # 1. Calculate clinical metrics
        # Memory, Attention, Language, Executive Function
        domains = ['memory', 'attention', 'language', 'executiveFunction']
        
        metrics = {domain: {
            'decline_rate': 0,
            'stability_index': 0,
            'sudden_drop': False,
            'drift': 0
        } for domain in domains}
        
        for domain in domains:
            scores = []
            for entry in timeline:
                val = entry.get('scores', {}).get(domain)
                if val is not None:
                    scores.append(val)
            
            if len(scores) >= 2:
                # Simple decline rate (latest - earliest)
                decline = scores[-1] - scores[0]
                metrics[domain]['decline_rate'] = round(decline, 2)
                
                # Stability (10 - Standard Deviation) - Higher is more stable
                std_dev = float(np.std(scores))
                metrics[domain]['stability_index'] = round(max(0, 10 - std_dev), 2)
                
                # Sudden Drop (check if any step decrease is > 2.5 on 10 scale)
                for i in range(1, len(scores)):
                    if scores[i-1] - scores[i] > 2.5:
                        metrics[domain]['sudden_drop'] = True
                        break
                
                # Drift (linear regression slope)
                x = np.arange(len(scores))
                slope, _ = np.polyfit(x, scores, 1)
                metrics[domain]['drift'] = round(float(slope), 3)

        # 2. Generate GROQ summary
        trend_history_str = ""
        for i, entry in enumerate(timeline):
            trend_history_str += f"- {entry['date']}: Memory: {entry['scores'].get('memory')}, Attention: {entry['scores'].get('attention')}, Language: {entry['scores'].get('language')}, Executive: {entry['scores'].get('executiveFunction')}\n"

        prompt = f"""As a clinical cognitive specialist, analyze this patient's assessment history and provide a professional, empathetic summary of their cognitive progression.
        
History:
{trend_history_str}

Calculated Metrics:
{json.dumps(metrics, indent=2)}

Include:
1. Overall trend (improving, stable, or declining).
2. Domain-specific highlights (e.g., "Your memory has declined by 12% over the last 30 days").
3. Identification of any sudden drops or concerning drifts.
4. Professional encouragement and next steps.

Limit summary to 5 concise sentences. Avoid technical jargon or diagnostic finality."""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500
        )
        summary = response.choices[0].message.content.strip()

        return jsonify({
            'success': True,
            'summary': summary,
            'metrics': metrics,
            'data_points': len(timeline)
        })
        
    except Exception as e:
        logger.error(f"❌ Error analyzing trends: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@test_bp.route('/reports/<filename>', methods=['GET'])
def get_test_report(filename):
    """
    Serve generated test PDF reports
    """
    try:
        reports_dir = Path(__file__).parent.parent / 'reports'
        file_path = reports_dir / filename
        
        if not file_path.exists():
            return jsonify({'error': 'Report not found'}), 404
        
        return send_file(file_path, mimetype='application/pdf', as_attachment=False)
        
    except Exception as e:
        logger.error(f"❌ Error serving report: {e}")
        return jsonify({'error': str(e)}), 500
