from django.urls import path
from . import views

urlpatterns = [
    path('search/', views.search_vehicle_documents, name='search_vehicle_documents'),
    path('statistics/', views.get_document_statistics, name='get_document_statistics'),
    path('send-notice/', views.send_document_notice, name='send_document_notice'),
    path('flag-vehicle/', views.flag_vehicle, name='flag_vehicle'),
    path('generate-report/', views.generate_report, name='generate_report'),
]