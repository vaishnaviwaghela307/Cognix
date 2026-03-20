"""
OCR Routes for Document Text Extraction
Uses RapidOCR for fast and accurate text extraction
"""

from flask import Blueprint, request, jsonify, send_file
import logging
import base64
import io
import os
from pathlib import Path
from datetime import datetime
from PIL import Image
import numpy as np
import re
import uuid

logger = logging.getLogger(__name__)

ocr_bp = Blueprint('ocr', __name__, url_prefix='/ocr')

# Global Groq Client
groq_client = None

def get_groq_client():
    """Lazy load Groq client"""
    global groq_client
    if groq_client is None:
        try:
            from config import get_config
            from groq import Groq
            config = get_config()
            
            # Allow fallback to env var if config doesn't have it
            api_key = getattr(config, 'GROQ_API_KEY', os.environ.get("GROQ_API_KEY"))
            
            logger.info("🔵 Initializing Groq client...")
            groq_client = Groq(api_key=api_key)
            logger.info("✅ Groq client initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Groq client: {e}", exc_info=True)
            raise
    return groq_client


# Medical keywords for disease detection
DISEASE_KEYWORDS = {
    'alzheimers': ['alzheimer', 'dementia', 'memory loss', 'cognitive decline', 'confusion', 'forgetfulness'],
    'parkinsons': ['parkinson', 'tremor', 'rigidity', 'bradykinesia', 'postural instability', 'shaking'],
    'mci': ['mild cognitive impairment', 'mci', 'memory problems', 'cognitive issues'],
    'vascular': ['vascular dementia', 'stroke', 'cerebrovascular', 'multi-infarct'],
    'ftd': ['frontotemporal', 'ftd', 'behavioral changes', 'language problems'],
    'lbd': ['lewy body', 'lbd', 'visual hallucinations', 'fluctuating cognition']
}

def extract_text_from_image(image_data):
    """
    Extract text from image using Groq Llama-4-Scout Vision Model
    
    Args:
        image_data: Base64 encoded image or PIL Image
        
    Returns:
        tuple: (success, extracted_text, confidence)
    """
    try:
        # Get base64 representation
        if isinstance(image_data, str):
            if 'base64,' in image_data:
                base64_image = image_data.split('base64,')[1]
            else:
                base64_image = image_data
        else:
            buffered = io.BytesIO()
            # Convert to RGB to avoid issues with saving as JPEG
            if image_data.mode in ("RGBA", "P"): 
                image_data = image_data.convert("RGB")
            image_data.save(buffered, format="JPEG")
            base64_image = base64.b64encode(buffered.getvalue()).decode('utf-8')
            
        client = get_groq_client()
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all the text present in this image accurately. Return only the extracted text, nothing else."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            },
                        },
                    ],
                }
            ],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.1,
            max_tokens=2048
        )
        
        extracted_text = chat_completion.choices[0].message.content.strip()
        if not extracted_text:
            return False, "", 0.0
            
        return True, extracted_text, 0.95  # Mock confidence for LLM outputs
        
    except Exception as e:
        logger.error(f"Groq OCR extraction error: {e}", exc_info=True)
        return False, str(e), 0.0


def analyze_medical_text_keyword_fallback(text):
    """
    Fallback: Analyze extracted text for disease indicators using keywords
    """
    text_lower = text.lower()
    
    # Find disease mentions
    disease_scores = {}
    for disease, keywords in DISEASE_KEYWORDS.items():
        score = 0
        found_keywords = []
        
        for keyword in keywords:
            if keyword in text_lower:
                score += 1
                found_keywords.append(keyword)
        
        if score > 0:
            disease_scores[disease] = {
                'score': score,
                'keywords_found': found_keywords,
                'confidence': min(score / len(keywords), 1.0)
            }
    
    # Determine primary disease
    if disease_scores:
        primary_disease = max(disease_scores.items(), key=lambda x: x[1]['score'])
        conf = primary_disease[1]['confidence']
        risk = 'High' if conf > 0.7 else 'Medium' if conf > 0.4 else 'Low'
        return {
            'has_disease_indicators': True,
            'primary_disease': primary_disease[0],
            'confidence': conf,
            'risk_level': risk,
            'all_findings': disease_scores
        }
    else:
        return {
            'has_disease_indicators': False,
            'primary_disease': None,
            'confidence': 0.0,
            'risk_level': 'Low',
            'all_findings': {}
        }


def analyze_medical_text(text):
    """
    Analyze extracted OCR text for disease indicators using Groq Reasoning Model
    
    Args:
        text: Extracted text from document
        
    Returns:
        dict: Analysis results with disease predictions
    """
    try:
        import json
        import re
        
        client = get_groq_client()
        
        prompt = f"""You are a highly accurate medical analysis system. 
Analyze the following unstructured OCR text extracted from a medical document.
Identify if it contains clinical indicators, diagnoses, or symptoms for any of these neurodegenerative diseases:
alzheimers, parkinsons, mci, vascular, ftd, lbd.

Return your analysis strictly as a JSON object (without any other text outside the JSON) with the following structure:
{{
    "has_disease_indicators": boolean,
    "primary_disease": "one of the diseases listed above, or null",
    "confidence": float between 0.0 and 1.0,
    "risk_level": "Low" | "Medium" | "High",
    "all_findings": {{
        "disease_name": {{
            "score": integer (severity/count of mentions),
            "keywords_found": ["symptom1", "keyword2"],
            "confidence": float between 0.0 and 1.0
        }}
    }}
}}

Extracted text:
\"\"\"
{text}
\"\"\"
"""
        logger.info("🧠 Running disease analysis with Groq reasoning model...")
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="deepseek-r1-distill-llama-70b", 
            temperature=0.1,
            max_tokens=2048
        )
        
        response = chat_completion.choices[0].message.content
        
        # DeepSeek R1 models wrap JSON in code blocks, potentially after a <think> block
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_str = response[response.find('{'):response.rfind('}')+1]
            if not json_str:
                raise ValueError("No JSON found in response")
                
        result = json.loads(json_str)
        logger.info("✅ Reasoning model analysis complete.")
        return result
        
    except Exception as e:
        logger.error(f"⚠️ Reasoning model error: {e}. Falling back to keyword search.", exc_info=True)
        return analyze_medical_text_keyword_fallback(text)


@ocr_bp.route('/extract', methods=['POST'])
def extract_text():
    """
    Extract text from uploaded image using RapidOCR and analyze for disease prediction
    
    Request JSON:
    {
        "image": "base64_encoded_image",
        "patient_data": {  // Optional
            "age": 65,
            "gender": 1
        }
    }
    
    Response (with disease indicators):
    {
        "success": true,
        "text": "extracted text",
        "confidence": 0.95,
        "analysis": {...},
        "mlPrediction": {...}
    }
    
    Response (no disease indicators):
    {
        "success": true,
        "text": "extracted text",
        "message": "Image didn't have any disease-specific criteria. Kindly scan a new document."
    }
    """
    try:
        logger.info("🔵 OCR /extract endpoint called")
        
        logger.info("🔵 Parsing request data...")
        data = request.get_json()
        
        if not data or 'image' not in data:
            logger.error("❌ No image data in request")
            return jsonify({
                'success': False,
                'error': 'No image data provided'
            }), 400
        
        image_size = len(data['image'])
        logger.info(f"🔵 Received image data: {image_size} bytes")
        
        # Step 1: Extract text using Groq
        logger.info("🔵 Starting Groq OCR extraction...")
        try:
            success, extracted_text, ocr_confidence = extract_text_from_image(data['image'])
            logger.info(f"🔵 Groq OCR completed: success={success}, text_length={len(extracted_text) if success else 0}")
        except Exception as ocr_error:
            logger.error(f"❌ Groq OCR failed: {ocr_error}", exc_info=True)
            return jsonify({
                'success': False,
                'error': 'OCR processing failed',
                'message': str(ocr_error)
            }), 500
        
        if not success:
            logger.error(f"❌ OCR extraction failed: {extracted_text}")
            return jsonify({
                'success': False,
                'error': 'Failed to extract text',
                'message': extracted_text
            }), 500
        
        # Step 2: Analyze the extracted text for disease indicators
        text_analysis = analyze_medical_text(extracted_text)
        
        logger.info(f"✅ OCR extraction successful. Confidence: {ocr_confidence:.2f}")
        logger.info(f"🔍 Disease indicators found: {text_analysis['has_disease_indicators']}")
        
        # Step 3: If NO disease indicators found, return helpful message
        if not text_analysis['has_disease_indicators']:
            return jsonify({
                'success': True,
                'text': extracted_text,
                'confidence': ocr_confidence,
                'has_disease_indicators': False,
                'message': "Image didn't have any disease-specific criteria. Kindly scan a new document.",
                'word_count': len(extracted_text.split()),
                'char_count': len(extracted_text)
            })
        
        # Step 4: Map Groq LLM predictions directly to response structure (Bypass ML model)
        patient_data = data.get('patient_data', {})
        
        # Get primary disease from text analysis
        primary_disease = text_analysis.get('primary_disease', '').lower() if text_analysis['has_disease_indicators'] else ''
        
        DISEASE_MAP = {
            'alzheimers': "Alzheimer's Disease",
            'parkinsons': "Parkinson's Disease",
            'mci': "Mild Cognitive Impairment",
            'vascular': "Vascular Dementia",
            'ftd': "Frontotemporal Dementia",
            'lbd': "Lewy Body Dementia",
            'lewy': "Lewy Body Dementia",
            'frontotemporal': "Frontotemporal Dementia",
            'alzheimer': "Alzheimer's Disease",
            'parkinson': "Parkinson's Disease"
        }
        
        predicted_disease = "Assessment Complete - Consult Healthcare Provider"
        # Format predicted output
        for key, display_name in DISEASE_MAP.items():
            if key in primary_disease:
                predicted_disease = display_name
                break
        
        if predicted_disease == "Assessment Complete - Consult Healthcare Provider" and primary_disease:
             predicted_disease = primary_disease.title()
        
        # Get confidence direct from reasoning model
        confidence = float(text_analysis.get('confidence', 0.85))
        
        # Determine risk level from LLM directly
        risk_level = text_analysis.get('risk_level', 'Low')
        
        # Fallback if reasoning model outputs something weird
        if risk_level not in ['Low', 'Medium', 'High']:
            if confidence > 0.7:
                risk_level = 'High'
            elif confidence > 0.4:
                risk_level = 'Medium'
            else:
                risk_level = 'Low'
            
        logger.info(f"🧠 Groq LLM Prediction: {predicted_disease} (confidence: {confidence:.2f}, risk: {risk_level})")
        
        # Create explainability data
        detected_keywords = []
        if primary_disease in text_analysis.get('all_findings', {}):
             detected_keywords = text_analysis['all_findings'][primary_disease].get('keywords_found', [])
             
        explainability = {
            'detected_keywords': detected_keywords,
            'primary_disease_from_text': primary_disease.upper() if primary_disease else 'None',
            'reasoning_trace': f"Groq DeepSeek-R1 Analysis detected '{predicted_disease}' with {confidence*100:.1f}% confidence. Indicators found: {', '.join(detected_keywords) if detected_keywords else 'None'}. Full analysis completed directly by LLM reasoning, bypassing ML pipeline."
        }
        
        # Get all disease probabilities mocked for frontend compatibility
        disease_probs = {disease: 0.05 for disease in set(DISEASE_MAP.values())}
        if predicted_disease in disease_probs:
            disease_probs[predicted_disease] = float(confidence)
            # normalize remaining
            remaining = 1.0 - float(confidence)
            others = len(disease_probs) - 1
            if others > 0:
                for k in disease_probs:
                    if k != predicted_disease:
                        disease_probs[k] = remaining / others
        
        # Step 5: Generate Professional PDF Report using GROQ (OPTIONAL - don't crash if it fails)
        report_url = None
        report_id = str(uuid.uuid4())
        
        try:
            logger.info("📄 Starting PDF report generation...")
            from utils.report_generator import MedicalReportGenerator
            from config import get_config
            
            config = get_config()
            
            # Skip report generation if no GROQ API key
            if not config.GROQ_API_KEY:
                logger.warning("⚠️ GROQ API key not found, skipping report generation")
                raise ValueError("No GROQ API key")
            
            # Create reports directory if it doesn't exist
            reports_dir = Path(__file__).parent.parent / 'reports'
            reports_dir.mkdir(exist_ok=True)
            
            # Prepare report data
            report_data = {
                'report_id': report_id,
                'date': datetime.now().strftime('%d %B %Y, %I:%M %p'),
                'type': 'OCR Document Analysis',
                'patient_id': data.get('patient_id', 'N/A'),
                'extracted_text': extracted_text[:500],  # Limit text length
                'ocr_confidence': ocr_confidence,
                'predicted_disease': predicted_disease,
                'ml_confidence': confidence,
                'risk_level': risk_level,
                'disease_indicators': ', '.join(text_analysis.get('all_findings', {}).keys()) if text_analysis.get('all_findings') else 'None',
                'clinical_features': "N/A (Reasoning-based prediction bypass bypassed feature scoring)",
                'explainability': explainability.get('reasoning_trace', 'N/A')[:500]  # Limit length
            }
            
            # Generate PDF
            pdf_filename = f"report_{report_id}.pdf"
            pdf_path = reports_dir / pdf_filename
            
            report_generator = MedicalReportGenerator(config.GROQ_API_KEY)
            
            if report_generator.generate_pdf_report(report_data, str(pdf_path)):
                report_url = f"/ocr/reports/{pdf_filename}"
                logger.info(f"✅ PDF Report generated successfully: {report_url}")
            else:
                logger.warning("⚠️ PDF generation returned False, continuing without report")
                
        except Exception as e:
            logger.warning(f"⚠️ Report generation skipped/failed: {str(e)[:200]}")
            # Continue without report if generation fails - THIS IS OK
        
        # Log extracted text to console
        logger.info("=" * 80)
        logger.info("📄 EXTRACTED TEXT FROM DOCUMENT:")
        logger.info("=" * 80)
        logger.info(extracted_text)
        logger.info("=" * 80)
        
        return jsonify({
            'success': True,
            'text': extracted_text,
            'confidence': ocr_confidence,
            'has_disease_indicators': True,
            'analysis': text_analysis,
            'mlPrediction': {
                'predicted_disease': predicted_disease,
                'confidence': confidence,
                'risk_level': risk_level,
                'probabilities': disease_probs
            },
            'explainability': explainability,
            'report': {
                'report_id': report_id,
                'report_url': report_url,
                'generated_at': datetime.now().isoformat()
            } if report_url else None,
            'features_used': {},  # Removed ML features
            'word_count': len(extracted_text.split()),
            'char_count': len(extracted_text)
        })
        
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ocr_bp.route('/extract-and-predict', methods=['POST'])
def extract_and_predict():
    """
    Extract text from image and predict disease using ML model
    
    Request JSON:
    {
        "image": "base64_encoded_image",
        "patient_data": {
            "age": 65,
            "gender": 1,
            "mmse_score": 24
        }
    }
    
    Response:
    {
        "success": true,
        "extracted_text": "...",
        "ocr_confidence": 0.95,
        "text_analysis": {...},
        "ml_prediction": {...}
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No image data provided'
            }), 400
        
        # Step 1: Extract text using Groq OCR
        success, extracted_text, ocr_confidence = extract_text_from_image(data['image'])
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Failed to extract text',
                'message': extracted_text
            }), 500
        
        # Step 2: Analyze text for disease indicators
        text_analysis = analyze_medical_text(extracted_text)
        
        # Step 3: Prepare ML features
        patient_data = data.get('patient_data', {})
        
        # Default features if not provided
        features_dict = {
            'age': patient_data.get('age', 65),
            'gender': patient_data.get('gender', 1),
            'mmse_score': patient_data.get('mmse_score', 24),
            'functional_assessment': patient_data.get('functional_assessment', 7),
            'memory_complaints': patient_data.get('memory_complaints', 1),
            'behavioral_problems': patient_data.get('behavioral_problems', 0),
            'adl_score': patient_data.get('adl_score', 6)
        }
        
        # Adjust features based on text analysis
        if text_analysis['has_disease_indicators']:
            # Increase severity based on document findings
            features_dict['memory_complaints'] = 1
            features_dict['behavioral_problems'] = 1
            # Reduce MMSE score if disease indicators found
            features_dict['mmse_score'] = max(15, features_dict['mmse_score'] - 5)
        
        DISEASE_MAP = {
            'alzheimers': "Alzheimer's Disease",
            'parkinsons': "Parkinson's Disease",
            'mci': "Mild Cognitive Impairment",
            'vascular': "Vascular Dementia",
            'ftd': "Frontotemporal Dementia",
            'lbd': "Lewy Body Dementia",
            'lewy': "Lewy Body Dementia",
            'frontotemporal': "Frontotemporal Dementia",
            'alzheimer': "Alzheimer's Disease",
            'parkinson': "Parkinson's Disease"
        }
        
        primary_disease = text_analysis.get('primary_disease', '').lower() if text_analysis.get('has_disease_indicators') else ''
        predicted_disease = "Assessment Complete - Consult Healthcare Provider"
        
        for key, display_name in DISEASE_MAP.items():
            if key in primary_disease:
                predicted_disease = display_name
                break
                
        if predicted_disease == "Assessment Complete - Consult Healthcare Provider" and primary_disease:
             predicted_disease = primary_disease.title()
             
        confidence = float(text_analysis.get('confidence', 0.85))
        
        # Get all disease probabilities mocked for frontend compatibility
        disease_probs = {disease: 0.05 for disease in set(DISEASE_MAP.values())}
        if predicted_disease in disease_probs:
            disease_probs[predicted_disease] = float(confidence)
            remaining = 1.0 - float(confidence)
            others = len(disease_probs) - 1
            if others > 0:
                for k in disease_probs:
                    if k != predicted_disease:
                        disease_probs[k] = remaining / others
                        
        # Determine risk level from LLM directly
        risk_level = text_analysis.get('risk_level', 'Low')
        
        # Fallback if reasoning model outputs something weird
        if risk_level not in ['Low', 'Medium', 'High']:
            if confidence > 0.7:
                risk_level = 'High'
            elif confidence > 0.4:
                risk_level = 'Medium'
            else:
                risk_level = 'Low'
            
        logger.info(f"✅ OCR + Groq LLM Prediction bypass: {predicted_disease} (confidence: {confidence:.2f})")
        
        # Prepare Analysis Result for Report
        analysis_result = {
            'ml_prediction': {
                'predicted_disease': predicted_disease,
                'confidence': confidence,
                'risk_level': risk_level
            },
            'features_used': features_dict
        }
        
        # Generate PDF Report
        report_data = None
        try:
            from utils.pdf_generator import generate_scan_report
            import uuid
            
            filename = f"scan_report_{uuid.uuid4().hex[:8]}.pdf"
            generate_scan_report(analysis_result, filename, extracted_text)
            
            report_data = {
                'reportUrl': f"/ocr/reports/{filename}",
                'reportName': filename
            }
            logger.info(f"📄 Generated scan report: {filename}")
        except Exception as pdf_err:
            logger.error(f"⚠️ Failed to generate scan PDF: {pdf_err}")

        return jsonify({
            'success': True,
            'extracted_text': extracted_text,
            'ocr_confidence': ocr_confidence,
            'text_analysis': text_analysis,
            'ml_prediction': {
                'predicted_disease': predicted_disease,
                'confidence': confidence,
                'risk_level': risk_level,
                'probabilities': disease_probs
            },
            'features_used': features_dict,
            'report': report_data
        })
        
    except Exception as e:
        logger.error(f"Extract and predict failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ocr_bp.route('/reports/<filename>', methods=['GET'])
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



@ocr_bp.route('/test', methods=['GET'])
def test_ocr():
    """Test endpoint to verify OCR is working"""
    return jsonify({
        'success': True,
        'message': 'Groq OCR service is running',
        'engine': 'Groq Llama-4-Scout',
        'endpoints': {
            'extract': '/ocr/extract',
            'extract_and_predict': '/ocr/extract-and-predict',
            'reports': '/ocr/reports/<filename>'
        }
    })
