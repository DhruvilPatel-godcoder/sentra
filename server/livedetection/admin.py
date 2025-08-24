from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
import json

# Register models for Django admin interface (even though we use MongoDB)
@admin.register(admin.models.LogEntry)
class DetectionAdmin(admin.ModelAdmin):
    """Admin interface for viewing detection logs"""
    list_display = ['action_time', 'user', 'content_type', 'object_repr', 'action_flag']
    list_filter = ['action_time', 'content_type', 'action_flag']
    search_fields = ['object_repr', 'change_message']
    readonly_fields = ['action_time', 'user', 'content_type', 'object_id', 'object_repr', 'action_flag', 'change_message']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False

# Custom admin site configuration
admin.site.site_header = "Sentra Helmet Detection Admin"
admin.site.site_title = "Helmet Detection"
admin.site.index_title = "Live Detection Administration"

# Add custom admin views for MongoDB data
class MongoDataAdmin:
    """Custom admin interface for MongoDB data"""
    
    def __init__(self):
        from pymongo import MongoClient
        self.client = MongoClient("mongodb://localhost:27017/")
        self.db = self.client["sentra"]
    
    def get_detection_stats(self):
        """Get detection statistics for admin dashboard"""
        try:
            total_detections = self.db.helmet_detections.count_documents({})
            total_violations = self.db.violations.count_documents({})
            active_cameras = self.db.cameras.count_documents({'status': 'active'})
            
            return {
                'total_detections': total_detections,
                'total_violations': total_violations,
                'active_cameras': active_cameras
            }
        except Exception as e:
            return {'error': str(e)}

# Initialize MongoDB admin
mongo_admin = MongoDataAdmin()