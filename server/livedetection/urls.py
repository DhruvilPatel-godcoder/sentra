from django.urls import path
from . import views

urlpatterns = [
    # Image processing
    path('process-image/', views.process_image, name='process_image'),
    path('detections/', views.get_detections, name='get_detections'),
    path('violations/', views.get_violations, name='get_violations'),
    path('stats/', views.get_stats, name='get_stats'),
    
    # Model training
    path('train-model/', views.train_model, name='train_model'),
    path('training-status/', views.get_training_status, name='get_training_status'),
    
    # User and vehicle data
    path('user-by-plate/', views.get_user_by_plate, name='get_user_by_plate'),
    path('process-violation/', views.process_violation, name='process_violation'),
    
    # Camera management
    path('cameras/', views.get_cameras, name='get_cameras'),
    
    # File serving
    path('media/<path:file_path>/', views.serve_media, name='serve_media'),
]