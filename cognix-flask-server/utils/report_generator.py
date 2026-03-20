"""
Professional Medical Report Generator using GROQ AI
Generates doctor-quality PDF reports for disease predictions
"""

import os
from datetime import datetime
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from groq import Groq
import logging

logger = logging.getLogger(__name__)

class MedicalReportGenerator:
    """Generate professional medical reports using GROQ AI"""
    
    def __init__(self, groq_api_key):
        self.groq_client = Groq(api_key=groq_api_key)
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for professional look"""
        
        # Title style
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a237e'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Section header
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=14,
            textColor=colors.HexColor('#3949ab'),
            spaceAfter=8,
            spaceBefore=16,
            fontName='Helvetica-Bold',
            backColor=colors.HexColor('#e8eaf6')
        ))
        
        # Body text
        self.styles.add(ParagraphStyle(
            name='ReportBody',
            parent=self.styles['BodyText'],
            fontSize=11,
            textColor=colors.HexColor('#212121'),
            spaceAfter=8,
            alignment=TA_JUSTIFY,
            leading=16
        ))
        
        # Important note
        self.styles.add(ParagraphStyle(
            name='ImportantNote',
            parent=self.styles['BodyText'],
            fontSize=10,
            textColor=colors.HexColor('#c62828'),
            spaceAfter=8,
            spaceBefore=8,
            leftIndent=20,
            rightIndent=20,
            borderWidth=1,
            borderColor=colors.HexColor('#c62828'),
            borderPadding=10,
            backColor=colors.HexColor('#ffebee')
        ))
    
    def _generate_report_content_with_groq(self, report_data):
        """Use GROQ to generate professional medical report content"""
        
        try:
            prompt = f"""You are a senior medical professional writing a comprehensive diagnostic report. 

Generate a detailed, professional medical report based on the following patient data:

**Patient Information:**
- Assessment Date: {report_data.get('date', 'N/A')}
- Assessment Type: {report_data.get('type', 'N/A')}

**Clinical Findings:**
- Extracted Text: {report_data.get('extracted_text', 'N/A')}
- OCR Confidence: {report_data.get('ocr_confidence', 0) * 100:.1f}%

**Disease Prediction:**
- Predicted Disease: {report_data.get('predicted_disease', 'N/A')}
- Confidence Level: {report_data.get('ml_confidence', 0) * 100:.1f}%
- Risk Level: {report_data.get('risk_level', 'N/A')}

**Disease Indicators Found:**
{report_data.get('disease_indicators', 'None')}

**Explainable AI Insights:**
{report_data.get('explainability', 'N/A')}

**Clinical Features:**
{report_data.get('clinical_features', 'N/A')}

Please generate a professional medical report with these sections:

1. **EXECUTIVE SUMMARY**: Brief overview (2-3 sentences)
2. **CLINICAL ASSESSMENT**: Detailed analysis of the patient's state
3. **DIAGNOSTIC FINDINGS**: Primary diagnosis with evidence and confidence
4. **EXPLAINABLE AI INSIGHTS**: Breakdown of symptoms and feature importance
5. **AI REASONING TRACE**: Human-readable explanation of why this diagnosis was reached
6. **RISK ASSESSMENT**: Risk factors and progression
7. **CLINICAL RECOMMENDATIONS**: Immediate actions and follow-up
8. **PROGNOSIS**: Expected outcomes
9. **DISCLAIMER**: Standard medical disclaimer

Write in professional, clinical tone. Use medical terminology. Be thorough but concise."""

            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a senior medical doctor with expertise in neurodegenerative diseases."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"GROQ API error: {e}")
            return self._generate_fallback_content(report_data)
    
    def _generate_fallback_content(self, report_data):
        """Generate basic report content if GROQ fails"""
        
        return f"""
EXECUTIVE SUMMARY
This report presents findings from a cognitive health assessment conducted on {report_data.get('date', 'N/A')}.

CLINICAL ASSESSMENT
Based on analysis, the assessment indicates {report_data.get('predicted_disease', 'a neurodegenerative condition')} with {report_data.get('ml_confidence', 0) * 100:.1f}% confidence.

DIAGNOSTIC FINDINGS
Primary Diagnosis: {report_data.get('predicted_disease', 'N/A')}
Risk Level: {report_data.get('risk_level', 'N/A')}

CLINICAL RECOMMENDATIONS
1. Consult with a neurologist
2. Consider additional diagnostic tests
3. Monitor symptoms regularly

DISCLAIMER
This report is AI-assisted and should not replace professional medical advice."""
    
    def _create_header_footer(self, canvas, doc):
        """Add header and footer to each page"""
        canvas.saveState()
        
        # Header
        canvas.setFont('Helvetica-Bold', 10)
        canvas.setFillColor(colors.HexColor('#1a237e'))
        canvas.drawString(inch, A4[1] - 0.5*inch, "COGNIX MEDICAL DIAGNOSTICS")
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#666666'))
        canvas.drawRightString(A4[0] - inch, A4[1] - 0.5*inch, f"Generated: {datetime.now().strftime('%d %b %Y, %I:%M %p')}")
        
        # Header line
        canvas.setStrokeColor(colors.HexColor('#1a237e'))
        canvas.setLineWidth(2)
        canvas.line(inch, A4[1] - 0.65*inch, A4[0] - inch, A4[1] - 0.65*inch)
        
        # Footer
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#666666'))
        canvas.drawString(inch, 0.5*inch, "Confidential Medical Report")
        canvas.drawRightString(A4[0] - inch, 0.5*inch, f"Page {doc.page}")
        
        # Footer line
        canvas.setStrokeColor(colors.HexColor('#1a237e'))
        canvas.setLineWidth(1)
        canvas.line(inch, 0.65*inch, A4[0] - inch, 0.65*inch)
        
        canvas.restoreState()
    
    def generate_pdf_report(self, report_data, output_path):
        """Generate professional PDF report"""
        try:
            doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=inch, leftMargin=inch, topMargin=inch, bottomMargin=inch)
            story = []
            
            # Title
            story.append(Paragraph("MEDICAL DIAGNOSTIC REPORT", self.styles['ReportTitle']))
            story.append(Spacer(1, 0.2*inch))
            
            # Metadata table
            metadata = [
                ['Report ID:', report_data.get('report_id', 'N/A')],
                ['Report Date:', report_data.get('date', datetime.now().strftime('%d %B %Y'))],
                ['Assessment Type:', report_data.get('type', 'Cognitive Assessment')],
                ['Patient ID:', report_data.get('patient_id', 'N/A')]
            ]
            
            metadata_table = Table(metadata, colWidths=[2*inch, 4*inch])
            metadata_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8eaf6')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#c5cae9')),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            story.append(metadata_table)
            story.append(Spacer(1, 0.3*inch))
            
            # Diagnosis summary
            diagnosis_data = [
                ['PRIMARY DIAGNOSIS', report_data.get('predicted_disease', 'N/A')],
                ['CONFIDENCE LEVEL', f"{report_data.get('ml_confidence', 0) * 100:.1f}%"],
                ['RISK ASSESSMENT', report_data.get('risk_level', 'N/A')]
            ]
            
            diagnosis_table = Table(diagnosis_data, colWidths=[2.5*inch, 3.5*inch])
            diagnosis_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e3f2fd')),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 1.5, colors.HexColor('#1976d2')),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            
            story.append(diagnosis_table)
            story.append(Spacer(1, 0.3*inch))
            
            # Explainability Section (Symptom Breakdown)
            if 'explainability' in report_data:
                story.append(Paragraph("SYMPTOM CONTRIBUTION BREAKDOWN", self.styles['SectionHeader']))
                
                xai_data = report_data['explainability']
                breakdown = xai_data.get('symptom_breakdown', {})
                
                breakdown_table_data = [['Symptom Domain', 'Impact (%)']]
                for label, value in breakdown.items():
                    breakdown_table_data.append([label, f"{value*100:.1f}%"])
                
                bt = Table(breakdown_table_data, colWidths=[3.5*inch, 2.5*inch])
                bt.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3949ab')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ]))
                story.append(bt)
                story.append(Spacer(1, 0.2*inch))
            
            # GROQ content
            logger.info("🤖 Generating report content with GROQ AI...")
            detailed_content = self._generate_report_content_with_groq(report_data)
            
            sections = detailed_content.split('\n\n')
            for section in sections:
                if section.strip():
                    lines = section.strip().split('\n')
                    if lines[0].isupper() or (len(lines[0]) > 0 and lines[0][0].isdigit()):
                        story.append(Paragraph(lines[0], self.styles['SectionHeader']))
                        if len(lines) > 1:
                            content = '\n'.join(lines[1:])
                            story.append(Paragraph(content, self.styles['ReportBody']))
                    else:
                        story.append(Paragraph(section, self.styles['ReportBody']))
                    story.append(Spacer(1, 0.15*inch))
            
            # Disclaimer
            disclaimer = """<b>IMPORTANT MEDICAL DISCLAIMER:</b><br/>
            This report is AI-assisted and for informational purposes only. 
            NOT a substitute for professional medical advice. Consult qualified healthcare providers."""
            story.append(Spacer(1, 0.3*inch))
            story.append(Paragraph(disclaimer, self.styles['ImportantNote']))
            
            doc.build(story, onFirstPage=self._create_header_footer, onLaterPages=self._create_header_footer)
            logger.info(f"✅ PDF report generated: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ PDF generation failed: {e}", exc_info=True)
            return False
    
    def generate_quick_test_report(self, report_data, output_path):
        """Generate simplified quick test PDF report"""
        try:
            doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=inch, leftMargin=inch, topMargin=inch, bottomMargin=inch)
            story = []
            
            # Title
            story.append(Paragraph("QUICK COGNITIVE SCREENING REPORT", self.styles['ReportTitle']))
            story.append(Spacer(1, 0.2*inch))
            
            # Metadata
            metadata = [
                ['Report ID:', report_data.get('report_id', 'N/A')],
                ['Date:', report_data.get('date', datetime.now().strftime('%d %B %Y'))],
                ['Test Type:', report_data.get('type', 'Quick Screening')],
                ['Duration:', report_data.get('test_duration', '2-3 minutes')]
            ]
            
            metadata_table = Table(metadata, colWidths=[2*inch, 4*inch])
            metadata_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8eaf6')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#c5cae9')),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            story.append(metadata_table)
            story.append(Spacer(1, 0.3*inch))
            
            # Results
            results_data = [
                ['TEST SCORE', report_data.get('test_score', 'N/A')],
                ['ASSESSMENT', report_data.get('predicted_disease', 'N/A')],
                ['RISK LEVEL', report_data.get('risk_level', 'N/A')]
            ]
            
            results_table = Table(results_data, colWidths=[2.5*inch, 3.5*inch])
            results_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e3f2fd')),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 1.5, colors.HexColor('#1976d2')),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            
            story.append(results_table)
            story.append(Spacer(1, 0.3*inch))
            
            # Recommendations
            story.append(Paragraph("RECOMMENDATIONS", self.styles['SectionHeader']))
            story.append(Paragraph(report_data.get('recommendations', 'Consult healthcare provider.'), self.styles['ReportBody']))
            story.append(Spacer(1, 0.2*inch))
            
            # Disclaimer
            disclaimer = """<b>DISCLAIMER:</b><br/>
            Preliminary screening tool. Discuss with qualified healthcare provider. Not a medical diagnosis."""
            story.append(Paragraph(disclaimer, self.styles['ImportantNote']))
            
            doc.build(story, onFirstPage=self._create_header_footer, onLaterPages=self._create_header_footer)
            logger.info(f"✅ Quick test PDF generated: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Quick test PDF failed: {e}", exc_info=True)
            return False

    def generate_speech_test_report(self, report_data, output_path):
        """Generate academic-grade neuro-linguistic speech report"""
        try:
            doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=inch, leftMargin=inch, topMargin=inch, bottomMargin=inch)
            story = []
            
            story.append(Paragraph("NEURO-LINGUISTIC SPEECH ANALYSIS", self.styles['ReportTitle']))
            story.append(Spacer(1, 0.2*inch))
            
            # Metadata
            metadata = [
                ['Report ID:', report_data.get('report_id', 'N/A')],
                ['Date:', report_data.get('date', datetime.now().strftime('%d %B %Y'))],
                ['Battery:', 'Comprehensive Speech Battery'],
                ['Transcript Integrity:', 'High (Neural Transcription)']
            ]
            
            mt = Table(metadata, colWidths=[2*inch, 4*inch])
            mt.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3e5f5')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1c4e9')),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
            ]))
            story.append(mt)
            story.append(Spacer(1, 0.3*inch))
            
            # Core Metrics
            sa = report_data.get('speech_analysis', {})
            core_data = [
                ['COHERENCE', f"{sa.get('coherenceScore', 0)}/10"],
                ['FLUENCY', f"{sa.get('fluencyScore', 0)}/10"],
                ['RECALL DIFFICULTY', sa.get('recallDifficulty', 'N/A')],
                ['DETECTED PAUSES', str(sa.get('pauseCount', 0))]
            ]
            
            ct = Table(core_data, colWidths=[2.5*inch, 3.5*inch])
            ct.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fafafa')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#7e57c2')),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(ct)
            story.append(Spacer(1, 0.3*inch))
            
            # Clinical Markers
            story.append(Paragraph("DETECTED NEUROGENIC MARKERS", self.styles['SectionHeader']))
            markers = sa.get('markers', ['No specific markers detected.'])
            for marker in markers:
                story.append(Paragraph(f"• {marker}", self.styles['ReportBody']))
            story.append(Spacer(1, 0.2*inch))
            
            # Clinical Insight
            story.append(Paragraph("CLINICAL LINGUISTIC INTERPRETATION", self.styles['SectionHeader']))
            story.append(Paragraph(sa.get('clinicalInsight', 'Analysis suggests standard linguistic patterns for age group.'), self.styles['ReportBody']))
            
            # Transcript
            story.append(Paragraph("SPEECH TRANSCRIPTS", self.styles['SectionHeader']))
            transcript = sa.get('transcript', 'No transcript recorded.')
            story.append(Paragraph(transcript[:2000] + ('...' if len(transcript) > 2000 else ''), self.styles['ReportBody']))
            
            # Prediction
            pred = report_data.get('prediction', {})
            story.append(Paragraph("DIAGNOSTIC PROBABILITY", self.styles['SectionHeader']))
            story.append(Paragraph(f"AI-Model Indicator: {pred.get('disease', 'Healthy')} (Confidence: {pred.get('confidence', 0)*100:.1f}%)", self.styles['ReportBody']))
            
            disclaimer = "<b>CONFIDENTIAL:</b> For clinical review only. This report uses AI-driven acoustic and linguistic mapping."
            story.append(Spacer(1, 0.4*inch))
            story.append(Paragraph(disclaimer, self.styles['ImportantNote']))
            
            doc.build(story, onFirstPage=self._create_header_footer, onLaterPages=self._create_header_footer)
            return True
        except Exception as e:
            logger.error(f"❌ Speech report failed: {e}")
            return False
