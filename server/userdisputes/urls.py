from django.urls import path
from . import views

urlpatterns = [
    path('stats/<str:user_id>/', views.get_user_dispute_stats, name='get_user_dispute_stats'),
    path('history/<str:user_id>/', views.get_user_disputes_history, name='get_user_disputes_history'),
    path('pending-violations/<str:user_id>/', views.get_pending_violations_for_dispute, name='get_pending_violations_for_dispute'),
    path('submit/<str:user_id>/', views.submit_dispute, name='submit_dispute'),
    path('details/<str:user_id>/<str:appeal_id>/', views.get_dispute_details, name='get_dispute_details'),
    path('upload-evidence/<str:user_id>/<str:appeal_id>/', views.upload_evidence, name='upload_evidence'),
]

