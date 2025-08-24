from django.db import models
from datetime import datetime
import uuid

class DetectionSession(models.Model):
    session_id = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    camera_id = models.CharField(max_length=20)
    location = models.CharField(max_length=200, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    total_detections = models.IntegerField(default=0)
    total_violations = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'detection_sessions'
    
    def __str__(self):
        return f"Session {self.session_id} - {self.camera_id}"

class HelmetDetection(models.Model):
    detection_id = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    session = models.ForeignKey(DetectionSession, on_delete=models.CASCADE, null=True, blank=True)
    camera_id = models.CharField(max_length=20)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # File paths
    original_image = models.CharField(max_length=500)
    processed_image = models.CharField(max_length=500, blank=True)
    
    # Detection results
    person_detected = models.BooleanField(default=False)
    person_confidence = models.FloatField(default=0.0)
    person_bbox = models.JSONField(default=dict)  # {x1, y1, x2, y2}
    
    helmet_detected = models.BooleanField(default=False)
    helmet_confidence = models.FloatField(default=0.0)
    helmet_bbox = models.JSONField(default=dict)
    
    # Vehicle detection
    vehicle_detected = models.BooleanField(default=False)
    vehicle_type = models.CharField(max_length=50, blank=True)
    vehicle_bbox = models.JSONField(default=dict)
    
    # License plate detection
    plate_detected = models.BooleanField(default=False)
    plate_number = models.CharField(max_length=20, blank=True)
    plate_confidence = models.FloatField(default=0.0)
    plate_bbox = models.JSONField(default=dict)
    
    # Violation status
    is_violation = models.BooleanField(default=False)
    violation_type = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'helmet_detections'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Detection {self.detection_id} - {self.camera_id}"

class TrainingSession(models.Model):
    training_id = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    model_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('training', 'Training'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='pending')
    
    # Training parameters
    epochs = models.IntegerField(default=100)
    batch_size = models.IntegerField(default=16)
    learning_rate = models.FloatField(default=0.01)
    
    # Progress tracking
    current_epoch = models.IntegerField(default=0)
    best_accuracy = models.FloatField(default=0.0)
    training_loss = models.FloatField(default=0.0)
    validation_loss = models.FloatField(default=0.0)
    
    # File paths
    model_weights_path = models.CharField(max_length=500, blank=True)
    training_log_path = models.CharField(max_length=500, blank=True)
    
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'training_sessions'
        ordering = ['-started_at']
    
    def __str__(self):
        return f"Training {self.training_id} - {self.status}"