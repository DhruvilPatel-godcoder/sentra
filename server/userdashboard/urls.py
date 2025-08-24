from django.urls import path
from . import views

urlpatterns = [
    path('stats/<str:user_id>/', views.get_user_dashboard_stats, name='get_user_dashboard_stats'),
    path('violations/<str:user_id>/', views.get_recent_violations, name='get_recent_violations'),
    path('vehicles/<str:user_id>/', views.get_user_vehicles, name='get_user_vehicles'),
    path('payments/<str:user_id>/', views.get_user_payments, name='get_user_payments'),
    path('profile/<str:user_id>/', views.get_user_profile, name='get_user_profile'),
]