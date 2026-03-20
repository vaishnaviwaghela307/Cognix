"""
Caregiver Assessment Controller
Converts caregiver observations into structured symptom signals using GROQ AI
"""

from flask import jsonify, request
import logging
import json
from groq import Groq
import os

logger = logging.getLogger(__name__)

class CaregiverController:
    """
    Controller for processing caregiver observations:
    1. Takes daily logs (forgetfulness, wandering, mood, aggression, confusion)
    2. Uses GROQ to analyze notes and numeric data
    3. Returns structured symptom signals for the diagnosis pipeline
    """
    
    @staticmethod
    def process_observation():
        """
        Endpoint: POST /api/process-caregiver-observation
        Processes raw observation data using GROQ
        """
        try:
            from config import get_config
            config = get_config()
            
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
                
            observations = data.get('observations', {})
            notes = data.get('notes', '')
            
            # Initialize GROQ client
            client = Groq(api_key=config.GROQ_API_KEY)
            
            # Construct prompt for GROQ
            prompt = f"""
            Analyze the following caregiver observations for a patient with potential cognitive decline.
            Convert these observations into structured clinical signals.
            
            Numeric Observations (Scale 0-5):
            - Forgetfulness: {observations.get('forgetfulness', 0)}
            - Wandering: {observations.get('wandering', 0)}
            - Mood Swings: {observations.get('moodSwings', 0)}
            - Aggression: {observations.get('aggression', 0)}
            - Confusion: {observations.get('confusion', 0)}
            
            Caregiver Notes:
            "{notes}"
            
            Please provide a JSON output with the following structure:
            {{
                "symptom_signals": {{
                    "cognitive_stability": float (0-1, 1 is stable),
                    "behavioral_risk": float (0-1, 1 is high risk),
                    "social_engagement": float (0-1, 1 is high),
                    "daily_functioning": float (0-1, 1 is high)
                }},
                "ai_summary": "Short 1-2 sentence summary of caregiver input",
                "detected_patterns": ["list of identified clinical patterns"],
                "urgency_level": "low/medium/high/critical"
            }}
            
            Return ONLY the JSON.
            """
            
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a clinical AI assistant specializing in dementia and Alzheimer's care. Your task is to convert subjective caregiver observations into objective clinical signals."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            structured_data = json.loads(response.choices[0].message.content)
            
            return jsonify({
                'success': True,
                'structuredSignals': structured_data
            })
            
        except Exception as e:
            logger.error(f"Error processing caregiver observation: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    @staticmethod
    def integrate_caregiver_data(domain_scores, caregiver_signals):
        """
        Helper to merge caregiver signals with clinical domain scores
        """
        # Caregiver signals influence the domain scores
        # Example: high behavioral risk increases neuropsychiatric score
        
        c_signals = caregiver_signals.get('symptom_signals', {})
        
        # Neuropsychiatric adjustment (influenced by behavioral risk and mood)
        behavior_risk = c_signals.get('behavioral_risk', 0)
        domain_scores['neuropsychiatric'] = min(10, domain_scores['neuropsychiatric'] + (behavior_risk * 2))
        
        # Cognitive adjustment (influenced by cognitive stability)
        cog_stability = c_signals.get('cognitive_stability', 1)
        domain_scores['cognitive'] = min(10, domain_scores['cognitive'] + ((1 - cog_stability) * 3))
        
        return domain_scores
