import os
from datetime import datetime, timedelta
from pymongo import MongoClient
import json

class DatabaseHandler:
    def __init__(self):
        """Initialize database connection and collections"""
        self.mongo_uri = "mongodb://localhost:27017/"
        self.client = MongoClient(self.mongo_uri)
        self.db = self.client["sentra"]
        
        # Collections based on your schema
        self.users = self.db["users"]
        self.vehicles = self.db["vehicles"]
        self.violations = self.db["violations"]
        self.payments = self.db["payments"]
        self.notifications = self.db["notifications"]
        self.appeals = self.db["appeals"]
        self.documents = self.db["documents"]
        self.cameras = self.db["cameras"]
        
        # Custom collections for helmet detection
        self.detections = self.db["helmet_detections"]
        self.sessions = self.db["detection_sessions"]
        self.training_logs = self.db["training_logs"]
    
    def save_detection(self, detection_data):
        """Save detection result to database"""
        try:
            # Convert datetime objects to ISO format for MongoDB
            if 'timestamp' in detection_data and isinstance(detection_data['timestamp'], datetime):
                detection_data['timestamp'] = detection_data['timestamp']
            
            # Insert detection record
            result = self.detections.insert_one(detection_data)
            
            return {
                'status': 'success',
                'detection_id': detection_data.get('detection_id'),
                'mongo_id': str(result.inserted_id)
            }
            
        except Exception as e:
            print(f"Error saving detection: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def get_detections(self, limit=20, camera_id=None, violation_only=False):
        """Get detection history from database"""
        try:
            # Build query
            query = {}
            if camera_id:
                query['camera_id'] = camera_id
            if violation_only:
                query['is_violation'] = True
            
            # Get detections with pagination
            detections = list(
                self.detections.find(query, {'_id': 0})
                .sort('timestamp', -1)
                .limit(limit)
            )
            
            # Convert datetime objects to ISO strings for JSON serialization
            for detection in detections:
                if 'timestamp' in detection:
                    detection['timestamp'] = detection['timestamp'].isoformat()
            
            return detections
            
        except Exception as e:
            print(f"Error getting detections: {e}")
            return []
    
    def get_violations(self, limit=10, status=None):
        """Get violation memos from database"""
        try:
            # Build query
            query = {}
            if status:
                query['status'] = status
            
            # Get violations
            violations = list(
                self.violations.find(query, {'_id': 0})
                .sort('created_at', -1)
                .limit(limit)
            )
            
            # Convert datetime objects to ISO strings
            for violation in violations:
                if 'created_at' in violation:
                    violation['created_at'] = violation['created_at'].isoformat()
                if 'detection_details' in violation and 'timestamp' in violation['detection_details']:
                    violation['detection_details']['timestamp'] = violation['detection_details']['timestamp'].isoformat()
            
            return violations
            
        except Exception as e:
            print(f"Error getting violations: {e}")
            return []
    
    def get_statistics(self, time_range='24h'):
        """Get detection and violation statistics"""
        try:
            # Calculate time filter
            now = datetime.now()
            if time_range == '24h':
                start_time = now - timedelta(hours=24)
            elif time_range == '7d':
                start_time = now - timedelta(days=7)
            elif time_range == '30d':
                start_time = now - timedelta(days=30)
            else:
                start_time = now - timedelta(hours=24)
            
            # Get total detections
            total_detections = self.detections.count_documents({
                'timestamp': {'$gte': start_time}
            })
            
            # Get total violations
            total_violations = self.detections.count_documents({
                'timestamp': {'$gte': start_time},
                'is_violation': True
            })
            
            # Get total memos
            total_memos = self.violations.count_documents({
                'created_at': {'$gte': start_time}
            })
            
            # Calculate violation rate
            violation_rate = (total_violations / total_detections * 100) if total_detections > 0 else 0
            
            # Get hourly breakdown
            pipeline = [
                {'$match': {'timestamp': {'$gte': start_time}}},
                {'$group': {
                    '_id': {
                        'hour': {'$hour': '$timestamp'},
                        'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}}
                    },
                    'total_detections': {'$sum': 1},
                    'violations': {'$sum': {'$cond': ['$is_violation', 1, 0]}}
                }},
                {'$sort': {'_id.date': 1, '_id.hour': 1}}
            ]
            
            hourly_stats = list(self.detections.aggregate(pipeline))
            
            # Get camera-wise statistics
            camera_pipeline = [
                {'$match': {'timestamp': {'$gte': start_time}}},
                {'$group': {
                    '_id': '$camera_id',
                    'total_detections': {'$sum': 1},
                    'violations': {'$sum': {'$cond': ['$is_violation', 1, 0]}}
                }}
            ]
            
            camera_stats = list(self.detections.aggregate(camera_pipeline))
            
            return {
                'total_detections': total_detections,
                'total_violations': total_violations,
                'total_memos': total_memos,
                'violation_rate': round(violation_rate, 2),
                'time_range': time_range,
                'hourly_breakdown': hourly_stats,
                'camera_breakdown': camera_stats
            }
            
        except Exception as e:
            print(f"Error getting statistics: {e}")
            return {
                'total_detections': 0,
                'total_violations': 0,
                'total_memos': 0,
                'violation_rate': 0,
                'time_range': time_range,
                'hourly_breakdown': [],
                'camera_breakdown': []
            }
    
    def get_user_by_id(self, user_id):
        """Get user information by user ID"""
        try:
            user = self.users.find_one({'user_id': user_id}, {'_id': 0, 'face_data': 0})
            return user
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None
    
    def get_vehicle_by_plate(self, plate_number):
        """Get vehicle information by plate number"""
        try:
            vehicle = self.vehicles.find_one({'plate_number': plate_number}, {'_id': 0})
            return vehicle
        except Exception as e:
            print(f"Error getting vehicle by plate: {e}")
            return None
    
    def save_training_log(self, training_data):
        """Save training session log"""
        try:
            training_data['created_at'] = datetime.now()
            result = self.training_logs.insert_one(training_data)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error saving training log: {e}")
            return None
    
    def update_training_progress(self, training_id, progress_data):
        """Update training progress"""
        try:
            self.training_logs.update_one(
                {'training_id': training_id},
                {'$set': progress_data}
            )
            return True
        except Exception as e:
            print(f"Error updating training progress: {e}")
            return False
    
    def get_cameras(self):
        """Get all cameras from database"""
        try:
            cameras = list(self.cameras.find({}, {'_id': 0}))
            return cameras
        except Exception as e:
            print(f"Error getting cameras: {e}")
            return []
    
    def save_violation_memo(self, memo_data):
        """Save violation memo to database"""
        try:
            memo_data['created_at'] = datetime.now()
            result = self.violations.insert_one(memo_data)
            return {
                'status': 'success',
                'violation_id': memo_data.get('violation_id'),
                'mongo_id': str(result.inserted_id)
            }
        except Exception as e:
            print(f"Error saving violation memo: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def get_bank_account(self, user_id):
        """Get bank account information for user"""
        try:
            account = self.db["bank_accounts"].find_one({'user_id': user_id}, {'_id': 0})
            return account
        except Exception as e:
            print(f"Error getting bank account: {e}")
            return None
    
    def create_payment_record(self, payment_data):
        """Create payment record for violation"""
        try:
            payment_data['created_at'] = datetime.now()
            result = self.payments.insert_one(payment_data)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error creating payment record: {e}")
            return None
    
    def update_violation_status(self, violation_id, status):
        """Update violation status"""
        try:
            self.violations.update_one(
                {'violation_id': violation_id},
                {'$set': {'status': status}}
            )
            return True
        except Exception as e:
            print(f"Error updating violation status: {e}")
            return False
    
    def close_connection(self):
        """Close database connection"""
        try:
            self.client.close()
        except Exception as e:
            print(f"Error closing database connection: {e}")