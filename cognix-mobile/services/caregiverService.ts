import { API_URL } from './backend-api';
import axios from 'axios';

export interface CaregiverObservation {
  _id?: string;
  patientId: string;
  caregiverId: string;
  observations: {
    forgetfulness: number;
    wandering: number;
    moodSwings: number;
    aggression: number;
    confusion: number;
  };
  notes?: string;
  structuredSignals?: any;
  observationDate: string;
}

class CaregiverService {
  async linkCaregiver(patientId: string, caregiverEmail: string) {
    try {
      const response = await axios.post(`${API_URL}/api/caregiver/link`, {
        patientId,
        caregiverEmail,
      });
      return response.data;
    } catch (error: any) {
      console.error('CaregiverService.linkCaregiver error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async logObservation(data: {
    caregiverId: string;
    patientId: string;
    observations: CaregiverObservation['observations'];
    notes?: string;
  }) {
    try {
      const response = await axios.post(`${API_URL}/api/caregiver/observation`, data);
      return response.data;
    } catch (error: any) {
      console.error('CaregiverService.logObservation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async getPatients(caregiverId: string) {
    try {
      const response = await axios.get(`${API_URL}/api/caregiver/patients/${caregiverId}`);
      return response.data;
    } catch (error: any) {
      console.error('CaregiverService.getPatients error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async getObservations(patientId: string) {
    try {
      const response = await axios.get(`${API_URL}/api/caregiver/observations/${patientId}`);
      return response.data;
    } catch (error: any) {
      console.error('CaregiverService.getObservations error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }
}

export default new CaregiverService();
