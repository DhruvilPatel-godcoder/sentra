from django.urls import path
from . import views

urlpatterns = [
    path('data/', views.get_penalty_data, name='get_penalty_data'),
    path('details/<str:penalty_id>/', views.get_penalty_details, name='get_penalty_details'),
    path('send-notice/', views.send_penalty_notice, name='send_penalty_notice'),
    path('update-status/', views.update_penalty_status, name='update_penalty_status'),
    path('process-payment/', views.process_payment, name='process_payment'),
]