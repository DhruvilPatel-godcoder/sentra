
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from django.conf import settings
from pymongo import MongoClient
import json
import os
import uuid
from datetime import datetime, timedelta
import threading
# Add at the top of your file
from bson import ObjectId

def clean_for_json(data):
    """Recursively convert ObjectId and datetime in dicts/lists for JSON serialization."""
    if isinstance(data, dict):
        return {k: clean_for_json(v) for k, v in data.items() if k != '_id'}
    elif isinstance(data, list):
        return [clean_for_json(i) for i in data]
    elif isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    return data



from .ai_models.helmet_detector import HelmetDetector
from .ai_models.plate_reader import PlateReader
from .ai_models.violation_processor import ViolationProcessor
from .training.model_trainer import ModelTrainer
from .utils.database_handler import DatabaseHandler
from .utils.file_handler import FileHandler

# MongoDB connection
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client["sentra"]

# Collections based on your schema
users_collection = db["users"]
vehicles_collection = db["vehicles"]
violations_collection = db["violations"]
payments_collection = db["payments"]
cameras_collection = db["cameras"]

# Initialize AI models
helmet_detector = HelmetDetector()
plate_reader = PlateReader()
violation_processor = ViolationProcessor()
model_trainer = ModelTrainer()
db_handler = DatabaseHandler()
file_handler = FileHandler()

@csrf_exempt
@require_http_methods(["POST"])
def process_image(request):
    """Process uploaded image for helmet detection"""
    try:
        if 'image' not in request.FILES:
            return JsonResponse({
                'status': 'error',
                'message': 'No image file provided'
            }, status=400)
        
        image_file = request.FILES['image']
        camera_id = request.POST.get('camera_id', 'upload')
        
        # Save uploaded image
        file_path = file_handler.save_uploaded_image(image_file, camera_id)
        
        # Process image with AI models
        detection_result = process_image_detection(file_path, camera_id)
        
        return JsonResponse({
            'status': 'success',
            'data': detection_result,
            'message': 'Image processed successfully'
        })
        
    except Exception as e:
        print(f"Error in process_image: {str(e)}")
        # In your process_image view, change the
        return JsonResponse({
            'status': 'success',
            'data': clean_for_json(detection_result),
            'message': 'Image processed successfully'
        })

def process_image_detection(image_path, camera_id):
    """Core image processing logic"""
    try:
        # Detect helmets and persons
        helmet_result = helmet_detector.detect(image_path)
        
        # Detect license plates
        plate_result = plate_reader.detect_and_read(image_path)
        
        # Generate unique detection ID
        detection_id = f"DET_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        # Combine results
        detection_data = {
            'detection_id': detection_id,
            'camera_id': camera_id,
            'timestamp': datetime.now(),
            'original_image': image_path,
            
            # Person detection
            'person_detected': helmet_result.get('person_detected', False),
            'person_confidence': helmet_result.get('person_confidence', 0.0),
            'person_bbox': helmet_result.get('person_bbox', {}),
            
            # Helmet detection
            'helmet_detected': helmet_result.get('helmet_detected', False),
            'helmet_confidence': helmet_result.get('helmet_confidence', 0.0),
            'helmet_bbox': helmet_result.get('helmet_bbox', {}),
            
            # Plate detection
            'plate_detected': plate_result.get('plate_detected', False),
            'plate_number': plate_result.get('plate_number', ''),
            'plate_confidence': plate_result.get('plate_confidence', 0.0),
            'plate_bbox': plate_result.get('plate_bbox', {}),
            
            # Vehicle detection
            'vehicle_detected': helmet_result.get('vehicle_detected', False),
            'vehicle_type': helmet_result.get('vehicle_type', ''),
            'vehicle_bbox': helmet_result.get('vehicle_bbox', {}),
        }
        
        # Check for violation
        is_violation = violation_processor.check_violation(detection_data)
        detection_data['is_violation'] = is_violation
        
        if is_violation:
            detection_data['violation_type'] = 'NO_HELMET'
            
            # Create processed image with annotations
            processed_image_path = violation_processor.create_annotated_image(
                image_path, detection_data
            )
            detection_data['processed_image'] = processed_image_path
            
            # Generate violation memo if plate detected
            if detection_data['plate_detected']:
                violation_memo = violation_processor.generate_violation_memo(detection_data)
                detection_data['violation_memo'] = violation_memo
        
        # Save to database
        db_handler.save_detection(detection_data)
        
        return detection_data
        
    except Exception as e:
        print(f"Error in process_image_detection: {str(e)}")
        return JsonResponse({
        'status': 'error',
        'message': str(e)
    }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_detections(request):
    """Get detection history"""
    try:
        # Get query parameters
        limit = int(request.GET.get('limit', 20))
        camera_id = request.GET.get('camera_id')
        violation_only = request.GET.get('violation_only', 'false').lower() == 'true'
        
        detections = db_handler.get_detections(
            limit=limit,
            camera_id=camera_id,
            violation_only=violation_only
        )
        
        return JsonResponse({
            'status': 'success',
            'data': detections,
            'total': len(detections)
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_violations(request):
    """Get violation memos"""
    try:
        limit = int(request.GET.get('limit', 10))
        status = request.GET.get('status')
        
        violations = db_handler.get_violations(limit=limit, status=status)
        
        return JsonResponse({
            'status': 'success',
            'data': violations,
            'total': len(violations)
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_stats(request):
    """Get detection statistics"""
    try:
        time_range = request.GET.get('range', '24h')
        
        stats = db_handler.get_statistics(time_range)
        
        return JsonResponse({
            'status': 'success',
            'data': stats
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def train_model(request):
    """Start model training"""
    try:
        # Check if training is already in progress
        if model_trainer.is_training():
            return JsonResponse({
                'status': 'error',
                'message': 'Training already in progress'
            }, status=400)
        
        # Start training in background thread
        training_thread = threading.Thread(target=model_trainer.start_training)
        training_thread.daemon = True
        training_thread.start()
        
        return JsonResponse({
            'status': 'success',
            'message': 'Model training started'
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_training_status(request):
    """Get current training status"""
    try:
        status = model_trainer.get_training_status()
        
        return JsonResponse({
            'status': 'success',
            'data': status
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_user_by_plate(request):
    """Get user information by plate number"""
    try:
        plate_number = request.GET.get('plate')
        if not plate_number:
            return JsonResponse({
                'status': 'error',
                'message': 'Plate number required'
            }, status=400)
        
        # Find vehicle by plate number
        vehicle = vehicles_collection.find_one({"plate_number": plate_number})
        if not vehicle:
            return JsonResponse({
                'status': 'error',
                'message': 'Vehicle not found'
            }, status=404)
        
        # Find user by owner_id
        user = users_collection.find_one({"user_id": vehicle["owner_id"]})
        if not user:
            return JsonResponse({
                'status': 'error',
                'message': 'User not found'
            }, status=404)
        
        # Remove sensitive data
        user.pop('face_data', None)
        user.pop('_id', None)
        vehicle.pop('_id', None)
        
        return JsonResponse({
            'status': 'success',
            'data': {
                'user': user,
                'vehicle': vehicle
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def process_violation(request):
    """Process violation and generate memo"""
    try:
        data = json.loads(request.body)
        
        violation_memo = violation_processor.create_violation_memo(data)
        
        return JsonResponse({
            'status': 'success',
            'data': violation_memo
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_cameras(request):
    """Get available cameras"""
    try:
        cameras = list(cameras_collection.find({}, {'_id': 0}))
        
        return JsonResponse({
            'status': 'success',
            'data': cameras
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def serve_media(request, file_path):
    """Serve media files"""
    try:
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        if not os.path.exists(full_path):
            return JsonResponse({
                'status': 'error',
                'message': 'File not found'
            }, status=404)
        
        with open(full_path, 'rb') as f:
            response = HttpResponse(f.read())
            response['Content-Type'] = 'image/jpeg'
            return response
            
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)
