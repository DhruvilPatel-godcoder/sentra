from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pymongo import MongoClient
from datetime import datetime, timedelta
import json

# MongoDB Connection
try:
    MONGO_URI = "mongodb://localhost:27017/"
    client = MongoClient(MONGO_URI)
    db = client["sentra"]
    
    # Test connection
    client.admin.command('ping')
    print("MongoDB connection successful for LiveFeed!")
    
except Exception as e:
    print(f"MongoDB connection failed: {e}")
    client = None
    db = None

# Collections
if db is not None:
    cameras_collection = db["cameras"]
    violations_collection = db["violations"]
    vehicles_collection = db["vehicles"]
    users_collection = db["admin"]

@csrf_exempt
def get_cameras(request):
    if request.method == 'GET':
        try:
            if db is None or cameras_collection.count_documents({}) == 0:
                # Return mock camera data
                mock_cameras = [
                    {
                        "camera_id": "CAM001",
                        "location": "Iscon Cross Road, Ahmedabad",
                        "ip_address": "192.168.1.10",
                        "status": "active",
                        "installed_date": "2024-08-01T00:00:00Z",
                        "last_maintenance_date": "2025-01-15T00:00:00Z",
                        "camera_type": "CCTV",
                        "stream_url": "rtsp://192.168.1.10:554/live"
                    },
                    {
                        "camera_id": "CAM002",
                        "location": "SG Highway, Ahmedabad",
                        "ip_address": "192.168.1.11",
                        "status": "active",
                        "installed_date": "2024-08-01T00:00:00Z",
                        "last_maintenance_date": "2025-01-15T00:00:00Z",
                        "camera_type": "CCTV",
                        "stream_url": "rtsp://192.168.1.11:554/live"
                    },
                    {
                        "camera_id": "CAM003",
                        "location": "CG Road, Ahmedabad",
                        "ip_address": "192.168.1.12",
                        "status": "active",
                        "installed_date": "2024-08-01T00:00:00Z",
                        "last_maintenance_date": "2025-01-15T00:00:00Z",
                        "camera_type": "CCTV",
                        "stream_url": "rtsp://192.168.1.12:554/live"
                    },
                    {
                        "camera_id": "CAM004",
                        "location": "Satellite Road, Ahmedabad",
                        "ip_address": "192.168.1.13",
                        "status": "maintenance",
                        "installed_date": "2024-08-01T00:00:00Z",
                        "last_maintenance_date": "2025-01-15T00:00:00Z",
                        "camera_type": "CCTV",
                        "stream_url": "rtsp://192.168.1.13:554/live"
                    },
                    {
                        "camera_id": "CAM005",
                        "location": "Bopal Road, Ahmedabad",
                        "ip_address": "192.168.1.14",
                        "status": "active",
                        "installed_date": "2024-08-01T00:00:00Z",
                        "last_maintenance_date": "2025-01-15T00:00:00Z",
                        "camera_type": "CCTV",
                        "stream_url": "rtsp://192.168.1.14:554/live"
                    }
                ]
                
                return JsonResponse({
                    'status': 'success',
                    'cameras': mock_cameras
                })
            
            # Get cameras from database
            cameras = list(cameras_collection.find({}, {'_id': 0}))
            
            return JsonResponse({
                'status': 'success',
                'cameras': cameras
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)

@csrf_exempt
def get_live_detections(request):
    if request.method == 'GET':
        try:
            camera_id = request.GET.get('camera_id')
            
            if db is None or violations_collection.count_documents({}) == 0:
                # Return mock detection data
                mock_detections = [
                    {
                        "detection_id": "DET001",
                        "camera_id": camera_id or "CAM001",
                        "violation_type": "speeding",
                        "plate_number": "GJ05AB1234",
                        "location": "Iscon Cross Road, Ahmedabad",
                        "detected_at": datetime.now().isoformat(),
                        "confidence": 95,
                        "speed": 85,
                        "speed_limit": 60,
                        "evidence_photo": "detection1.jpg",
                        "processed": False
                    },
                    {
                        "detection_id": "DET002",
                        "camera_id": camera_id or "CAM002",
                        "violation_type": "red_light_violation",
                        "plate_number": "GJ01CD5678",
                        "location": "SG Highway, Ahmedabad",
                        "detected_at": (datetime.now() - timedelta(minutes=2)).isoformat(),
                        "confidence": 92,
                        "evidence_photo": "detection2.jpg",
                        "processed": False
                    },
                    {
                        "detection_id": "DET003",
                        "camera_id": camera_id or "CAM003",
                        "violation_type": "no_helmet",
                        "plate_number": "MH12EF9012",
                        "location": "CG Road, Ahmedabad",
                        "detected_at": (datetime.now() - timedelta(minutes=5)).isoformat(),
                        "confidence": 88,
                        "evidence_photo": "detection3.jpg",
                        "processed": False
                    }
                ]
                
                # Filter by camera if specified
                if camera_id:
                    mock_detections = [d for d in mock_detections if d['camera_id'] == camera_id]
                
                return JsonResponse({
                    'status': 'success',
                    'detections': mock_detections
                })
            
            # Get recent detections from database (last 30 minutes)
            thirty_minutes_ago = datetime.now() - timedelta(minutes=30)
            
            query = {"created_at": {"$gte": thirty_minutes_ago}}
            if camera_id:
                # Find camera location first
                camera = cameras_collection.find_one({"camera_id": camera_id})
                if camera:
                    query["location"] = camera.get("location")
            
            recent_violations = list(violations_collection.find(query).sort("created_at", -1).limit(20))
            
            detections = []
            for violation in recent_violations:
                # Get vehicle details
                vehicle = vehicles_collection.find_one({"vehicle_id": violation.get("vehicle_id")})
                
                detection = {
                    "detection_id": violation.get("violation_id"),
                    "camera_id": camera_id or "CAM001",
                    "violation_type": violation.get("violation_type"),
                    "plate_number": vehicle.get("plate_number") if vehicle else "Unknown",
                    "location": violation.get("location"),
                    "detected_at": violation.get("created_at").isoformat() if violation.get("created_at") else datetime.now().isoformat(),
                    "confidence": 90 + (hash(violation.get("violation_id", "")) % 10),  # Mock confidence
                    "evidence_photo": violation.get("evidence_photo"),
                    "processed": violation.get("status") != "pending"
                }
                
                # Add speed info for speeding violations
                if violation.get("violation_type") == "speeding":
                    detection["speed"] = 70 + (hash(violation.get("violation_id", "")) % 30)
                    detection["speed_limit"] = 60
                
                detections.append(detection)
            
            return JsonResponse({
                'status': 'success',
                'detections': detections
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)

@csrf_exempt
def get_camera_status(request, camera_id):
    if request.method == 'GET':
        try:
            if db is None:
                # Return mock status
                return JsonResponse({
                    'status': 'success',
                    'camera_status': {
                        'camera_id': camera_id,
                        'status': 'active',
                        'last_ping': datetime.now().isoformat(),
                        'uptime': '99.5%'
                    }
                })
            
            camera = cameras_collection.find_one({"camera_id": camera_id}, {'_id': 0})
            if not camera:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Camera not found'
                }, status=404)
            
            return JsonResponse({
                'status': 'success',
                'camera_status': camera
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_status = data.get('status')
            
            if db is None:
                return JsonResponse({
                    'status': 'success',
                    'message': f'Camera {camera_id} status updated to {new_status}'
                })
            
            # Update camera status
            result = cameras_collection.update_one(
                {"camera_id": camera_id},
                {"$set": {"status": new_status, "last_maintenance_date": datetime.now()}}
            )
            
            if result.matched_count == 0:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Camera not found'
                }, status=404)
            
            return JsonResponse({
                'status': 'success',
                'message': f'Camera {camera_id} status updated to {new_status}'
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)

@csrf_exempt
def get_camera_stream(request, camera_id):
    if request.method == 'GET':
        try:
            if db is None:
                # Return mock HTTP stream for testing
                return JsonResponse({
                    'status': 'success',
                    'stream': {
                        'camera_id': camera_id,
                        'stream_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',  # Sample video
                        'stream_type': 'http',
                        'resolution': '1920x1080',
                        'fps': 30,
                        'is_live': True
                    }
                })
            
            camera = cameras_collection.find_one({"camera_id": camera_id}, {'_id': 0})
            if not camera:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Camera not found'
                }, status=404)
            
            stream_url = camera.get('stream_url')
            
            # Convert RTSP to HTTP if needed
            if stream_url and stream_url.startswith('rtsp://'):
                # For production, implement RTSP to HLS/WebRTC conversion
                # For now, use a sample HTTP stream
                stream_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
            
            return JsonResponse({
                'status': 'success',
                'stream': {
                    'camera_id': camera_id,
                    'stream_url': stream_url,
                    'stream_type': 'http',
                    'resolution': '1920x1080',
                    'fps': 30,
                    'is_live': camera.get('status') == 'active'
                }
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)
# @csrf_exempt
# def get_camera_stream(request, camera_id):
#     if request.method == 'GET':
#         try:
#             if db is None:
#                 # Return mock HTTP stream for testing
#                 return JsonResponse({
#                     'status': 'success',
#                     'stream': {
#                         'camera_id': camera_id,
#                         'stream_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',  # Sample video
#                         'stream_type': 'http',
#                         'resolution': '1920x1080',
#                         'fps': 30,
#                         'is_live': True
#                     }
#                 })
            
#             camera = cameras_collection.find_one({"camera_id": camera_id}, {'_id': 0})
#             if not camera:
#                 return JsonResponse({
#                     'status': 'error',
#                     'message': 'Camera not found'
#                 }, status=404)
            
#             stream_url = camera.get('stream_url')
            
#             # Convert RTSP to HTTP if needed
#             if stream_url and stream_url.startswith('rtsp://'):
#                 # For production, implement RTSP to HLS/WebRTC conversion
#                 # For now, use a sample HTTP stream
#                 stream_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            
#             return JsonResponse({
#                 'status': 'success',
#                 'stream': {
#                     'camera_id': camera_id,
#                     'stream_url': stream_url,
#                     'stream_type': 'http',
#                     'resolution': '1920x1080',
#                     'fps': 30,
#                     'is_live': camera.get('status') == 'active'
#                 }
#             })
            
#         except Exception as e:
#             return JsonResponse({
#                 'status': 'error',
#                 'message': str(e)
#             }, status=500)
    
#     return JsonResponse({
#         'status': 'error',
#         'message': 'Method not allowed'
#     }, status=405)