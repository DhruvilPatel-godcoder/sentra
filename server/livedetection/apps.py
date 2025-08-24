from django.apps import AppConfig

class LivedetectionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'livedetection'
    verbose_name = 'Live Helmet Detection'
    
    def ready(self):
        """Initialize app when Django starts"""
        try:
            # Import configuration and validate
            from .config.settings import validate_config
            from .config.model_config import validate_model_config
            
            print("Initializing Live Detection app...")
            
            # Validate configurations
            validate_config()
            validate_model_config()
            
            # Initialize required directories
            self._create_required_directories()
            
            # Check model availability
            self._check_model_availability()
            
            print("Live Detection app initialized successfully!")
            
        except Exception as e:
            print(f"Error initializing Live Detection app: {e}")
    
    def _create_required_directories(self):
        """Create required directories if they don't exist"""
        from .config.settings import CONFIG
        
        required_dirs = [
            CONFIG['PATHS']['DATA_DIR'],
            CONFIG['PATHS']['MEDIA_DIR'],
            CONFIG['PATHS']['WEIGHTS_DIR'],
            CONFIG['PATHS']['UPLOADS_DIR'],
            CONFIG['PATHS']['PROCESSED_DIR'],
            CONFIG['PATHS']['VIOLATIONS_DIR'],
            CONFIG['PATHS']['TEMP_DIR']
        ]
        
        for directory in required_dirs:
            directory.mkdir(parents=True, exist_ok=True)
    
    def _check_model_availability(self):
        """Check if required models are available"""
        from .config.settings import CONFIG
        
        helmet_model_path = CONFIG['MODELS']['HELMET_DETECTION_MODEL']
        
        if not helmet_model_path.exists():
            print(f"Warning: Helmet detection model not found at {helmet_model_path}")
            print("The system will use the base YOLO model until a custom model is trained")
        else:
            print(f"Helmet detection model found at {helmet_model_path}")