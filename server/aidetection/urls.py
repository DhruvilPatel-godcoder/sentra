from django.urls import path
from . import views

urlpatterns = [
    path('test/', views.test_endpoint, name='test_endpoint'),
    path('data/', views.get_ai_detection_data, name='get_ai_detection_data'),
    path('violation/<str:violation_id>/', views.get_violation_details, name='get_violation_details'),
    path('update-status/', views.update_violation_status, name='update_violation_status'),
    path('add-live-detection/', views.add_live_detection, name='add_live_detection'),
]