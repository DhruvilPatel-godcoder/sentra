
from django.contrib import admin
from django.urls import path,include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/authentication/',include('authentication.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/livefeed/', include('livefeed.urls')),
    path('api/aidetection/', include('aidetection.urls')),
    path('api/penalty/', include('penalty.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/userlogin/', include('userlogin.urls')),
    path('api/userdashboard/', include('userdashboard.urls')),
    path('api/userpayments/', include('userpayments.urls')),
    path('api/userviolations/', include('userviolations.urls')),
    path('api/userdisputes/', include('userdisputes.urls')),
    path('api/uservehicles/', include('uservehicles.urls')),
    path('api/livedetection/', include('livedetection.urls')),
]
