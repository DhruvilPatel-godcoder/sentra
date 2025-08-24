import cv2
import numpy as np
import os
import uuid
from datetime import datetime
from pathlib import Path
from pymongo import MongoClient

# MongoDB connection
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client["sentra"]

# Collections
violations_collection = db["violations"]
users_collection = db["users"]
vehicles_collection = db["vehicles"]

class ViolationProcessor:
    def __init__(self):
        """Initialize violation processor"""
        self.base_dir = Path(__file__).parent.parent
        self.media_dir = self.base_dir / "media"
        self.violations_dir = self.media_dir / "violations"
        self.processed_dir = self.media_dir / "processed"
        
        # Create directories if they don't exist
        self.violations_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        
        # Violation rules
        self.violation_rules = {
            'helmet_required': True,
            'fine_amount': 500.00,
            'confidence_threshold': 0.5
        }
    
    def check_violation(self, detection_data):
        """
        Check if the detection data indicates a violation
        
        Args:
            detection_data (dict): Detection results
            
        Returns:
            bool: True if violation detected
        """
        try:
            # Check if person is detected
            person_detected = detection_data.get('person_detected', False)
            person_confidence = detection_data.get('person_confidence', 0.0)
            
            # Check if helmet is detected
            helmet_detected = detection_data.get('helmet_detected', False)
            helmet_confidence = detection_data.get('helmet_confidence', 0.0)
            
            # Check if vehicle is detected (motorcycle/bike)
            vehicle_detected = detection_data.get('vehicle_detected', False)
            
            # Violation logic: Person on vehicle without helmet
            if (person_detected and 
                person_confidence >= self.violation_rules['confidence_threshold'] and
                not helmet_detected):
                
                return True
            
            return False
            
        except Exception as e:
            print(f"Error checking violation: {e}")
            return False
    
    def create_annotated_image(self, original_image_path, detection_data):
        """
        Create annotated image with bounding boxes and violation markers
        
        Args:
            original_image_path (str): Path to original image
            detection_data (dict): Detection results
            
        Returns:
            str: Path to annotated image
        """
        try:
            # Load original image
            image = cv2.imread(original_image_path)
            if image is None:
                return original_image_path
            
            # Create copy for annotation
            annotated = image.copy()
            
            # Draw person bounding box
            person_bbox = detection_data.get('person_bbox', {})
            if person_bbox:
                x1, y1 = person_bbox.get('x1', 0), person_bbox.get('y1', 0)
                x2, y2 = person_bbox.get('x2', 0), person_bbox.get('y2', 0)
                confidence = person_bbox.get('confidence', 0.0)
                
                # Red box for person without helmet
                color = (0, 0, 255) if detection_data.get('is_violation') else (0, 255, 0)
                cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)
                
                # Label
                label = f"Person: {confidence:.2f}"
                if detection_data.get('is_violation'):
                    label += " - NO HELMET!"
                
                cv2.putText(annotated, label, (x1, y1-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            # Draw helmet bounding box if detected
            helmet_bbox = detection_data.get('helmet_bbox', {})
            if helmet_bbox:
                x1, y1 = helmet_bbox.get('x1', 0), helmet_bbox.get('y1', 0)
                x2, y2 = helmet_bbox.get('x2', 0), helmet_bbox.get('y2', 0)
                confidence = helmet_bbox.get('confidence', 0.0)
                
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(annotated, f"Helmet: {confidence:.2f}", (x1, y1-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
            # Draw license plate bounding box if detected
            plate_bbox = detection_data.get('plate_bbox', {})
            plate_number = detection_data.get('plate_number', '')
            if plate_bbox:
                x1, y1 = plate_bbox.get('x1', 0), plate_bbox.get('y1', 0)
                x2, y2 = plate_bbox.get('x2', 0), plate_bbox.get('y2', 0)
                
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (255, 0, 0), 2)
                if plate_number:
                    cv2.putText(annotated, plate_number, (x1, y2+25), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
            
            # Draw vehicle bounding box if detected
            vehicle_bbox = detection_data.get('vehicle_bbox', {})
            if vehicle_bbox:
                x1, y1 = vehicle_bbox.get('x1', 0), vehicle_bbox.get('y1', 0)
                x2, y2 = vehicle_bbox.get('x2', 0), vehicle_bbox.get('y2', 0)
                vehicle_type = detection_data.get('vehicle_type', 'Vehicle')
                
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (255, 255, 0), 2)
                cv2.putText(annotated, vehicle_type, (x1, y1-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
            
            # Add timestamp and violation status
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            camera_id = detection_data.get('camera_id', 'Unknown')
            
            # Background for text
            cv2.rectangle(annotated, (10, 10), (500, 80), (0, 0, 0), -1)
            
            # Text overlay
            cv2.putText(annotated, f"Camera: {camera_id}", 
                       (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.putText(annotated, f"Time: {timestamp}", 
                       (15, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            if detection_data.get('is_violation'):
                cv2.putText(annotated, "VIOLATION DETECTED!", 
                           (15, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            # Save annotated image
            base_name = os.path.basename(original_image_path)
            name, ext = os.path.splitext(base_name)
            annotated_filename = f"{name}_annotated_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
            annotated_path = self.processed_dir / annotated_filename
            
            cv2.imwrite(str(annotated_path), annotated)
            
            return str(annotated_path)
            
        except Exception as e:
            print(f"Error creating annotated image: {e}")
            return original_image_path
    
    def generate_violation_memo(self, detection_data):
        """
        Generate violation memo and save to database
        
        Args:
            detection_data (dict): Detection results
            
        Returns:
            dict: Violation memo data
        """
        try:
            plate_number = detection_data.get('plate_number', '')
            
            if not plate_number:
                return {
                    'status': 'error',
                    'message': 'No license plate detected'
                }
            
            # Get user and vehicle information
            vehicle_info = self._get_vehicle_info(plate_number)
            user_info = self._get_user_info(vehicle_info.get('owner_id', '')) if vehicle_info else None
            
            # Generate violation ID
            violation_id = f"VIO{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
            
            # Create violation memo
            violation_memo = {
                'violation_id': violation_id,
                'vehicle_id': vehicle_info.get('vehicle_id', '') if vehicle_info else '',
                'violation_type': 'helmet_violation',
                'fine_amount': self.violation_rules['fine_amount'],
                'location': f"Camera_{detection_data.get('camera_id', 'Unknown')}",
                'evidence_photo': detection_data.get('processed_image', ''),
                'status': 'pending',
                'created_at': datetime.now(),
                
                # Detection details
                'detection_details': {
                    'detection_id': detection_data.get('detection_id', ''),
                    'camera_id': detection_data.get('camera_id', ''),
                    'timestamp': detection_data.get('timestamp', datetime.now()),
                    'plate_number': plate_number,
                    'plate_confidence': detection_data.get('plate_confidence', 0.0),
                    'person_confidence': detection_data.get('person_confidence', 0.0),
                    'helmet_detected': detection_data.get('helmet_detected', False)
                }
            }
            
            # Add user and vehicle info if available
            if user_info:
                violation_memo['user_details'] = {
                    'user_id': user_info.get('user_id', ''),
                    'name': user_info.get('name', ''),
                    'mobile_number': user_info.get('mobile_number', ''),
                    'email': user_info.get('email', ''),
                    'dl_number': user_info.get('dl_number', '')
                }
            
            if vehicle_info:
                violation_memo['vehicle_details'] = {
                    'vehicle_id': vehicle_info.get('vehicle_id', ''),
                    'plate_number': vehicle_info.get('plate_number', ''),
                    'make': vehicle_info.get('make', ''),
                    'model': vehicle_info.get('model', ''),
                    'vehicle_type': vehicle_info.get('vehicle_type', '')
                }
            
            # Save to database
            violations_collection.insert_one(violation_memo)
            
            # Copy evidence image to violations folder
            self._save_violation_evidence(detection_data, violation_id)
            
            return {
                'status': 'success',
                'violation_id': violation_id,
                'memo': violation_memo
            }
            
        except Exception as e:
            print(f"Error generating violation memo: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def _get_vehicle_info(self, plate_number):
        """Get vehicle information from database"""
        try:
            vehicle = vehicles_collection.find_one({"plate_number": plate_number})
            if vehicle:
                vehicle.pop('_id', None)  # Remove MongoDB ObjectId
            return vehicle
        except Exception as e:
            print(f"Error getting vehicle info: {e}")
            return None
    
    def _get_user_info(self, user_id):
        """Get user information from database"""
        try:
            user = users_collection.find_one({"user_id": user_id})
            if user:
                user.pop('_id', None)  # Remove MongoDB ObjectId
                user.pop('face_data', None)  # Remove binary face data
            return user
        except Exception as e:
            print(f"Error getting user info: {e}")
            return None
    
    def _save_violation_evidence(self, detection_data, violation_id):
        """Save violation evidence images"""
        try:
            # Copy processed image to violations folder
            processed_image = detection_data.get('processed_image', '')
            if processed_image and os.path.exists(processed_image):
                evidence_filename = f"{violation_id}_evidence.jpg"
                evidence_path = self.violations_dir / evidence_filename
                
                import shutil
                shutil.copy2(processed_image, evidence_path)
                
                return str(evidence_path)
                
        except Exception as e:
            print(f"Error saving violation evidence: {e}")
            return None
    
    def create_violation_memo(self, violation_data):
        """Create violation memo from provided data"""
        try:
            violation_id = f"VIO{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
            
            memo = {
                'violation_id': violation_id,
                'vehicle_id': violation_data.get('vehicle_id', ''),
                'violation_type': violation_data.get('violation_type', 'helmet_violation'),
                'fine_amount': violation_data.get('fine_amount', self.violation_rules['fine_amount']),
                'location': violation_data.get('location', ''),
                'evidence_photo': violation_data.get('evidence_photo', ''),
                'status': 'pending',
                'created_at': datetime.now()
            }
            
            violations_collection.insert_one(memo)
            
            return memo
            
        except Exception as e:
            print(f"Error creating violation memo: {e}")
            raise e