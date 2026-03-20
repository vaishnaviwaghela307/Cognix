from flask import Blueprint
from controllers.caregiver_controller import CaregiverController

caregiver_bp = Blueprint('caregiver', __name__, url_prefix='/api')

@caregiver_bp.route('/process-caregiver-observation', methods=['POST'])
def process_observation():
    return CaregiverController.process_observation()
