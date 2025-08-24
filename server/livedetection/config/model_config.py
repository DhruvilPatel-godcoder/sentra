import torch
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

MODEL_CONFIG = {
    # Helmet Detection Model Configuration
    'HELMET_DETECTION': {
        'MODEL_NAME': 'helmet_detector_v1',
        'MODEL_TYPE': 'YOLOv8',
        'VERSION': '1.0.0',
        'INPUT_SIZE': (640, 640),
        'NUM_CLASSES': 5,
        'CLASS_NAMES': {
            0: 'person',
            1: 'helmet',
            2: 'no_helmet', 
            3: 'motorcycle',
            4: 'license_plate'
        },
        'CLASS_COLORS': {
            0: (255, 0, 0),     # Red for person
            1: (0, 255, 0),     # Green for helmet
            2: (0, 0, 255),     # Blue for no_helmet
            3: (255, 255, 0),   # Yellow for motorcycle
            4: (255, 0, 255)    # Magenta for license_plate
        },
        'CONFIDENCE_THRESHOLD': 0.5,
        'IOU_THRESHOLD': 0.45,
        'MAX_DETECTIONS': 300,
        'DEVICE': 'cuda' if torch.cuda.is_available() else 'cpu'
    },
    
    # License Plate Recognition Configuration
    'PLATE_RECOGNITION': {
        'OCR_ENGINE': 'EasyOCR',
        'LANGUAGES': ['en'],
        'USE_GPU': False,
        'CONFIDENCE_THRESHOLD': 0.4,
        'PREPROCESSING': {
            'RESIZE_FACTOR': 2.0,
            'DENOISE': True,
            'ENHANCE_CONTRAST': True,
            'BILATERAL_FILTER': True,
            'MORPHOLOGICAL_OPERATIONS': True
        },
        'PLATE_PATTERNS': [
            r'^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$',  # Standard: KA01AB1234
            r'^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$',  # Alternative: KA1AB1234
            r'^[A-Z]{3}[0-9]{4}$',  # Old format: KAR1234
            r'^[A-Z]{2}[0-9]{2}[A-Z]{4}[0-9]{4}$'  # New BH series
        ],
        'MIN_PLATE_LENGTH': 6,
        'MAX_PLATE_LENGTH': 12
    },
    
    # Training Configuration
    'TRAINING': {
        'OPTIMIZER': 'AdamW',
        'SCHEDULER': 'CosineAnnealingLR',
        'LOSS_FUNCTION': 'YOLOv8Loss',
        'AUGMENTATION': {
            'HORIZONTAL_FLIP': 0.5,
            'VERTICAL_FLIP': 0.0,
            'ROTATION': 0.1,
            'SCALE': 0.2,
            'TRANSLATION': 0.1,
            'BRIGHTNESS': 0.2,
            'CONTRAST': 0.2,
            'SATURATION': 0.2,
            'HUE': 0.1,
            'NOISE': 0.1,
            'BLUR': 0.1,
            'MOSAIC': 1.0,
            'MIXUP': 0.1
        },
        'VALIDATION': {
            'FREQUENCY': 1,  # Validate every epoch
            'METRICS': ['mAP50', 'mAP50-95', 'Precision', 'Recall'],
            'EARLY_STOPPING': {
                'PATIENCE': 50,
                'MIN_DELTA': 0.001,
                'MONITOR': 'mAP50'
            }
        },
        'CHECKPOINTING': {
            'SAVE_BEST': True,
            'SAVE_LAST': True,
            'SAVE_FREQUENCY': 10,
            'MAX_CHECKPOINTS': 5
        }
    },
    
    # Data Configuration
    'DATA': {
        'DATASET_FORMAT': 'YOLO',
        'SPLIT_RATIOS': {
            'TRAIN': 0.7,
            'VALIDATION': 0.2,
            'TEST': 0.1
        },
        'PREPROCESSING': {
            'NORMALIZE': True,
            'MEAN': [0.485, 0.456, 0.406],
            'STD': [0.229, 0.224, 0.225],
            'RESIZE_MODE': 'letterbox',
            'PAD_COLOR': 114
        },
        'AUGMENTATION_PROBABILITY': 0.8,
        'CACHE_DATASET': True
    },
    
    # Inference Configuration
    'INFERENCE': {
        'BATCH_SIZE': 1,
        'HALF_PRECISION': False,
        'DYNAMIC_BATCHING': False,
        'TTA': False,  # Test Time Augmentation
        'AGNOSTIC_NMS': False,
        'MULTI_LABEL': False,
        'SAVE_PREDICTIONS': True,
        'SAVE_CONFIDENCE': True,
        'SAVE_CROPS': False
    },
    
    # Performance Configuration
    'PERFORMANCE': {
        'TENSORRT': False,
        'ONNX_EXPORT': False,
        'OPENVINO': False,
        'COREML': False,
        'TFLITE': False,
        'BENCHMARK_MODE': False,
        'PROFILE_GPU': False,
        'OPTIMIZE_FOR_MOBILE': False
    },
    
    # Violation Detection Rules
    'VIOLATION_RULES': {
        'HELMET_DETECTION': {
            'PERSON_CONFIDENCE_MIN': 0.5,
            'HELMET_CONFIDENCE_MIN': 0.4,
            'NO_HELMET_CONFIDENCE_MIN': 0.6,
            'VEHICLE_REQUIRED': False,
            'MINIMUM_PERSON_SIZE': 50,  # pixels
            'MAXIMUM_PERSONS_PER_IMAGE': 10
        },
        'SPATIAL_CONSTRAINTS': {
            'PERSON_HELMET_MAX_DISTANCE': 100,  # pixels
            'PERSON_VEHICLE_MAX_DISTANCE': 200,  # pixels
            'OVERLAP_THRESHOLD': 0.3
        },
        'TEMPORAL_CONSTRAINTS': {
            'MINIMUM_DETECTION_DURATION': 2,  # seconds
            'MAXIMUM_GAP_BETWEEN_DETECTIONS': 5  # seconds
        }
    },
    
    # Model Paths
    'PATHS': {
        'WEIGHTS_DIR': BASE_DIR / 'weights',
        'MODELS': {
            'HELMET_DETECTION': BASE_DIR / 'weights' / 'helmet_detection.pt',
            'HELMET_DETECTION_BACKUP': BASE_DIR / 'weights' / 'backup' / 'helmet_detection_backup.pt',
            'YOLO_BASE': 'yolov8n.pt',
            'YOLO_MEDIUM': 'yolov8m.pt',
            'YOLO_LARGE': 'yolov8l.pt'
        },
        'CONFIG_FILES': {
            'DATASET_CONFIG': BASE_DIR / 'data' / 'data.yaml',
            'TRAINING_CONFIG': BASE_DIR / 'config' / 'training_config.yaml',
            'INFERENCE_CONFIG': BASE_DIR / 'config' / 'inference_config.yaml'
        }
    },
    
    # Hardware Configuration
    'HARDWARE': {
        'GPU_MEMORY_THRESHOLD': 0.8,  # Use 80% of GPU memory
        'CPU_CORES': 4,
        'MIXED_PRECISION': True,
        'COMPILE_MODEL': False,
        'BENCHMARK_ITERATIONS': 100
    },
    
    # Logging and Monitoring
    'MONITORING': {
        'LOG_PREDICTIONS': True,
        'LOG_PERFORMANCE': True,
        'SAVE_FAILED_DETECTIONS': True,
        'TRACK_MODEL_DRIFT': True,
        'ALERT_THRESHOLD_ACCURACY': 0.8,
        'PERFORMANCE_MONITORING': {
            'FPS_THRESHOLD': 10,
            'MEMORY_THRESHOLD_MB': 2048,
            'GPU_UTILIZATION_THRESHOLD': 0.9
        }
    }
}

# Model validation functions
def validate_model_config():
    """Validate model configuration"""
    errors = []
    
    # Validate confidence thresholds
    helmet_conf = MODEL_CONFIG['HELMET_DETECTION']['CONFIDENCE_THRESHOLD']
    if not 0.0 <= helmet_conf <= 1.0:
        errors.append(f"Invalid helmet detection confidence threshold: {helmet_conf}")
    
    plate_conf = MODEL_CONFIG['PLATE_RECOGNITION']['CONFIDENCE_THRESHOLD']
    if not 0.0 <= plate_conf <= 1.0:
        errors.append(f"Invalid plate recognition confidence threshold: {plate_conf}")
    
    # Validate class configuration
    num_classes = MODEL_CONFIG['HELMET_DETECTION']['NUM_CLASSES']
    class_names = MODEL_CONFIG['HELMET_DETECTION']['CLASS_NAMES']
    
    if len(class_names) != num_classes:
        errors.append(f"Number of class names ({len(class_names)}) doesn't match num_classes ({num_classes})")
    
    # Validate split ratios
    ratios = MODEL_CONFIG['DATA']['SPLIT_RATIOS']
    total_ratio = sum(ratios.values())
    if abs(total_ratio - 1.0) > 0.001:
        errors.append(f"Data split ratios don't sum to 1.0: {total_ratio}")
    
    # Check if required paths exist
    weights_dir = MODEL_CONFIG['PATHS']['WEIGHTS_DIR']
    if not weights_dir.exists():
        try:
            weights_dir.mkdir(parents=True, exist_ok=True)
            print(f"Created weights directory: {weights_dir}")
        except Exception as e:
            errors.append(f"Cannot create weights directory: {e}")
    
    if errors:
        raise ValueError(f"Model configuration validation failed: {'; '.join(errors)}")
    
    print("Model configuration validation passed")

def get_device_config():
    """Get optimal device configuration"""
    device_info = {
        'device': MODEL_CONFIG['HELMET_DETECTION']['DEVICE'],
        'gpu_available': torch.cuda.is_available(),
        'gpu_count': torch.cuda.device_count() if torch.cuda.is_available() else 0,
        'mixed_precision': MODEL_CONFIG['HARDWARE']['MIXED_PRECISION']
    }
    
    if device_info['gpu_available']:
        device_info['gpu_name'] = torch.cuda.get_device_name(0)
        device_info['gpu_memory'] = torch.cuda.get_device_properties(0).total_memory / 1024**3  # GB
    
    return device_info

def get_model_summary():
    """Get model configuration summary"""
    return {
        'helmet_detection': {
            'model_type': MODEL_CONFIG['HELMET_DETECTION']['MODEL_TYPE'],
            'num_classes': MODEL_CONFIG['HELMET_DETECTION']['NUM_CLASSES'],
            'input_size': MODEL_CONFIG['HELMET_DETECTION']['INPUT_SIZE'],
            'confidence_threshold': MODEL_CONFIG['HELMET_DETECTION']['CONFIDENCE_THRESHOLD']
        },
        'plate_recognition': {
            'ocr_engine': MODEL_CONFIG['PLATE_RECOGNITION']['OCR_ENGINE'],
            'languages': MODEL_CONFIG['PLATE_RECOGNITION']['LANGUAGES'],
            'confidence_threshold': MODEL_CONFIG['PLATE_RECOGNITION']['CONFIDENCE_THRESHOLD']
        },
        'device': get_device_config(),
        'paths': {
            'weights_dir': str(MODEL_CONFIG['PATHS']['WEIGHTS_DIR']),
            'dataset_config': str(MODEL_CONFIG['PATHS']['CONFIG_FILES']['DATASET_CONFIG'])
        }
    }

# Initialize model configuration
try:
    validate_model_config()
except Exception as e:
    print(f"Model configuration error: {e}")