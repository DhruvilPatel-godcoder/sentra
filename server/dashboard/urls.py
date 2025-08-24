from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.get_dashboard_stats, name='dashboard_stats'),
    path('recent-violations/', views.get_recent_violations, name='recent_violations'),
    path('violation-trends/', views.get_violation_trends, name='violation_trends'),
    path('top-locations/', views.get_top_locations, name='top_locations'),
]