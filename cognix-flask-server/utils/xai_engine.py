"""
Explainable AI (XAI) Engine
Calculates feature contributions and generates reasoning traces using GROQ
"""

import numpy as np
import logging
from groq import Groq

logger = logging.getLogger(__name__)

class XAIEngine:
    """
    Engine to provide explainability for ML predictions
    """
    
    @staticmethod
    def calculate_contributions(model, features, features_scaled):
        """
        Calculate local feature contributions using a heuristic for tree-based models
        """
        try:
            # 1. Feature Importance (Local Heuristic)
            global_importances = model.feature_importances_ if hasattr(model, 'feature_importances_') else np.ones(len(features)) / len(features)
            
            # Normalize scaled features to positive contributions for visualization
            # We use absolute value of (scaled_value * global_importance)
            contributions = np.abs(features_scaled[0] * global_importances)
            total_contrib = sum(contributions)
            if total_contrib > 0:
                contributions = contributions / total_contrib
            
            # Map features to importance
            feature_importance_map = []
            for i, f in enumerate(features):
                feature_importance_map.append({
                    'feature': f.replace('_', ' ').title(),
                    'importance': float(contributions[i])
                })
            
            # Sort and take top 10
            top_features = sorted(feature_importance_map, key=lambda x: x['importance'], reverse=True)[:10]
            
            # 2. Symptom Contribution Breakdown (Categorized)
            categories = {
                'Memory & Hippocampal': ['memory', 'hippocampus', 'orientation'],
                'Language & Speech': ['language', 'speech'],
                'Motor & Coordination': ['motor', 'gait', 'tremor', 'hand', 'coordination', 'muscle', 'balance', 'reaction', 'facial'],
                'Executive Function': ['executive', 'attention', 'processing', 'reasoning', 'problem', 'decision'],
                'Brain Structure': ['volume', 'thickness', 'density', 'integrity', 'connectivity', 'ventricle', 'lobe', 'amygdala', 'callosum', 'synaptic'],
                'Biomarkers & Health': ['age', 'metabolism', 'oxygenation', 'activity', 'inflammation', 'protein', 'transmitter', 'iron', 'stress', 'vascular']
            }
            
            category_scores = {cat: 0.0 for cat in categories}
            for i, f in enumerate(features):
                for cat, keywords in categories.items():
                    if any(kw in f.lower() for kw in keywords):
                        category_scores[cat] += contributions[i]
                        break
            
            # Normalize categories
            total_cat_score = sum(category_scores.values())
            if total_cat_score > 0:
                category_breakdown = {cat: float(score / total_cat_score) for cat, score in category_scores.items() if score > 0}
            else:
                category_breakdown = {cat: 1.0/len(categories) for cat in categories}
                
            return category_breakdown, top_features
            
        except Exception as e:
            logger.error(f"Error calculating contributions: {e}")
            return {}, []

    @staticmethod
    def generate_reasoning_trace(api_key, disease, confidence, breakdown, top_features):
        """
        Generate human-readable explanation using GROQ
        """
        try:
            client = Groq(api_key=api_key)
            
            # Format breakdown for prompt
            breakdown_str = "\n".join([f"- {k}: {v*100:.1f}%" for k, v in breakdown.items()])
            features_str = "\n".join([f"- {f['feature']}: {f['importance']*100:.1f}%" for f in top_features])
            
            prompt = f"""
            As a medical AI specialist, explain the reasoning behind this neurodegenerative disease prediction.
            
            **Prediction:** {disease}
            **Confidence:** {confidence*100:.1f}%
            
            **Symptom Contribution Breakdown:**
            {breakdown_str}
            
            **Top Influential Features:**
            {features_str}
            
            Provide a concise, professional, and patient-friendly explanation in Markdown.
            Focus on WHY these symptoms led to the {disease} prediction.
            Be empathetic but objective. Use 3-4 short paragraphs.
            Include a 'Reasoning Trace' section that explicitly connects the high-impact symptoms to the clinical markers of the disease.
            """
            
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are an expert neurologist. Explain diagnostic results clearly to patients and doctors using evidence-based reasoning."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=800
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating GROQ explanation: {e}")
            return f"The prediction of {disease} ({confidence*100:.1f}%) is primarily driven by abnormalities in the detected symptom patterns. Further clinical evaluation by a specialist is recommended."
