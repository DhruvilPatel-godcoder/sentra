from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pymongo import MongoClient
from datetime import datetime, timedelta
import json
import random
import string
import base64
import hashlib
import io
from PIL import Image, ImageEnhance, ImageFilter
import cv2  # You'll need to install: pip install opencv-python
import numpy as np

# MongoDB Connection
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client["sentra"]

# Collections
users_collection = db["users"]
bank_accounts_collection = db["bank_accounts"]
vehicles_collection = db["vehicles"]

# Temporary OTP storage (in-memory storage for browser console OTP)
otp_storage = {}

def generate_user_id():
    """Generate unique user ID"""
    return "USR" + ''.join(random.choices(string.digits, k=6))

def generate_account_number():
    """Generate unique bank account number"""
    return "BANK" + ''.join(random.choices(string.digits, k=6))

def generate_vehicle_id():
    """Generate unique vehicle ID"""
    return "VEH" + ''.join(random.choices(string.digits, k=6))

def send_sms(mobile_number, message):
    """Send SMS using SMS gateway (Mock implementation)"""
    try:
        # Mock SMS sending - replace with actual SMS gateway
        print(f"SMS to {mobile_number}: {message}")
        return True
    except Exception as e:
        print(f"SMS sending failed: {e}")
        return False

def detect_face_region(face_image_data):
    """Detect and extract only the face region from the image"""
    try:
        # Decode base64 image
        image_data = base64.b64decode(face_image_data.split(',')[1])
        image = Image.open(io.BytesIO(image_data))
        
        # Convert PIL to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Load face cascade classifier
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces with adjusted parameters for better detection
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5,  # Increased for better accuracy
            minSize=(30, 30),  # Minimum face size
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        if len(faces) == 0:
            print("⚠ No face detected in image")
            return None
        
        # Take the largest face detected
        largest_face = max(faces, key=lambda x: x[2] * x[3])
        x, y, w, h = largest_face
        
        # Add minimal padding around the face (reduced padding)
        padding = int(0.1 * min(w, h))  # Reduced from 0.2 to 0.1
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(opencv_image.shape[1] - x, w + 2 * padding)
        h = min(opencv_image.shape[0] - y, h + 2 * padding)
        
        # Extract face region
        face_region = opencv_image[y:y+h, x:x+w]
        
        # Convert back to PIL
        face_pil = Image.fromarray(cv2.cvtColor(face_region, cv2.COLOR_BGR2RGB))
        
        print(f"✅ Face detected and extracted: {w}x{h} pixels")
        return face_pil
        
    except Exception as e:
        print(f"❌ Face detection failed: {e}")
        return None

def extract_face_features_only(face_image_data):
    """Extract features from ONLY the face region, ignoring background"""
    try:
        # First detect and extract face region
        face_image = detect_face_region(face_image_data)
        
        if face_image is None:
            print("❌ No face detected for feature extraction")
            return None
        
        # Convert to RGB if needed
        if face_image.mode != 'RGB':
            face_image = face_image.convert('RGB')
        
        # Resize to larger size for better feature extraction
        face_image = face_image.resize((128, 128))  # Increased from 64x64
        
        # Enhance contrast for better feature detection
        enhancer = ImageEnhance.Contrast(face_image)
        face_image = enhancer.enhance(1.3)  # Slightly increased
        
        # Convert to numpy array
        img_array = np.array(face_image)
        
        # Extract comprehensive face-specific features
        features = {
            # Basic color statistics
            'face_mean_rgb': img_array.mean(axis=(0,1)).tolist(),
            'face_std_rgb': img_array.std(axis=(0,1)).tolist(),
            
            # Detailed histogram for texture
            'face_histogram': np.histogram(img_array.flatten(), bins=32)[0].tolist(),  # Reduced bins
            
            # Individual color channel histograms
            'red_histogram': np.histogram(img_array[:,:,0].flatten(), bins=16)[0].tolist(),
            'green_histogram': np.histogram(img_array[:,:,1].flatten(), bins=16)[0].tolist(),
            'blue_histogram': np.histogram(img_array[:,:,2].flatten(), bins=16)[0].tolist(),
            
            # Face brightness and contrast
            'face_brightness': float(np.mean(img_array)),
            'face_contrast': float(np.std(img_array)),
            
            # Face region dimensions
            'face_width': img_array.shape[1],
            'face_height': img_array.shape[0],
            
            # Edge detection for facial features
            'face_edges': extract_edge_features(img_array),
            
            # Color channel analysis
            'red_channel_mean': float(np.mean(img_array[:,:,0])),
            'green_channel_mean': float(np.mean(img_array[:,:,1])),
            'blue_channel_mean': float(np.mean(img_array[:,:,2])),
            
            'red_channel_std': float(np.std(img_array[:,:,0])),
            'green_channel_std': float(np.std(img_array[:,:,1])),
            'blue_channel_std': float(np.std(img_array[:,:,2])),
            
            # Advanced texture analysis
            'face_variance': float(np.var(img_array)),
            'face_entropy': calculate_entropy(img_array),
            
            # Gradient analysis
            'gradient_magnitude': calculate_gradient_features(img_array)
        }
        
        print("✅ Enhanced face-only features extracted successfully")
        return features
        
    except Exception as e:
        print(f"❌ Face feature extraction failed: {e}")
        return None

def calculate_entropy(img_array):
    """Calculate image entropy for texture analysis"""
    try:
        # Convert to grayscale
        gray = np.mean(img_array, axis=2).astype(np.uint8)
        
        # Calculate histogram
        hist, _ = np.histogram(gray, bins=256, range=(0, 256))
        
        # Normalize histogram
        hist = hist / np.sum(hist)
        
        # Calculate entropy
        entropy = -np.sum(hist * np.log2(hist + 1e-10))  # Add small value to avoid log(0)
        
        return float(entropy)
    except:
        return 0.0

def calculate_gradient_features(img_array):
    """Calculate gradient-based features"""
    try:
        # Convert to grayscale
        gray = np.mean(img_array, axis=2)
        
        # Calculate gradients
        grad_x = np.gradient(gray, axis=1)
        grad_y = np.gradient(gray, axis=0)
        
        # Gradient magnitude
        magnitude = np.sqrt(grad_x*2 + grad_y*2)
        
        return {
            'mean_magnitude': float(np.mean(magnitude)),
            'std_magnitude': float(np.std(magnitude)),
            'max_magnitude': float(np.max(magnitude))
        }
    except:
        return {'mean_magnitude': 0.0, 'std_magnitude': 0.0, 'max_magnitude': 0.0}

def extract_edge_features(img_array):
    """Extract edge features from face region"""
    try:
        # Convert to grayscale
        gray = np.mean(img_array, axis=2)
        
        # Simple edge detection using gradients
        grad_x = np.gradient(gray, axis=1)
        grad_y = np.gradient(gray, axis=0)
        
        # Edge magnitude
        edge_magnitude = np.sqrt(grad_x*2 + grad_y*2)
        
        # Edge statistics
        edge_features = {
            'edge_mean': float(np.mean(edge_magnitude)),
            'edge_std': float(np.std(edge_magnitude)),
            'edge_max': float(np.max(edge_magnitude)),
            'edge_histogram': np.histogram(edge_magnitude.flatten(), bins=20)[0].tolist()
        }
        
        return edge_features
        
    except Exception as e:
        print(f"Edge feature extraction failed: {e}")
        return {}

def calculate_edge_similarity(edges1, edges2):
    """Calculate similarity between edge features"""
    try:
        similarity = 0
        comparisons = 0
        
        # Compare edge statistics
        edge_stats = ['edge_mean', 'edge_std', 'edge_max']
        for stat in edge_stats:
            if stat in edges1 and stat in edges2:
                diff = abs(edges1[stat] - edges2[stat])
                sim = max(0, 1 - diff / 100)  # Normalize
                similarity += sim
                comparisons += 1
        
        # Compare edge histograms
        if 'edge_histogram' in edges1 and 'edge_histogram' in edges2:
            hist1 = np.array(edges1['edge_histogram'])
            hist2 = np.array(edges2['edge_histogram'])
            # Normalize
            hist1 = hist1 / (np.sum(hist1) + 1e-10)
            hist2 = hist2 / (np.sum(hist2) + 1e-10)
            # Calculate correlation
            correlation = np.corrcoef(hist1, hist2)[0, 1]
            if not np.isnan(correlation):
                similarity += max(0, correlation)
                comparisons += 1
        
        return similarity / comparisons if comparisons > 0 else 0
        
    except Exception as e:
        print(f"Edge similarity calculation failed: {e}")
        return 0

def calculate_face_similarity(features1, features2):
    """Enhanced face similarity calculation with better thresholds"""
    try:
        similarities = []
        weights = []
        
        print("🔬 Detailed similarity analysis:")
        
        # 1. RGB color distribution (weight: 0.25) - Most important
        if 'face_mean_rgb' in features1 and 'face_mean_rgb' in features2:
            rgb1 = np.array(features1['face_mean_rgb'])
            rgb2 = np.array(features2['face_mean_rgb'])
            rgb_diff = np.mean(np.abs(rgb1 - rgb2))
            # More lenient threshold for RGB differences
            rgb_sim = max(0, 1 - rgb_diff / 128)  # Changed from 255 to 128
            similarities.append(rgb_sim)
            weights.append(0.25)
            print(f"   🎨 RGB similarity: {rgb_sim:.3f} (diff: {rgb_diff:.1f})")
        
        # 2. Face histogram (weight: 0.3) - Very important for texture
        if 'face_histogram' in features1 and 'face_histogram' in features2:
            hist1 = np.array(features1['face_histogram'])
            hist2 = np.array(features2['face_histogram'])
            
            # Normalize histograms
            hist1_norm = hist1 / (np.sum(hist1) + 1e-10)
            hist2_norm = hist2 / (np.sum(hist2) + 1e-10)
            
            # Use correlation instead of chi-squared for better similarity
            correlation = np.corrcoef(hist1_norm, hist2_norm)[0, 1]
            if np.isnan(correlation):
                correlation = 0
            hist_sim = max(0, correlation)
            
            similarities.append(hist_sim)
            weights.append(0.3)
            print(f"   📊 Histogram similarity: {hist_sim:.3f}")
        
        # 3. Individual color channel histograms (weight: 0.2)
        color_channels = ['red_histogram', 'green_histogram', 'blue_histogram']
        channel_sims = []
        for channel in color_channels:
            if channel in features1 and channel in features2:
                hist1 = np.array(features1[channel])
                hist2 = np.array(features2[channel])
                
                # Normalize
                hist1_norm = hist1 / (np.sum(hist1) + 1e-10)
                hist2_norm = hist2 / (np.sum(hist2) + 1e-10)
                
                # Calculate correlation
                correlation = np.corrcoef(hist1_norm, hist2_norm)[0, 1]
                if not np.isnan(correlation):
                    channel_sims.append(max(0, correlation))
        
        if channel_sims:
            avg_channel_sim = np.mean(channel_sims)
            similarities.append(avg_channel_sim)
            weights.append(0.2)
            print(f"   🌈 Channel similarity: {avg_channel_sim:.3f}")
        
        # 4. Brightness and contrast (weight: 0.1) - Less important
        if all(k in features1 and k in features2 for k in ['face_brightness', 'face_contrast']):
            brightness_diff = abs(features1['face_brightness'] - features2['face_brightness'])
            contrast_diff = abs(features1['face_contrast'] - features2['face_contrast'])
            
            # More lenient thresholds
            brightness_sim = max(0, 1 - brightness_diff / 150)  # Changed from 255
            contrast_sim = max(0, 1 - contrast_diff / 80)      # Changed from 100
            
            brightness_contrast_sim = (brightness_sim + contrast_sim) / 2
            similarities.append(brightness_contrast_sim)
            weights.append(0.1)
            print(f"   💡 Brightness/Contrast similarity: {brightness_contrast_sim:.3f}")
        
        # 5. Edge features (weight: 0.1)
        if 'face_edges' in features1 and 'face_edges' in features2:
            edge_sim = calculate_edge_similarity(features1['face_edges'], features2['face_edges'])
            similarities.append(edge_sim)
            weights.append(0.1)
            print(f"   ⚡ Edge similarity: {edge_sim:.3f}")
        
        # 6. Entropy (texture complexity) (weight: 0.05)
        if 'face_entropy' in features1 and 'face_entropy' in features2:
            entropy_diff = abs(features1['face_entropy'] - features2['face_entropy'])
            entropy_sim = max(0, 1 - entropy_diff / 8)  # More lenient
            similarities.append(entropy_sim)
            weights.append(0.05)
            print(f"   🔄 Entropy similarity: {entropy_sim:.3f}")
        
        # Calculate weighted average
        if similarities and weights:
            total_weight = sum(weights)
            weighted_score = sum(s * w for s, w in zip(similarities, weights)) / total_weight
            print(f"   🎯 Final weighted score: {weighted_score:.3f}")
            return weighted_score
        else:
            print("   ❌ No valid similarities calculated")
            return 0
            
    except Exception as e:
        print(f"Face similarity calculation failed: {e}")
        return 0

def compare_faces_improved(stored_encoding, new_image_data, threshold=0.5):  # Lowered to 50%
    """Improved face comparison with better debugging"""
    try:
        print("🔍 Starting face comparison...")
        
        new_encoding = encode_face_improved(new_image_data)
        if new_encoding is None:
            print("❌ Failed to encode new image - no face detected")
            return False, 0
        
        print("✅ New image encoded successfully")
        
        # Handle different face data formats
        stored_features = None
        if isinstance(stored_encoding, dict):
            if "features" in stored_encoding and stored_encoding.get("version") == "face_only_v2":
                stored_features = stored_encoding.get("features", {})
                print("✅ Using face-only features (v2)")
            elif "features" in stored_encoding:
                stored_features = stored_encoding.get("features", {})
                print("⚠ Using old format features")
            elif "face_data" in stored_encoding:
                print("🔄 Re-extracting features from stored face data...")
                try:
                    stored_image_data = f"data:image/jpeg;base64,{stored_encoding['face_data']}"
                    temp_encoding = encode_face_improved(stored_image_data)
                    if temp_encoding:
                        stored_features = temp_encoding.get("features", {})
                        print("✅ Re-extracted features successfully")
                    else:
                        print("❌ Failed to re-extract features")
                        return False, 0
                except Exception as e:
                    print(f"❌ Re-extraction failed: {e}")
                    return False, 0
            else:
                print("❌ Unknown stored encoding format")
                return False, 0
        else:
            print("❌ Legacy string format not supported")
            return False, 0
        
        new_features = new_encoding.get("features", {})
        
        if not stored_features or not new_features:
            print(f"❌ Missing features - stored: {bool(stored_features)}, new: {bool(new_features)}")
            return False, 0
        
        print(f"📊 Stored features count: {len(stored_features)}")
        print(f"📊 New features count: {len(new_features)}")
        
        # Calculate similarity with detailed logging
        similarity_score = calculate_face_similarity(stored_features, new_features)
        
        print(f"🎯 Final similarity score: {similarity_score:.3f} (threshold: {threshold})")
        
        # Return True if similarity is above threshold
        is_match = similarity_score >= threshold
        return is_match, similarity_score
        
    except Exception as e:
        print(f"Face comparison failed: {e}")
        return False, 0

# Update the face_login function with better thresholds
@csrf_exempt
@require_http_methods(["POST", "GET"])
def face_login(request):
    # Handle GET request for debugging
    if request.method == "GET":
        users_count = users_collection.count_documents({"face_data": {"$exists": True, "$ne": None}})
        return JsonResponse({
            "status": "info",
            "message": "Face login endpoint is working. Send POST request with face_image data.",
            "method": "POST",
            "registered_faces": users_count,
            "required_data": {
                "face_image": "base64 encoded image data"
            },
            "endpoint": "/api/userlogin/face-login/",
            "threshold": "Minimum 50% similarity required for authentication"  # Updated
        })
    
    try:
        data = json.loads(request.body)
        face_image = data.get('face_image', '')
        
        if not face_image:
            return JsonResponse({
                "status": "error",
                "message": "Face image is required for authentication"
            }, status=400)
        
        print("🔍 Attempting face authentication...")
        
        # Get all users with face data
        users_with_faces = list(users_collection.find({"face_data": {"$exists": True, "$ne": None}}))
        
        if not users_with_faces:
            print("❌ No users found with face authentication enabled")
            return JsonResponse({
                "status": "error",
                "message": "No registered faces found. Please register first with face authentication.",
                "error_code": "NO_REGISTERED_FACES"
            }, status=404)
        
        print(f"🔎 Checking face against {len(users_with_faces)} registered faces...")
        
        best_match = None
        best_score = 0
        threshold = 0.5  # Lowered threshold to 50%
        min_acceptable_score = 0.3  # Lowered minimum score to 30%
        
        all_scores = []
        
        # Try to match face with existing users
        for user in users_with_faces:
            print(f"\n🤔 Comparing with user: {user['name']}")
            
            face_data = user.get('face_data')
            if face_data:
                print(f"   📝 Face data type: {type(face_data)}")
                if isinstance(face_data, dict):
                    print(f"   🔑 Keys: {list(face_data.keys())}")
            
            is_match, similarity_score = compare_faces_improved(face_data, face_image, threshold)
            all_scores.append({
                "user": user['name'],
                "score": similarity_score
            })
            
            print(f"   📊 Final score: {similarity_score:.3f}")
            
            if is_match and similarity_score > best_score:
                best_match = user
                best_score = similarity_score
                print(f"   🎯 NEW BEST MATCH! Score: {best_score:.3f}")
        
        # Sort and display all scores
        all_scores.sort(key=lambda x: x['score'], reverse=True)
        print(f"\n📈 All similarity scores:")
        for score_info in all_scores:
            print(f"   {score_info['user']}: {score_info['score']:.3f}")
        
        # Check if we have a valid match
        if best_match and best_score >= threshold:
            # Update last login
            users_collection.update_one(
                {"user_id": best_match["user_id"]},
                {"$set": {"last_login": datetime.now()}}
            )
            
            print(f"🎉 AUTHENTICATION SUCCESS for {best_match['name']} (score: {best_score:.3f})")
            
            return JsonResponse({
                "status": "success",
                "message": f"Face authentication successful! Welcome {best_match['name']}",
                "user_data": {
                    "user_id": best_match["user_id"],
                    "name": best_match["name"],
                    "mobile_number": best_match["mobile_number"],
                    "email": best_match.get("email", ""),
                    "dl_number": best_match.get("dl_number", ""),
                    "bank_account_number": best_match.get("bank_account_number", ""),
                    "similarity_score": best_score,
                    "confidence": f"{best_score:.1%}"
                }
            })
        
        # Handle different failure cases with better messages
        if best_score > 0:
            if best_score >= min_acceptable_score:
                print(f"❌ Score too low: {best_score:.3f} (required: {threshold:.3f})")
                return JsonResponse({
                    "status": "error",
                    "message": f"Face similarity too low. Got {best_score:.1%}, need {threshold:.1%}. Try better lighting or angle.",
                    "error_code": "LOW_SIMILARITY",
                    "similarity": f"{best_score:.1%}",
                    "required": f"{threshold:.1%}",
                    "suggestions": [
                        "Ensure good lighting on your face",
                        "Look directly at the camera",
                        "Remove glasses if you weren't wearing them during registration",
                        "Try a different angle"
                    ]
                }, status=401)
            else:
                print(f"❌ Face not registered: {best_score:.3f}")
                return JsonResponse({
                    "status": "error",
                    "message": "Face not registered in our system. Please register first or use mobile login.",
                    "error_code": "FACE_NOT_REGISTERED",
                    "similarity": f"{best_score:.1%}"
                }, status=404)
        else:
            print("❌ No face detected")
            return JsonResponse({
                "status": "error",
                "message": "No face detected in the image. Please capture again with good lighting.",
                "error_code": "NO_FACE_DETECTED",
                "suggestions": [
                    "Ensure your face is clearly visible",
                    "Use good lighting",
                    "Hold the camera steady",
                    "Position your face in the center"
                ]
            }, status=400)
        
    except Exception as e:
        print(f"Error in face_login: {str(e)}")
        return JsonResponse({
            "status": "error",
            "message": "Face authentication system error. Please try mobile login.",
            "error_code": "SYSTEM_ERROR",
            "technical_error": str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def send_otp(request):
    """Send OTP to mobile number"""
    try:
        data = json.loads(request.body)
        mobile_number = data.get('mobile_number', '').strip()
        
        if not mobile_number:
            return JsonResponse({
                "status": "error",
                "message": "Mobile number is required"
            }, status=400)
        
        # Generate 6-digit OTP
        otp = ''.join(random.choices(string.digits, k=6))
        
        # Store OTP with expiration (5 minutes)
        otp_storage[mobile_number] = {
            "otp": otp,
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(minutes=5),
            "verified": False,
            "attempts": 0
        }
        
        # Send SMS (mock implementation)
        message = f"Your Sentra OTP is: {otp}. Valid for 5 minutes."
        sms_sent = send_sms(mobile_number, message)
        
        if sms_sent:
            return JsonResponse({
                "status": "success",
                "message": "OTP sent successfully",
                "otp": otp,  # For testing only - remove in production
                "expires_in": 300  # 5 minutes in seconds
            })
        else:
            return JsonResponse({
                "status": "error",
                "message": "Failed to send OTP"
            }, status=500)
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": f"Error sending OTP: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def verify_otp(request):
    """Verify OTP and return user data if exists"""
    try:
        data = json.loads(request.body)
        mobile_number = data.get('mobile_number', '').strip()
        entered_otp = data.get('otp', '').strip()
        
        if not mobile_number or not entered_otp:
            return JsonResponse({
                "status": "error",
                "message": "Mobile number and OTP are required"
            }, status=400)
        
        # Check if OTP exists
        if mobile_number not in otp_storage:
            return JsonResponse({
                "status": "error",
                "message": "No OTP found for this mobile number"
            }, status=404)
        
        otp_data = otp_storage[mobile_number]
        
        # Check if OTP is expired
        if datetime.now() > otp_data["expires_at"]:
            del otp_storage[mobile_number]
            return JsonResponse({
                "status": "error",
                "message": "OTP has expired. Please request a new one."
            }, status=400)
        
        # Check attempts
        if otp_data["attempts"] >= 3:
            del otp_storage[mobile_number]
            return JsonResponse({
                "status": "error",
                "message": "Too many failed attempts. Please request a new OTP."
            }, status=400)
        
        # Verify OTP
        if entered_otp == otp_data["otp"]:
            # Mark as verified
            otp_storage[mobile_number]["verified"] = True
            
            # Check if user exists
            user = users_collection.find_one({"mobile_number": mobile_number})
            
            if user:
                # Update last login
                users_collection.update_one(
                    {"mobile_number": mobile_number},
                    {"$set": {"last_login": datetime.now()}}
                )
                
                return JsonResponse({
                    "status": "success",
                    "message": "OTP verified successfully",
                    "user_exists": True,
                    "user_data": {
                        "user_id": user["user_id"],
                        "name": user["name"],
                        "mobile_number": user["mobile_number"],
                        "email": user.get("email", ""),
                        "dl_number": user.get("dl_number", ""),
                        "bank_account_number": user.get("bank_account_number", ""),
                        "has_face_auth": user.get("face_data") is not None
                    }
                })
            else:
                return JsonResponse({
                    "status": "success",
                    "message": "OTP verified successfully",
                    "user_exists": False,
                    "redirect_to_registration": True
                })
        else:
            # Increment attempts
            otp_storage[mobile_number]["attempts"] += 1
            remaining_attempts = 3 - otp_storage[mobile_number]["attempts"]
            
            return JsonResponse({
                "status": "error",
                "message": f"Invalid OTP. {remaining_attempts} attempts remaining.",
                "remaining_attempts": remaining_attempts
            }, status=400)
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": f"Error verifying OTP: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def register_user(request):
    """Register new user with face authentication"""
    try:
        data = json.loads(request.body)
        
        # Required fields
        name = data.get('name', '').strip()
        mobile_number = data.get('mobile_number', '').strip()
        dl_number = data.get('dl_number', '').strip()
        face_image = data.get('face_image', '')
        
        # Optional fields
        email = data.get('email', '').strip()
        
        if not all([name, mobile_number, dl_number, face_image]):
            return JsonResponse({
                "status": "error",
                "message": "Name, mobile number, DL number, and face image are required"
            }, status=400)
        
        # Check if mobile number already exists
        existing_user = users_collection.find_one({"mobile_number": mobile_number})
        if existing_user:
            return JsonResponse({
                "status": "error",
                "message": "User with this mobile number already exists"
            }, status=400)
        
        # Check if DL number already exists
        existing_dl = users_collection.find_one({"dl_number": dl_number})
        if existing_dl:
            return JsonResponse({
                "status": "error",
                "message": "User with this DL number already exists"
            }, status=400)
        
        # Encode face image
        face_encoding = encode_face_improved(face_image)
        if not face_encoding:
            return JsonResponse({
                "status": "error",
                "message": "Could not process face image. Please ensure face is clearly visible."
            }, status=400)
        
        # Generate IDs
        user_id = generate_user_id()
        bank_account_number = generate_account_number()
        vehicle_id = generate_vehicle_id()
        
        # Create user document
        user_doc = {
            "user_id": user_id,
            "name": name,
            "mobile_number": mobile_number,
            "email": email,
            "dl_number": dl_number,
            "bank_account_number": bank_account_number,
            "face_data": face_encoding,
            "created_at": datetime.now(),
            "last_login": datetime.now(),
            "is_active": True
        }
        
        # Insert user
        users_collection.insert_one(user_doc)
        
        # Create bank account
        bank_account_doc = {
            "user_id": user_id,
            "account_number": bank_account_number,
            "account_type": "savings",
            "balance": 0.0,
            "created_at": datetime.now(),
            "is_active": True
        }
        bank_accounts_collection.insert_one(bank_account_doc)
        
        # Create vehicle entry
        vehicle_doc = {
            "user_id": user_id,
            "vehicle_id": vehicle_id,
            "dl_number": dl_number,
            "created_at": datetime.now(),
            "is_active": True
        }
        vehicles_collection.insert_one(vehicle_doc)
        
        # Clear OTP storage for this mobile number
        if mobile_number in otp_storage:
            del otp_storage[mobile_number]
        
        return JsonResponse({
            "status": "success",
            "message": f"User {name} registered successfully with face authentication",
            "user_data": {
                "user_id": user_id,
                "name": name,
                "mobile_number": mobile_number,
                "email": email,
                "dl_number": dl_number,
                "bank_account_number": bank_account_number,
                "vehicle_id": vehicle_id
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": f"Registration failed: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def validate_face_quality(request):
    """Validate if the captured face image is of good quality"""
    try:
        data = json.loads(request.body)
        face_image = data.get('face_image', '')
        
        if not face_image:
            return JsonResponse({
                "status": "error",
                "message": "Face image is required"
            }, status=400)
        
        # Try to detect face
        face_region = detect_face_region(face_image)
        
        if face_region is None:
            return JsonResponse({
                "status": "error",
                "message": "No face detected. Please ensure your face is clearly visible.",
                "suggestions": [
                    "Make sure your face is well-lit",
                    "Remove sunglasses or masks",
                    "Look directly at the camera",
                    "Move closer to the camera"
                ]
            }, status=400)
        
        # Check image quality
        img_array = np.array(face_region)
        brightness = np.mean(img_array)
        contrast = np.std(img_array)
        
        quality_issues = []
        
        if brightness < 50:
            quality_issues.append("Image too dark - improve lighting")
        elif brightness > 200:
            quality_issues.append("Image too bright - reduce lighting")
        
        if contrast < 20:
            quality_issues.append("Image too blurry - hold camera steady")
        
        if len(quality_issues) > 0:
            return JsonResponse({
                "status": "warning",
                "message": "Face detected but image quality could be better",
                "quality_issues": quality_issues,
                "face_detected": True
            })
        
        return JsonResponse({
            "status": "success",
            "message": "Face detected with good quality",
            "face_detected": True,
            "brightness": float(brightness),
            "contrast": float(contrast)
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": f"Face validation failed: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST", "GET"])
def migrate_face_data(request):
    """Migrate old face data to new format"""
    if request.method == "GET":
        # Count users with old format face data
        old_format_count = users_collection.count_documents({
            "face_data": {"$exists": True, "$ne": None}
        })
        
        total_users = users_collection.count_documents({"face_data": {"$exists": True, "$ne": None}})
        
        return JsonResponse({
            "status": "info",
            "message": "Face data migration utility",
            "total_users_with_faces": total_users,
            "old_format_users": old_format_count,
            "migration_needed": old_format_count > 0
        })
    
    try:
        # Find all users with face data
        all_users = list(users_collection.find({
            "face_data": {"$exists": True, "$ne": None}
        }))
        
        migrated_count = 0
        failed_count = 0
        already_migrated = 0
        
        for user in all_users:
            face_data = user.get('face_data')
            
            # Check if already in new format
            if isinstance(face_data, dict) and face_data.get("version") == "face_only_v2":
                already_migrated += 1
                continue
            
            print(f"Migrating user: {user['name']}")
            
            try:
                # Try to re-extract features from stored face image
                if isinstance(face_data, dict) and "face_data" in face_data:
                    # Old format with base64 image
                    stored_image_data = f"data:image/jpeg;base64,{face_data['face_data']}"
                    new_encoding = encode_face_improved(stored_image_data)
                    
                    if new_encoding:
                        # Update user with new encoding
                        users_collection.update_one(
                            {"user_id": user["user_id"]},
                            {"$set": {"face_data": new_encoding}}
                        )
                        migrated_count += 1
                        print(f"✅ Migrated: {user['name']}")
                    else:
                        failed_count += 1
                        print(f"❌ Failed to migrate: {user['name']}")
                
                elif isinstance(face_data, str):
                    # Very old string format - mark for manual re-registration
                    users_collection.update_one(
                        {"user_id": user["user_id"]},
                        {"$unset": {"face_data": ""}}
                    )
                    failed_count += 1
                    print(f"⚠ Removed old string format for: {user['name']}")
                
                else:
                    failed_count += 1
                    print(f"❌ Unknown format for: {user['name']}")
                    
            except Exception as e:
                failed_count += 1
                print(f"❌ Error migrating {user['name']}: {e}")
        
        return JsonResponse({
            "status": "success",
            "message": "Face data migration completed",
            "results": {
                "already_migrated": already_migrated,
                "successfully_migrated": migrated_count,
                "failed_migrations": failed_count,
                "total_processed": len(all_users)
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": f"Migration failed: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def debug_face_data(request):
    """Debug face data formats in database"""
    try:
        all_users = list(users_collection.find({"face_data": {"$exists": True, "$ne": None}}))
        
        debug_info = []
        
        for user in all_users:
            face_data = user.get('face_data')
            user_info = {
                "name": user['name'],
                "user_id": user['user_id'],
                "face_data_type": type(face_data)._name_,
                "has_features": False,
                "has_face_data": False,
                "version": "unknown"
            }
            
            if isinstance(face_data, dict):
                user_info["keys"] = list(face_data.keys())
                user_info["has_features"] = "features" in face_data
                user_info["has_face_data"] = "face_data" in face_data
                user_info["version"] = face_data.get("version", "old")
            
            debug_info.append(user_info)
        
        return JsonResponse({
            "status": "success",
            "total_users": len(debug_info),
            "users": debug_info
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": f"Debug failed: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def debug_otp_storage(request):
    """Debug OTP storage"""
    try:
        current_time = datetime.now()
        otp_debug = {}
        
        for mobile, otp_data in otp_storage.items():
            otp_debug[mobile] = {
                "otp": otp_data["otp"],
                "created_at": otp_data["created_at"].isoformat(),
                "expires_at": otp_data["expires_at"].isoformat(),
                "is_expired": current_time > otp_data["expires_at"],
                "verified": otp_data["verified"],
                "attempts": otp_data["attempts"],
                "time_remaining": str(otp_data["expires_at"] - current_time) if current_time < otp_data["expires_at"] else "Expired"
            }
        
        return JsonResponse({
            "status": "success",
            "current_time": current_time.isoformat(),
            "total_otps": len(otp_debug),
            "otp_storage": otp_debug
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": f"Debug failed: {str(e)}"
        }, status=500)

def encode_face_improved(face_image_data):
    """Improved face encoding focusing ONLY on face features"""
    try:
        # Extract face-only features
        features = extract_face_features_only(face_image_data)
        if features is None:
            return None
        
        # Also store a cropped face image (not full image)
        face_image = detect_face_region(face_image_data)
        if face_image:
            # Convert face region to base64
            buffer = io.BytesIO()
            face_image.save(buffer, format='JPEG')
            face_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        else:
            face_data = None
        
        return {
            "features": features,
            "face_data": face_data,  # Only face region, not full image
            "timestamp": datetime.now().isoformat(),
            "version": "face_only_v2"  # Version identifier
        }
    except Exception as e:
        print(f"Face encoding failed: {e}")
        return None