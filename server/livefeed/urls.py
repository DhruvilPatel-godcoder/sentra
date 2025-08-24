from django.urls import path
from . import views

urlpatterns = [
    path('cameras/', views.get_cameras, name='get_cameras'),
    path('cameras/<str:camera_id>/status/', views.get_camera_status, name='get_camera_status'),
    path('detections/', views.get_live_detections, name='get_live_detections'),
    path('stream/<str:camera_id>/', views.get_camera_stream, name='get_camera_stream'),
]