from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pymongo import MongoClient
from datetime import datetime, timedelta
import json

# MongoDB Connection
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client["sentra"]

# Collections
users_collection = db["admin"]
bank_accounts_collection = db["bank_accounts"]
vehicles_collection = db["vehicles"]
violations_collection = db["violations"]
payments_collection = db["payments"]
notifications_collection = db["notifications"]
appeals_collection = db["appeals"]
documents_collection = db["documents"]

@csrf_exempt
def get_dashboard_stats(request):
    if request.method == 'GET':
        try:
            # Get today's date range
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            tomorrow = today + timedelta(days=1)
            
            # Calculate statistics
            total_violations = violations_collection.count_documents({})
            today_violations = violations_collection.count_documents({
                "created_at": {"$gte": today, "$lt": tomorrow}
            })
            
            pending_violations = violations_collection.count_documents({"status": "pending"})
            paid_violations = violations_collection.count_documents({"status": "paid"})
            
            # Calculate revenue
            total_revenue = 0
            today_revenue = 0
            
            paid_payments = list(payments_collection.find({"payment_status": "success"}))
            for payment in paid_payments:
                total_revenue += payment.get("amount", 0)
                if payment.get("created_at", datetime.min) >= today:
                    today_revenue += payment.get("amount", 0)
            
            # Active users count
            active_users = users_collection.count_documents({"is_active": True})
            
            # Pending appeals
            pending_appeals = appeals_collection.count_documents({"status": "pending"})
            
            # Calculate changes (mock percentage for now)
            violation_change = "+12%" if today_violations > 0 else "0%"
            revenue_change = "+8%" if today_revenue > 0 else "0%"
            
            stats = {
                'active_cameras': 24,  # Static for now
                'today_violations': today_violations,
                'pending_penalties': pending_violations,
                'revenue_today': today_revenue,
                'total_violations': total_violations,
                'paid_violations': paid_violations,
                'total_revenue': total_revenue,
                'active_users': active_users,
                'pending_appeals': pending_appeals,
                'camera_change': '+2',
                'violation_change': violation_change,
                'penalty_change': f"{pending_violations}",
                'revenue_change': revenue_change
            }
            
            return JsonResponse({
                'status': 'success',
                'data': stats
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)

@csrf_exempt
def get_recent_violations(request):
    if request.method == 'GET':
        try:
            # Get recent violations with vehicle and user details
            recent_violations = list(violations_collection.find().sort("created_at", -1).limit(10))
            
            violation_list = []
            for violation in recent_violations:
                # Get vehicle details
                vehicle = vehicles_collection.find_one({"vehicle_id": violation.get("vehicle_id")})
                
                # Determine severity based on fine amount
                fine_amount = violation.get("fine_amount", 0)
                if fine_amount >= 1000:
                    severity = "high"
                elif fine_amount >= 500:
                    severity = "medium"
                else:
                    severity = "low"
                
                # Calculate time difference
                created_at = violation.get("created_at", datetime.now())
                time_diff = datetime.now() - created_at
                if time_diff.seconds < 3600:  # Less than 1 hour
                    time_ago = f"{time_diff.seconds // 60} min ago"
                else:
                    time_ago = f"{time_diff.seconds // 3600} hour ago"
                
                violation_data = {
                    "violation_id": violation.get("violation_id"),
                    "type": violation.get("violation_type", "").replace("_", " ").title(),
                    "location": violation.get("location"),
                    "time": time_ago,
                    "severity": severity,
                    "fine_amount": fine_amount,
                    "plate_number": vehicle.get("plate_number") if vehicle else "Unknown",
                    "status": violation.get("status")
                }
                violation_list.append(violation_data)
            
            return JsonResponse({
                'status': 'success',
                'violations': violation_list
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)

@csrf_exempt
def get_violation_trends(request):
    if request.method == 'GET':
        try:
            # Get last 7 days violation data
            trends = []
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            
            for i in range(7):
                day_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
                day_end = day_start + timedelta(days=1)
                
                day_violations = violations_collection.count_documents({
                    "created_at": {"$gte": day_start, "$lt": day_end}
                })
                
                # Calculate mock change percentage
                change = f"+{(i * 5) % 25}%" if day_violations > 0 else "0%"
                
                trends.append({
                    "day": days[(datetime.now().weekday() - i) % 7],
                    "violations": day_violations,
                    "change": change
                })
            
            return JsonResponse({
                'status': 'success',
                'trends': trends
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)

@csrf_exempt
def get_top_locations(request):
    if request.method == 'GET':
        try:
            # Aggregate violations by location
            pipeline = [
                {"$group": {"_id": "$location", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 5}
            ]
            
            location_stats = list(violations_collection.aggregate(pipeline))
            total_violations = violations_collection.count_documents({})
            
            top_locations = []
            for stat in location_stats:
                percentage = f"{round((stat['count'] / total_violations) * 100)}%" if total_violations > 0 else "0%"
                top_locations.append({
                    "location": stat["_id"],
                    "violations": stat["count"],
                    "percentage": percentage
                })
            
            return JsonResponse({
                'status': 'success',
                'locations': top_locations
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Method not allowed'
    }, status=405)
