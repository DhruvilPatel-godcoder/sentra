import os
import yaml
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from ultralytics import YOLO
import torch
from pymongo import MongoClient

# MongoDB connection
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client["sentra"]
training_logs = db["training_logs"]

class ModelTrainer:
    def __init__(self):
        """Initialize helmet detection model trainer"""
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / "data"
        self.weights_dir = self.base_dir / "weights"
        self.config_dir = self.base_dir / "config"
        
        # Training state tracking
        self.is_training_active = False
        self.current_training_id = None
        self.training_progress = 0
        self.training_status = 'idle'
        self.current_epoch = 0
        self.total_epochs = 0
        
        # Custom training configuration for helmet detection
        self.helmet_training_config = {
            'epochs': 100,
            'batch_size': 16,
            'image_size': 640,
            'learning_rate': 0.01,
            'patience': 50,
            'save_frequency': 10,
            'augmentation_strength': 0.5,
            'confidence_threshold': 0.25,
            'iou_threshold': 0.45
        }
        
        # Device setup
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Model training will use: {self.device}")
    
    def initiate_helmet_training(self, custom_params=None):
        """
        Start helmet detection model training
        
        Args:
            custom_params (dict): Override default training parameters
        """
        if self.is_training_active:
            raise Exception("Training session already running")
        
        try:
            # Create unique training session ID
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            self.current_training_id = f"HELMET_TRAIN_{timestamp}_{uuid.uuid4().hex[:8]}"
            
            # Merge training parameters
            training_config = self.helmet_training_config.copy()
            if custom_params:
                training_config.update(custom_params)
            
            # Setup training session
            self._setup_training_session(training_config)
            
            # Begin training process
            self.is_training_active = True
            self.training_status = 'initializing'
            self.training_progress = 0
            
            # Execute model training
            self._execute_helmet_training(training_config)
            
        except Exception as error:
            print(f"Training initialization failed: {error}")
            self.training_status = 'failed'
            self._log_training_error(str(error))
        finally:
            self.is_training_active = False
    
    def _execute_helmet_training(self, config):
        """Execute the actual helmet detection training process"""
        try:
            # Locate dataset configuration
            dataset_config_path = self.data_dir / "data.yaml"
            
            if not dataset_config_path.exists():
                raise FileNotFoundError(f"Dataset config missing: {dataset_config_path}")
            
            # Verify dataset integrity
            self._verify_dataset_structure(dataset_config_path)
            
            # Initialize YOLO model for helmet detection
            helmet_model = YOLO('yolov8n.pt')  # Use nano version for faster training
            
            # Setup training parameters specific to helmet detection
            training_settings = {
                'data': str(dataset_config_path),
                'epochs': config['epochs'],
                'batch': config['batch_size'],
                'imgsz': config['image_size'],
                'lr0': config['learning_rate'],
                'patience': config['patience'],
                'save_period': config['save_frequency'],
                'device': self.device,
                'project': str(self.weights_dir),
                'name': f'helmet_model_{self.current_training_id}',
                'exist_ok': True,
                'pretrained': True,
                'optimizer': 'AdamW',  # Better for helmet detection
                'verbose': True,
                'seed': 42,
                'deterministic': True,
                'rect': True,  # Rectangular training for better efficiency
                'cos_lr': True,  # Cosine learning rate scheduler
                'close_mosaic': 10,
                'resume': False,
                'amp': True,  # Mixed precision training
                'fraction': 1.0,
                'profile': False,
                'freeze': None,
                'multi_scale': True,  # Multi-scale training for robustness
                'overlap_mask': True,
                'mask_ratio': 4,
                'dropout': 0.0,
                'val': True,
                'plots': True,
                'save_json': True,
                'conf': config['confidence_threshold'],
                'iou': config['iou_threshold'],
                'max_det': 300,
                'half': False,
                'dnn': False,
                'augment': True,
                'agnostic_nms': False,
                'retina_masks': False,
                'boxes': True
            }
            
            # Store training configuration
            self.total_epochs = config['epochs']
            self._log_training_start(training_settings)
            
            # Custom training loop with progress tracking
            self._train_with_progress_monitoring(helmet_model, training_settings)
            
            # Post-training operations
            self._finalize_training()
            
        except Exception as error:
            print(f"Training execution failed: {error}")
            self.training_status = 'failed'
            self._log_training_error(str(error))
            raise error
    
    def _train_with_progress_monitoring(self, model, settings):
        """Train model with custom progress monitoring"""
        try:
            self.training_status = 'training'
            
            # Custom callback for progress tracking
            def training_callback(trainer):
                if hasattr(trainer, 'epoch'):
                    self.current_epoch = trainer.epoch + 1
                    self.training_progress = (self.current_epoch / self.total_epochs) * 100
                    
                    # Update training log
                    progress_data = {
                        'current_epoch': self.current_epoch,
                        'total_epochs': self.total_epochs,
                        'progress_percentage': self.training_progress,
                        'status': 'training',
                        'last_updated': datetime.now()
                    }
                    
                    if hasattr(trainer, 'loss'):
                        progress_data['current_loss'] = float(trainer.loss)
                    
                    self._update_training_log(progress_data)
                    print(f"Training progress: {self.training_progress:.1f}% - Epoch {self.current_epoch}/{self.total_epochs}")
            
            # Add callback to model
            model.add_callback('on_train_epoch_end', training_callback)
            
            # Start training
            training_results = model.train(**settings)
            
            # Training completed successfully
            self.training_status = 'completed'
            self.training_progress = 100
            
            # Save best model to weights directory
            self._save_trained_model(training_results)
            
            return training_results
            
        except Exception as error:
            self.training_status = 'failed'
            raise error
    
    def _verify_dataset_structure(self, config_path):
        """Verify dataset has required structure for helmet detection"""
        try:
            with open(config_path, 'r') as file:
                dataset_config = yaml.safe_load(file)
            
            # Check required paths
            required_dirs = ['train', 'val', 'test']
            for dir_type in required_dirs:
                if dir_type in dataset_config:
                    images_path = self.data_dir / dataset_config[dir_type] / 'images'
                    labels_path = self.data_dir / dataset_config[dir_type] / 'labels'
                    
                    if not images_path.exists():
                        raise FileNotFoundError(f"Missing {dir_type} images directory: {images_path}")
                    
                    if not labels_path.exists():
                        raise FileNotFoundError(f"Missing {dir_type} labels directory: {labels_path}")
                    
                    # Check if directories have files
                    image_files = list(images_path.glob('*.*'))
                    label_files = list(labels_path.glob('*.txt'))
                    
                    if len(image_files) == 0:
                        raise ValueError(f"No images found in {images_path}")
                    
                    if len(label_files) == 0:
                        raise ValueError(f"No label files found in {labels_path}")
                    
                    print(f"Dataset verification: {dir_type} - {len(image_files)} images, {len(label_files)} labels")
            
            # Verify class configuration
            if 'names' not in dataset_config:
                raise ValueError("Class names not defined in data.yaml")
            
            print(f"Dataset verification successful. Classes: {dataset_config['names']}")
            
        except Exception as error:
            print(f"Dataset verification failed: {error}")
            raise error
    
    def _setup_training_session(self, config):
        """Initialize training session in database"""
        session_data = {
            'training_id': self.current_training_id,
            'model_type': 'helmet_detection',
            'status': 'initializing',
            'config': config,
            'device': self.device,
            'created_at': datetime.now(),
            'progress_percentage': 0,
            'current_epoch': 0,
            'total_epochs': config['epochs']
        }
        
        training_logs.insert_one(session_data)
        print(f"Training session initialized: {self.current_training_id}")
    
    def _log_training_start(self, settings):
        """Log training start with settings"""
        update_data = {
            'status': 'training',
            'training_settings': settings,
            'started_at': datetime.now()
        }
        self._update_training_log(update_data)
    
    def _save_trained_model(self, training_results):
        """Save the trained model to weights directory"""
        try:
            # Path to best model from training
            training_dir = self.weights_dir / f'helmet_model_{self.current_training_id}'
            best_model_path = training_dir / 'weights' / 'best.pt'
            
            if best_model_path.exists():
                # Copy to main weights directory
                final_model_path = self.weights_dir / 'helmet_detection.pt'
                import shutil
                shutil.copy2(best_model_path, final_model_path)
                
                print(f"Best model saved to: {final_model_path}")
                
                # Update training log
                self._update_training_log({
                    'status': 'completed',
                    'completed_at': datetime.now(),
                    'final_model_path': str(final_model_path),
                    'training_results': str(training_results)
                })
            else:
                raise FileNotFoundError("Best model weights not found after training")
                
        except Exception as error:
            print(f"Error saving trained model: {error}")
            raise error
    
    def _finalize_training(self):
        """Finalize training process"""
        self.training_status = 'completed'
        self.training_progress = 100
        print(f"Training completed successfully: {self.current_training_id}")
    
    def _update_training_log(self, update_data):
        """Update training log in database"""
        try:
            training_logs.update_one(
                {'training_id': self.current_training_id},
                {'$set': update_data}
            )
        except Exception as error:
            print(f"Error updating training log: {error}")
    
    def _log_training_error(self, error_message):
        """Log training error"""
        error_data = {
            'status': 'failed',
            'error_message': error_message,
            'failed_at': datetime.now()
        }
        self._update_training_log(error_data)
    
    def get_training_status(self):
        """Get current training status"""
        return {
            'training_id': self.current_training_id,
            'status': self.training_status,
            'progress': self.training_progress,
            'current_epoch': self.current_epoch,
            'total_epochs': self.total_epochs,
            'is_active': self.is_training_active,
            'device': self.device
        }
    
    def is_training(self):
        """Check if training is currently active"""
        return self.is_training_active
    
    def stop_training(self):
        """Stop current training session"""
        if self.is_training_active:
            self.training_status = 'stopped'
            self.is_training_active = False
            self._update_training_log({'status': 'stopped', 'stopped_at': datetime.now()})
            return True
        return False
    
    def get_training_history(self, limit=10):
        """Get training session history"""
        try:
            sessions = list(
                training_logs.find({}, {'_id': 0})
                .sort('created_at', -1)
                .limit(limit)
            )
            
            # Convert datetime objects for JSON serialization
            for session in sessions:
                for key, value in session.items():
                    if isinstance(value, datetime):
                        session[key] = value.isoformat()
            
            return sessions
        except Exception as error:
            print(f"Error getting training history: {error}")
            return []