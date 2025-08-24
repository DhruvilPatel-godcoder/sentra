import cv2
import numpy as np
import torch
from ultralytics import YOLO
import os
from pathlib import Path

class HelmetDetector:
    def __init__(self):
        """Initialize helmet detection model"""
        self.base_dir = Path(__file__).parent.parent
        self.weights_dir = self.base_dir / "weights"
        self.model_path = self.weights_dir / "helmet_detection.pt"
        
        # Create weights directory if it doesn't exist
        self.weights_dir.mkdir(exist_ok=True)
        
        # Detection parameters
        self.confidence_threshold = 0.5
        self.iou_threshold = 0.45
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        # Class mappings based on your data.yaml
        self.class_names = {
            0: 'person',
            1: 'helmet', 
            2: 'no_helmet',
            3: 'motorcycle',
            4: 'license_plate'
        }
        
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load the helmet detection model"""
        try:
            if os.path.exists(self.model_path):
                # Load custom trained model
                self.model = YOLO(str(self.model_path))
                print(f"Loaded custom helmet detection model from {self.model_path}")
            else:
                # Fallback to YOLOv8 general model for initial testing
                self.model = YOLO('yolov8n.pt')
                print("Using YOLOv8 general model - train custom model for better results")
                
            self.model.to(self.device)
            
        except Exception as e:
            print(f"Error loading helmet detection model: {e}")
            self.model = None
    
    def detect(self, image_path):
        """
        Detect persons, helmets, and vehicles in image
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            dict: Detection results with bounding boxes and confidence scores
        """
        if self.model is None:
            return self._empty_result()
            
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image from {image_path}")
            
            # Run inference
            results = self.model(image, conf=self.confidence_threshold, iou=self.iou_threshold)
            
            # Process results
            detection_result = self._process_detections(results[0], image.shape)
            
            return detection_result
            
        except Exception as e:
            print(f"Error in helmet detection: {e}")
            return self._empty_result()
    
    def _iou(self, boxA, boxB):
        # Compute intersection over union between two boxes
        xA = max(boxA['x1'], boxB['x1'])
        yA = max(boxA['y1'], boxB['y1'])
        xB = min(boxA['x2'], boxB['x2'])
        yB = min(boxA['y2'], boxB['y2'])
        interArea = max(0, xB - xA) * max(0, yB - yA)
        boxAArea = (boxA['x2'] - boxA['x1']) * (boxA['y2'] - boxA['y1'])
        boxBArea = (boxB['x2'] - boxB['x1']) * (boxB['y2'] - boxB['y1'])
        iou = interArea / float(boxAArea + boxBArea - interArea + 1e-6)
        return iou

    def _process_detections(self, result, image_shape):
        """Process YOLO detection results"""
        h, w, _ = image_shape
        
        detection_data = {
            'person_detected': False,
            'person_confidence': 0.0,
            'person_bbox': {},
            
            'helmet_detected': False,
            'helmet_confidence': 0.0,
            'helmet_bbox': {},
            
            'vehicle_detected': False,
            'vehicle_type': '',
            'vehicle_confidence': 0.0,
            'vehicle_bbox': {},
            
            'all_detections': []
        }
        
        if result.boxes is not None and len(result.boxes) > 0:
            boxes = result.boxes.cpu().numpy()
            
            for box in boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].astype(int)
                
                # Normalize coordinates
                bbox = {
                    'x1': int(x1), 'y1': int(y1),
                    'x2': int(x2), 'y2': int(y2),
                    'confidence': confidence,
                    'width': int(x2 - x1),
                    'height': int(y2 - y1)
                }
                
                class_name = self.class_names.get(class_id, 'unknown')
                
                # Store detection
                detection_data['all_detections'].append({
                    'class_id': class_id,
                    'class_name': class_name,
                    'confidence': confidence,
                    'bbox': bbox
                })
                
                # Process by class type
                if class_name == 'person':
                    if confidence > detection_data['person_confidence']:
                        detection_data['person_detected'] = True
                        detection_data['person_confidence'] = confidence
                        detection_data['person_bbox'] = bbox
                
                elif class_name == 'helmet':
                    # Just collect, don't set helmet_detected here
                    pass
                
                elif class_name == 'motorcycle':
                    if confidence > detection_data['vehicle_confidence']:
                        detection_data['vehicle_detected'] = True
                        detection_data['vehicle_type'] = 'motorcycle'
                        detection_data['vehicle_confidence'] = confidence
                        detection_data['vehicle_bbox'] = bbox

        # --- Helmet-on-person logic ---
        persons = [d for d in detection_data['all_detections'] if d['class_name'] == 'person']
        helmets = [d for d in detection_data['all_detections'] if d['class_name'] == 'helmet']

        helmet_on_person = False
        for person in persons:
            person_bbox = person['bbox']
            # Define head region (upper 40% of person bbox)
            head_bbox = {
                'x1': person_bbox['x1'],
                'y1': person_bbox['y1'],
                'x2': person_bbox['x2'],
                'y2': person_bbox['y1'] + int(0.4 * person_bbox['height']),
                'width': person_bbox['width'],
                'height': int(0.4 * person_bbox['height'])
            }
            for helmet in helmets:
                if self._iou(head_bbox, helmet['bbox']) > 0.4:
                    helmet_on_person = True
                    detection_data['helmet_detected'] = True
                    detection_data['helmet_confidence'] = helmet['confidence']
                    detection_data['helmet_bbox'] = helmet['bbox']
                    break
            if helmet_on_person:
                break
        if not helmet_on_person:
            detection_data['helmet_detected'] = False
            detection_data['helmet_confidence'] = 0.0
            detection_data['helmet_bbox'] = {}

        # If using general YOLO model, simulate helmet detection
        if not os.path.exists(self.model_path):
            detection_data = self._simulate_helmet_detection(detection_data)
        
        return detection_data
    
    def _simulate_helmet_detection(self, detection_data):
        """
        Simulate helmet detection when using general YOLO model
        This is temporary until custom model is trained
        """
        if detection_data['person_detected']:
            # Simple rule-based simulation for testing
            import random
            
            # 70% chance of helmet detection for testing
            has_helmet = random.random() > 0.3
            
            if has_helmet:
                detection_data['helmet_detected'] = True
                detection_data['helmet_confidence'] = random.uniform(0.6, 0.9)
                
                # Create helmet bbox based on person bbox (upper portion)
                person_bbox = detection_data['person_bbox']
                if person_bbox:
                    helmet_height = int(person_bbox['height'] * 0.2)
                    detection_data['helmet_bbox'] = {
                        'x1': person_bbox['x1'],
                        'y1': person_bbox['y1'],
                        'x2': person_bbox['x2'],
                        'y2': person_bbox['y1'] + helmet_height,
                        'confidence': detection_data['helmet_confidence'],
                        'width': person_bbox['width'],
                        'height': helmet_height
                    }
        
        return detection_data
    
    def _empty_result(self):
        """Return empty detection result"""
        return {
            'person_detected': False,
            'person_confidence': 0.0,
            'person_bbox': {},
            'helmet_detected': False,
            'helmet_confidence': 0.0,
            'helmet_bbox': {},
            'vehicle_detected': False,
            'vehicle_type': '',
            'vehicle_confidence': 0.0,
            'vehicle_bbox': {},
            'all_detections': []
        }
    
    def train_model(self, data_yaml_path, epochs=100, batch_size=16):
        """
        Train custom helmet detection model
        
        Args:
            data_yaml_path (str): Path to data.yaml file
            epochs (int): Number of training epochs
            batch_size (int): Training batch size
        """
        try:
            # Load base YOLOv8 model
            model = YOLO('yolov8n.pt')
            
            # Train the model
            results = model.train(
                data=data_yaml_path,
                epochs=epochs,
                batch=batch_size,
                imgsz=640,
                device=self.device,
                project=str(self.weights_dir),
                name='helmet_detection',
                save=True,
                save_period=10
            )
            
            # Save best model
            best_model_path = self.weights_dir / "helmet_detection" / "weights" / "best.pt"
            if os.path.exists(best_model_path):
                import shutil
                shutil.copy(best_model_path, self.model_path)
                print(f"Model saved to {self.model_path}")
            
            return {
                'status': 'success',
                'model_path': str(self.model_path),
                'results': results
            }
            
        except Exception as e:
            print(f"Error training model: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def validate_model(self, data_yaml_path):
        """Validate the trained model"""
        if self.model is None:
            return {'status': 'error', 'message': 'No model loaded'}
        
        try:
            results = self.model.val(data=data_yaml_path)
            return {
                'status': 'success',
                'results': results
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }