from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as ReportLabImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime
import os
from pathlib import Path

class PDFGenerator:
    def __init__(self, filename):
        self.filename = filename
        self.styles = getSampleStyleSheet()
        self.create_custom_styles()
        self.story = []
        
        # Ensure reports directory exists
        self.reports_dir = Path(__file__).parent.parent / 'reports'
        self.reports_dir.mkdir(exist_ok=True)
        self.filepath = self.reports_dir / filename

    def create_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name='CognixTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#6366F1'), # Indigo
            alignment=TA_CENTER,
            spaceAfter=20
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1E293B'), # Slate
            spaceBefore=15,
            spaceAfter=10,
            borderPadding=5,
            borderColor=colors.HexColor('#E2E8F0'),
            borderWidth=0,
            borderBottomWidth=1
        ))
        self.styles.add(ParagraphStyle(
            name='NormalText',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#334155'),
            leading=16,
            alignment=TA_JUSTIFY
        ))
        self.styles.add(ParagraphStyle(
            name='RiskHigh',
            parent=self.styles['Normal'],
            textColor=colors.red,
            fontSize=12,
            fontName='Helvetica-Bold'
        ))
        self.styles.add(ParagraphStyle(
            name='RiskNormal',
            parent=self.styles['Normal'],
            textColor=colors.green,
            fontSize=12,
            fontName='Helvetica-Bold'
        ))

    def add_header(self, title="Cognitive Assessment Report"):
        # Logo could go here if available
        self.story.append(Paragraph("COGNIX AI", self.styles['CognixTitle']))
        self.story.append(Paragraph(title, self.styles['Heading2']))
        self.story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", self.styles['Normal']))
        self.story.append(Spacer(1, 20))
        self.story.append(Paragraph("_" * 60, self.styles['Normal']))
        self.story.append(Spacer(1, 20))

    def add_patient_info(self, name="Patient", age="N/A", gender="N/A"):
        data = [
            ["Patient Name:", name],
            ["Age/Gender:", f"{age} / {gender}"],
            ["Report ID:", self.filename.split('.')[0]]
        ]
        t = Table(data, colWidths=[2*inch, 4*inch])
        t.setStyle(TableStyle([
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#1E293B')),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ]))
        self.story.append(t)
        self.story.append(Spacer(1, 20))

    def add_prediction_section(self, disease, confidence, risk_level):
        self.story.append(Paragraph("AI Analysis Result", self.styles['SectionHeader']))
        
        # Color coding for risk
        risk_style = self.styles['RiskHigh'] if risk_level in ['High', 'Critical'] else self.styles['RiskNormal']
        
        data = [
            [Paragraph("Predicted Condition:", self.styles['NormalText']), Paragraph(disease, self.styles['Heading3'])],
            [Paragraph("Confidence Score:", self.styles['NormalText']), f"{confidence*100:.1f}%"],
            [Paragraph("Risk Assessment:", self.styles['NormalText']), Paragraph(risk_level, risk_style)]
        ]
        
        t = Table(data, colWidths=[2.5*inch, 3*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 12),
        ]))
        self.story.append(t)
        self.story.append(Spacer(1, 15))

    def add_speech_metrics(self, markers):
        self.story.append(Paragraph("Neuro-Linguistic Markers", self.styles['SectionHeader']))
        
        data = [["Metric", "Score", "Status"]]
        for k, v in markers.items():
            score = v
            status = "Normal" if score > 60 else "Concern" if score > 40 else "Impaired"
            status_color = colors.green if score > 60 else colors.orange if score > 40 else colors.red
            
            data.append([
                k.replace('_', ' ').title().replace('Score', ''),
                f"{score}/100",
                status
            ])
            
        t = Table(data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6366F1')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (1,0), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ]))
        self.story.append(t)
        self.story.append(Spacer(1, 20))

    def add_clinical_text(self, heading, text):
        if not text: return
        self.story.append(Paragraph(heading, self.styles['SectionHeader']))
        self.story.append(Paragraph(text, self.styles['NormalText']))
        self.story.append(Spacer(1, 15))

    def add_disclaimer(self):
        self.story.append(Spacer(1, 40))
        text = "DISCLAIMER: This report is generated by an AI assistant (Cognix) and is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment."
        self.story.append(Paragraph(text, ParagraphStyle(
            name='Disclaimer',
            fontSize=8,
            textColor=colors.gray,
            alignment=TA_CENTER
        )))

    def generate(self):
        doc = SimpleDocTemplate(str(self.filepath), pagesize=A4,
                                rightMargin=50, leftMargin=50,
                                topMargin=50, bottomMargin=50)
        doc.build(self.story)
        return str(self.filepath)

def generate_speech_report(analysis, filename):
    gen = PDFGenerator(filename)
    gen.add_header("Speech & Cognitive Assessment")
    
    # Mock patient info for now
    gen.add_patient_info()
    
    gen.add_prediction_section(
        analysis.get('predicted_disease', 'N/A'),
        analysis.get('confidence', 0),
        analysis.get('risk_level', 'Moderate')
    )
    
    if 'speech_markers' in analysis:
        gen.add_speech_metrics(analysis['speech_markers'])
        
    gen.add_clinical_text("Clinical Reasoning", analysis.get('reasoning', ''))
    
    recs = analysis.get('recommendations', [])
    if recs:
        gen.add_clinical_text("Recommendations", "\n• " + "\n• ".join(recs))
        
    gen.add_disclaimer()
    return gen.generate()

def generate_scan_report(analysis, filename, extracted_text=""):
    gen = PDFGenerator(filename)
    gen.add_header("Medical Document Analysis")
    gen.add_patient_info()
    
    ml = analysis.get('ml_prediction', {})
    gen.add_prediction_section(
        ml.get('predicted_disease', 'N/A'),
        ml.get('confidence', 0),
        ml.get('risk_level', 'Low')
    )
    
    if extracted_text:
        # Limit extracted text
        preview = extracted_text[:1000] + "..." if len(extracted_text) > 1000 else extracted_text
        gen.add_clinical_text("Extracted Content", preview)
        
    features = analysis.get('features_used', {})
    if features:
         # Convert features to markers format for table
         markers = {k: int(v * 100) if v <= 1 else v for k, v in features.items() if isinstance(v, (int, float))}
         # Filter top 5 interesting ones
         markers = dict(list(markers.items())[:5])
         gen.add_speech_metrics(markers) # Reuse table style
         
    gen.add_disclaimer()
    return gen.generate()
