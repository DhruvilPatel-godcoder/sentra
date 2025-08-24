from django.urls import path
from . import views

urlpatterns = [
    path('stats/<str:user_id>/', views.get_user_violation_stats, name='get_user_violation_stats'),
    path('history/<str:user_id>/', views.get_user_violations_history, name='get_user_violations_history'),
    path('pay/<str:user_id>/', views.pay_violation, name='pay_violation'),
    path('dispute/<str:user_id>/', views.submit_dispute, name='submit_dispute'),
    path('evidence/<str:user_id>/<str:violation_id>/', views.download_evidence, name='download_evidence'),
    path('details/<str:user_id>/<str:violation_id>/', views.get_violation_details, name='get_violation_details'),
]