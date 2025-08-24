from django.urls import path
from . import views

urlpatterns = [
    path('stats/<str:user_id>/', views.get_user_vehicle_stats, name='get_user_vehicle_stats'),
    path('list/<str:user_id>/', views.get_user_vehicles_with_documents, name='get_user_vehicles_with_documents'),
    path('upload-document/<str:user_id>/', views.upload_vehicle_document, name='upload_vehicle_document'),
    path('download-document/<str:user_id>/<str:vehicle_id>/<str:document_type>/', views.download_vehicle_document, name='download_vehicle_document'),
    path('renew-document/<str:user_id>/', views.renew_vehicle_document, name='renew_vehicle_document'),
    path('pay-fines/<str:user_id>/', views.pay_fines_to_unblock, name='pay_fines_to_unblock'),
]