from django.urls import path
from . import views

urlpatterns = [
    # OTP Authentication
    path('send-otp/', views.send_otp, name='send_otp'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
    
    # User Management
    path('register/', views.register_user, name='register_user'),
    
    # Face Authentication
    path('face-login/', views.face_login, name='face_login'),
    path('validate-face/', views.validate_face_quality, name='validate_face_quality'),
    path('migrate-face-data/', views.migrate_face_data, name='migrate_face_data'),
    path('debug-face/', views.debug_face_data, name='debug_face_data'),
    
    # Debug Endpoints
    path('debug-otp/', views.debug_otp_storage, name='debug_otp_storage'),
]