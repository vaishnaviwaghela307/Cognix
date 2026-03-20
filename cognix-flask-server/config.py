"""
Flask Server Configuration
Simple configuration for ML prediction server
"""

import os
from pathlib import Path


class Config:
    """Base configuration"""
    
    # Server settings
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'  # Enable debug mode for auto-reload
    ENV = os.getenv('ENV', 'development')
    
    # Paths
    BASE_DIR = Path(__file__).parent
    MODELS_DIR = BASE_DIR / 'models' / 'multiclass'
    
    # API Keys
    GROQ_API_KEY = os.getenv('GROQ_API_KEY', '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')
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')


def get_config():
    """Get configuration instance"""
    return Config()
