from django.urls import path
from . import views

urlpatterns = [
    path('stats/<str:user_id>/', views.get_user_payment_stats, name='get_user_payment_stats'),
    path('history/<str:user_id>/', views.get_user_payment_history, name='get_user_payment_history'),
    path('retry/<str:user_id>/', views.retry_failed_payment, name='retry_failed_payment'),
    path('receipt/<str:user_id>/<str:payment_id>/', views.download_payment_receipt, name='download_payment_receipt'),
    path('pending/<str:user_id>/', views.get_pending_violations, name='get_pending_violations'),
    path('bulk-pay/<str:user_id>/', views.process_bulk_payment, name='process_bulk_payment'),
]