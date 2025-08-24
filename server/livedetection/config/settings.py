import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Main configuration
CONFIG = {
    # Database settings
    'DATABASE': {
        'MONGO_URI': os.getenv('MONGO_URI', 'mongodb://localhost:27017/'),
        'DB_NAME': 'sentra',
        'COLLECTIONS': {
            'users': 'users',
            'vehicles': 'vehicles',
            'violations': 'violations',
            'payments': 'payments',
            'notifications': 'notifications',
            'appeals': 'appeals',
            'documents': 'documents',
            'cameras': 'cameras',
            'helmet_detections': 'helmet_detections',
            'detection_sessions': 'detection_sessions',
            'training_logs': 'training_logs'
        }
    },
    
    # File paths
    'PATHS': {
        'BASE_DIR': BASE_DIR,
        'DATA_DIR': BASE_DIR / 'data',
        'MEDIA_DIR': BASE_DIR / 'media',
        'WEIGHTS_DIR': BASE_DIR / 'weights',
        'CONFIG_DIR': BASE_DIR / 'config',
        'UPLOADS_DIR': BASE_DIR / 'media' / 'uploads',
        'PROCESSED_DIR': BASE_DIR / 'media' / 'processed',
        'VIOLATIONS_DIR': BASE_DIR / 'media' / 'violations',
        'TEMP_DIR': BASE_DIR / 'media' / 'temp'
    },
    
    # Model settings
    'MODELS': {
        'HELMET_DETECTION_MODEL': BASE_DIR / 'weights' / 'helmet_detection.pt',
        'BACKUP_MODEL': BASE_DIR / 'weights' / 'backup' / 'helmet_detection_backup.pt',
        'YOLO_BASE_MODEL': 'yolov8n.pt',
        'DEVICE': 'cuda' if os.getenv('USE_GPU', 'true').lower() == 'true' else 'cpu'
    },
    
    # Detection settings
    'DETECTION': {
        'CONFIDENCE_THRESHOLD': float(os.getenv('CONFIDENCE_THRESHOLD', '0.5')),
        'IOU_THRESHOLD': float(os.getenv('IOU_THRESHOLD', '0.45')),
        'MAX_DETECTIONS': int(os.getenv('MAX_DETECTIONS', '300')),
        'IMAGE_SIZE': int(os.getenv('IMAGE_SIZE', '640')),
        'BATCH_SIZE': int(os.getenv('BATCH_SIZE', '1'))
    },
    
    # Violation settings
    'VIOLATIONS': {
        'HELMET_REQUIRED': True,
        'FINE_AMOUNT': float(os.getenv('FINE_AMOUNT', '500.0')),
        'AUTO_MEMO_GENERATION': True,
        'EVIDENCE_RETENTION_DAYS': int(os.getenv('EVIDENCE_RETENTION_DAYS', '365')),
        'NOTIFICATION_ENABLED': True
    },
    
    # Training settings
    'TRAINING': {
        'DEFAULT_EPOCHS': int(os.getenv('TRAINING_EPOCHS', '100')),
        'DEFAULT_BATCH_SIZE': int(os.getenv('TRAINING_BATCH_SIZE', '16')),
        'LEARNING_RATE': float(os.getenv('LEARNING_RATE', '0.01')),
        'PATIENCE': int(os.getenv('TRAINING_PATIENCE', '50')),
        'SAVE_FREQUENCY': int(os.getenv('SAVE_FREQUENCY', '10')),
        'MAX_TRAINING_TIME_HOURS': int(os.getenv('MAX_TRAINING_TIME_HOURS', '24'))
    },
    
    # OCR settings
    'OCR': {
        'ENABLED': True,
        'LANGUAGE': ['en'],
        'USE_GPU': False,  # EasyOCR GPU support
        'CONFIDENCE_THRESHOLD': 0.4,
        'PREPROCESSING_ENABLED': True
    },
    
    # File handling
    'FILES': {
        'MAX_UPLOAD_SIZE_MB': int(os.getenv('MAX_UPLOAD_SIZE_MB', '10')),
        'ALLOWED_EXTENSIONS': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'],
        'CLEANUP_TEMP_FILES_HOURS': int(os.getenv('CLEANUP_TEMP_FILES_HOURS', '24')),
        'COMPRESS_IMAGES': True,
        'MAX_IMAGE_WIDTH': int(os.getenv('MAX_IMAGE_WIDTH', '1920')),
        'MAX_IMAGE_HEIGHT': int(os.getenv('MAX_IMAGE_HEIGHT', '1080'))
    },
    
    # API settings
    'API': {
        'ENABLE_CORS': True,
        'MAX_REQUESTS_PER_MINUTE': int(os.getenv('MAX_REQUESTS_PER_MINUTE', '60')),
        'ENABLE_RATE_LIMITING': True,
        'ENABLE_LOGGING': True
    },
    
    # Security settings
    'SECURITY': {
        'ENABLE_CSRF_PROTECTION': False,  # For API endpoints
        'ENABLE_API_KEY_AUTH': False,
        'LOG_VIOLATIONS': True,
        'ANONYMIZE_DATA': False
    },
    
    # Logging settings
    'LOGGING': {
        'LEVEL': os.getenv('LOG_LEVEL', 'INFO'),
        'LOG_TO_FILE': True,
        'LOG_TO_DATABASE': True,
        'MAX_LOG_SIZE_MB': 100,
        'LOG_RETENTION_DAYS': 30
    },
    
    # Performance settings
    'PERFORMANCE': {
        'ENABLE_CACHING': True,
        'CACHE_TIMEOUT_SECONDS': 300,
        'ENABLE_COMPRESSION': True,
        'OPTIMIZE_IMAGES': True,
        'PARALLEL_PROCESSING': True,
        'MAX_WORKERS': int(os.getenv('MAX_WORKERS', '4'))
    },
    
    # Notification settings
    'NOTIFICATIONS': {
        'EMAIL_ENABLED': False,
        'SMS_ENABLED': False,
        'PUSH_NOTIFICATIONS': False,
        'VIOLATION_NOTIFICATIONS': True,
        'TRAINING_NOTIFICATIONS': True
    }
}

# Validation function
def validate_config():
    """Validate configuration settings"""
    errors = []
    
    # Check required directories
    required_dirs = [
        CONFIG['PATHS']['DATA_DIR'],
        CONFIG['PATHS']['MEDIA_DIR'],
        CONFIG['PATHS']['WEIGHTS_DIR']
    ]
    
    for dir_path in required_dirs:
        if not dir_path.exists():
            try:
                dir_path.mkdir(parents=True, exist_ok=True)
                print(f"Created directory: {dir_path}")
            except Exception as e:
                errors.append(f"Cannot create directory {dir_path}: {e}")
    
    # Validate threshold values
    if not 0.0 <= CONFIG['DETECTION']['CONFIDENCE_THRESHOLD'] <= 1.0:
        errors.append("Confidence threshold must be between 0.0 and 1.0")
    
    if not 0.0 <= CONFIG['DETECTION']['IOU_THRESHOLD'] <= 1.0:
        errors.append("IOU threshold must be between 0.0 and 1.0")
    
    # Validate fine amount
    if CONFIG['VIOLATIONS']['FINE_AMOUNT'] <= 0:
        errors.append("Fine amount must be positive")
    
    # Validate training parameters
    if CONFIG['TRAINING']['DEFAULT_EPOCHS'] <= 0:
        errors.append("Training epochs must be positive")
    
    if CONFIG['TRAINING']['DEFAULT_BATCH_SIZE'] <= 0:
        errors.append("Training batch size must be positive")
    
    if errors:
        raise ValueError(f"Configuration validation failed: {'; '.join(errors)}")
    
    print("Configuration validation passed")

# Initialize configuration
try:
    validate_config()
except Exception as e:
    print(f"Configuration error: {e}")