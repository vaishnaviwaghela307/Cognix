"""
Dynamic Question Generation Service
Uses GROQ AI to generate unique clinical assessment questions
"""

import json
import logging
from groq import Groq

logger = logging.getLogger(__name__)


class QuestionGenerator:
    """Generate dynamic clinical assessment questions using GROQ AI"""
    
    @staticmethod
    def generate_questions(api_key, specific_domain=None):
        """
        Generate dynamic questions using GROQ AI
        
        Args:
            api_key: GROQ API key
            specific_domain: Optional specific domain to generate for
        
        Returns:
            dict: Generated questions for each domain
        """
        
        # Initialize GROQ client
        client = Groq(api_key=api_key)
        
        # ML Features context for question generation
        ml_features_context = """
        The ML model uses these 31 features to predict neurodegenerative diseases:
        - visual_hallucination_freq, motor_symptom_severity, cognitive_decline_rate
        - memory_loss_score, age, attention_span_score, cortical_thickness
        - gait_speed, short_term_memory_score, reaction_time, problem_solving_score
        - ventricle_size_index, white_matter_integrity, fine_motor_control
        - brainstem_integrity, corpus_callosum_thickness, hand_movement_accuracy
        - brain_iron_concentration, facial_expression_score, decision_making_score
        - parietal_lobe_volume, synaptic_density_index, glucose_metabolism_rate
        - neuro_transmitter_level, neuronal_activity_rate, balance_stability_score
        - neuroinflammation_index, temporal_lobe_volume, oxygenation_level
        - protein_aggregation_level, neural_connectivity_strength
        
        Questions should elicit responses that help assess these features.
        """
        
        # Domain definitions
        domains = {
            'demographic': {
                'title': 'Patient Demographics',
                'focus': 'Age-related confusion, temporal orientation, self-awareness',
                'features': 'age, cognitive awareness, temporal confusion'
            },
            'cognitive': {
                'title': 'Cognitive Spectrum',
                'focus': 'Memory, executive function, problem-solving, attention, decision-making',
                'features': 'memory_loss_score, cognitive_decline_rate, attention_span_score, problem_solving_score, decision_making_score, short_term_memory_score'
            },
            'motoric': {
                'title': 'Motoric Functions',
                'focus': 'Movement, tremors, balance, coordination, gait, muscle control',
                'features': 'motor_symptom_severity, gait_speed, fine_motor_control, hand_movement_accuracy, balance_stability_score, reaction_time, facial_expression_score'
            },
            'neuropsychiatric': {
                'title': 'Neuro-Psychiatric Markers',
                'focus': 'Hallucinations, sleep disturbances, alertness changes, perceptual issues',
                'features': 'visual_hallucination_freq, sleep_behavior, alertness_fluctuation, perceptual_disturbances'
            }
        }
        
        def generate_domain_questions(domain_name, domain_info):
            """Generate 4 questions for a specific domain using GROQ"""
            
            prompt = f"""You are a medical AI assistant specializing in neurodegenerative disease assessment.

Generate EXACTLY 4 clinical assessment questions for the "{domain_info['title']}" domain.

DOMAIN FOCUS: {domain_info['focus']}
RELEVANT ML FEATURES: {domain_info['features']}

{ml_features_context}

REQUIREMENTS:
1. Questions must be clear, specific, and answerable with text responses
2. Questions should elicit detailed responses that reveal symptom severity
3. Avoid yes/no questions - ask for explanations and examples
4. Questions should help assess the ML features listed above
5. Use simple, patient-friendly language
6. Each question should target different aspects of the domain
7. Questions should encourage responses containing keywords like:
   - Severity: always, constantly, frequently, sometimes, rarely, never
   - Symptoms: forget, confused, difficult, problem, trouble, shaking, tremor, stiff, balance, hallucination
   - Cognitive: memory, attention, concentration, thinking, understanding
   - Motoric: movement, walking, coordination, weakness, slowness
   - Neuropsychiatric: sleep, dreams, visions, sounds, alertness

Return ONLY a JSON object with a "questions" array containing exactly 4 questions.
Example: {{"questions": ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]}}

Generate 4 unique, clinically relevant questions now:"""

            try:
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a medical AI that generates clinical assessment questions. Always respond with valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.9,  # Higher temperature for more variety
                    max_tokens=500,
                    response_format={"type": "json_object"}
                )
                
                content = response.choices[0].message.content
                
                # Parse JSON response
                parsed = json.loads(content)
                questions = parsed.get('questions', [])
                
                # Ensure we have exactly 4 questions
                if len(questions) >= 4:
                    return questions[:4]
                else:
                    return get_default_questions(domain_name)
                    
            except Exception as e:
                logger.error(f"GROQ API error for {domain_name}: {str(e)}")
                return get_default_questions(domain_name)
        
        def get_default_questions(domain_name):
            """Fallback default questions if GROQ fails"""
            defaults = {
                'demographic': [
                    'What is your current age?',
                    'Do you ever feel confused about your age or birth year?',
                    'Has anyone corrected you when you stated your age?',
                    'Do age-related details confuse you sometimes?'
                ],
                'cognitive': [
                    'Do you forget recent conversations or events? Please explain.',
                    'Do you find it difficult to plan or solve daily problems?',
                    'Have you felt confused about time, date, or place?',
                    'Are familiar daily tasks harder than before?'
                ],
                'motoric': [
                    'Have you noticed shaking or tremors in your hands or legs?',
                    'Do your muscles feel stiff or rigid?',
                    'Do you feel slower while walking or doing tasks?',
                    'Do you face balance problems or difficulty walking?'
                ],
                'neuropsychiatric': [
                    'Have you seen things that others say are not actually there?',
                    'Have you heard sounds or voices without a real source?',
                    'Do you move or talk during sleep while dreaming?',
                    'Do you experience sudden changes in alertness or awareness?'
                ]
            }
            return defaults.get(domain_name, ['Question 1?', 'Question 2?', 'Question 3?', 'Question 4?'])
        
        # Generate questions
        questions_result = {}
        
        if specific_domain:
            # Generate for specific domain only
            if specific_domain in domains:
                questions_result[specific_domain] = generate_domain_questions(
                    specific_domain, 
                    domains[specific_domain]
                )
            else:
                raise ValueError(f'Invalid domain. Must be one of: {list(domains.keys())}')
        else:
            # Generate for all domains
            for domain_name, domain_info in domains.items():
                questions_result[domain_name] = generate_domain_questions(
                    domain_name,
                    domain_info
                )
        
        return questions_result
