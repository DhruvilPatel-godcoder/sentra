from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pymongo import MongoClient
from datetime import datetime, timedelta
import json
import base64

# MongoDB Connection
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client["sentra"]

# Collections
users_collection = db["users"]
bank_accounts_collection = db["bank_accounts"]
vehicles_collection = db["vehicles"]
violations_collection = db["violations"]
payments_collection = db["payments"]
notifications_collection = db["notifications"]
appeals_collection = db["appeals"]
documents_collection = db["documents"]
cameras_collection = db["cameras"]

@csrf_exempt
@require_http_methods(["GET"])
def get_user_dispute_stats(request, user_id):
    """Get user dispute statistics and summary"""
    try:
        # Get user data
        user = users_collection.find_one({"user_id": user_id})
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)

        # Get all appeals for user
        user_violations = violations_collection.find({"vehicle_id": {"$in": [v["vehicle_id"] for v in vehicles_collection.find({"owner_id": user_id})]}})
        violation_ids = [v["violation_id"] for v in user_violations]
        
        all_appeals = list(appeals_collection.find({"user_id": user_id}))
        
        # Calculate stats
        total_disputes = len(all_appeals)
        under_review = len([a for a in all_appeals if a.get("status") == "pending"])
        approved = len([a for a in all_appeals if a.get("status") == "resolved"])
        rejected = len([a for a in all_appeals if a.get("status") == "rejected"])

        stats = {
            "total_disputes": total_disputes,
            "under_review": under_review,
            "approved": approved,
            "rejected": rejected,
            "mobile_number": user.get("mobile_number", ""),
            "user_name": user.get("name", "")
        }

        return JsonResponse({"status": "success", "data": stats})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_user_disputes_history(request, user_id):
    """Get detailed disputes history for user"""
    try:
        # Get user data
        user = users_collection.find_one({"user_id": user_id})
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)

        # Get search and filter parameters
        search_term = request.GET.get('search', '').lower()
        status_filter = request.GET.get('status', 'all')

        # Get all appeals for user (sorted by date, newest first)
        appeals_query = {"user_id": user_id}
        if status_filter != 'all':
            appeals_query["status"] = status_filter

        appeals = list(appeals_collection.find(
            appeals_query,
            {"_id": 0}
        ).sort("created_at", -1))

        # Get user vehicles for vehicle number mapping
        user_vehicles = list(vehicles_collection.find({"owner_id": user_id}))
        vehicle_map = {v["vehicle_id"]: v for v in user_vehicles}

        disputes_list = []
        for appeal in appeals:
            # Get violation details
            violation = violations_collection.find_one({"violation_id": appeal.get("violation_id")})
            
            # Get vehicle details
            vehicle = None
            if violation:
                vehicle = vehicle_map.get(violation.get("vehicle_id"))

            dispute_data = {
                "id": appeal.get("appeal_id"),
                "appeal_id": appeal.get("appeal_id"),
                "violation_id": appeal.get("violation_id"),
                "violation_type": violation.get("violation_type", "") if violation else "",
                "vehicle_number": vehicle.get("plate_number", "Unknown") if vehicle else "Unknown",
                "mobile_number": user.get("mobile_number", ""),
                "status": appeal.get("status", "pending"),
                "submitted_date": appeal.get("created_at").isoformat() if appeal.get("created_at") else "",
                "formatted_date": appeal.get("created_at").strftime("%Y-%m-%d") if appeal.get("created_at") else "",
                "reason": appeal.get("description", ""),
                "evidence_file": appeal.get("evidence_file", ""),
                "admin_response": appeal.get("admin_response", ""),
                "location": violation.get("location", "") if violation else "",
                "fine_amount": violation.get("fine_amount", 0) if violation else 0,
                "evidence_photo": violation.get("evidence_photo", "") if violation else ""
            }
            
            # Filter based on search term
            if search_term:
                searchable_text = (
                    dispute_data["appeal_id"].lower() + " " +
                    dispute_data["violation_id"].lower() + " " +
                    dispute_data["vehicle_number"].lower() + " " +
                    dispute_data["violation_type"].lower() + " " +
                    dispute_data["reason"].lower() + " " +
                    dispute_data["location"].lower()
                )
                if search_term not in searchable_text:
                    continue
            
            disputes_list.append(dispute_data)

        return JsonResponse({"status": "success", "disputes": disputes_list})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_pending_violations_for_dispute(request, user_id):
    """Get pending violations that can be disputed"""
    try:
        # Get user vehicles
        user_vehicles = list(vehicles_collection.find({"owner_id": user_id}))
        vehicle_ids = [v["vehicle_id"] for v in user_vehicles]

        # Get pending violations that haven't been disputed yet
        pending_violations = list(violations_collection.find(
            {"vehicle_id": {"$in": vehicle_ids}},
            # {"vehicle_id": {"$in": vehicle_ids}, "status": "pending"},
            {"_id": 0}
        ).sort("created_at", -1))

        # Filter out violations that already have appeals
        existing_appeals = list(appeals_collection.find({"user_id": user_id}, {"violation_id": 1}))
        disputed_violation_ids = [a["violation_id"] for a in existing_appeals]

        violation_list = []
        for violation in pending_violations:
            if violation["violation_id"] not in disputed_violation_ids:
                vehicle = next((v for v in user_vehicles if v["vehicle_id"] == violation["vehicle_id"]), {})
                violation_data = {
                    "violation_id": violation.get("violation_id"),
                    "violation_type": violation.get("violation_type"),
                    "fine_amount": violation.get("fine_amount", 0),
                    "location": violation.get("location"),
                    "vehicle_number": vehicle.get("plate_number", ""),
                    "vehicle_id": violation.get("vehicle_id"),
                    "date": violation.get("created_at").strftime("%Y-%m-%d") if violation.get("created_at") else "",
                    "evidence_photo": violation.get("evidence_photo", "")
                }
                violation_list.append(violation_data)

        return JsonResponse({
            "status": "success", 
            "violations": violation_list,
            "count": len(violation_list)
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def submit_dispute(request, user_id):
    """Submit a new dispute/appeal"""
    try:
        data = json.loads(request.body)
        violation_id = data.get("violation_id")
        dispute_reason = data.get("dispute_reason")
        description = data.get("description")
        evidence_file = data.get("evidence_file", "")  # Base64 encoded file
        
        if not violation_id or not dispute_reason or not description:
            return JsonResponse({"status": "error", "message": "All fields are required"}, status=400)

        # Check if violation exists and belongs to user
        violation = violations_collection.find_one({"violation_id": violation_id})
        if not violation:
            return JsonResponse({"status": "error", "message": "Violation not found"}, status=404)

        # Check if vehicle belongs to user
        vehicle = vehicles_collection.find_one({"vehicle_id": violation["vehicle_id"], "owner_id": user_id})
        if not vehicle:
            return JsonResponse({"status": "error", "message": "Unauthorized access to violation"}, status=403)

        # Check if already disputed
        existing_appeal = appeals_collection.find_one({"violation_id": violation_id, "user_id": user_id})
        if existing_appeal:
            return JsonResponse({"status": "error", "message": "This violation has already been disputed"}, status=400)

        # Create appeal record
        appeal_id = f"APL{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Handle evidence file if provided
        evidence_filename = ""
        if evidence_file and evidence_file.startswith("data:"):
            try:
                # Extract file data and save (in real implementation, save to file system)
                header, file_data = evidence_file.split(',', 1)
                file_bytes = base64.b64decode(file_data)
                evidence_filename = f"{appeal_id}_evidence.pdf"  # Placeholder
            except Exception:
                evidence_filename = ""

        appeal_record = {
            "appeal_id": appeal_id,
            "violation_id": violation_id,
            "user_id": user_id,
            "description": f"Reason: {dispute_reason}\n\nDetails: {description}",
            "evidence_file": evidence_filename,
            "status": "pending",
            "created_at": datetime.now(),
            "admin_response": ""
        }
        
        appeals_collection.insert_one(appeal_record)

        # Create notification
        notification_id = f"NOTI{datetime.now().strftime('%Y%m%d%H%M%S')}"
        notifications_collection.insert_one({
            "notification_id": notification_id,
            "user_id": user_id,
            "title": "Dispute Submitted",
            "message": f"Your dispute for violation {violation_id} has been submitted successfully. Appeal ID: {appeal_id}",
            "type": "sms",
            "status": "sent",
            "created_at": datetime.now()
        })

        return JsonResponse({
            "status": "success",
            "message": "Dispute submitted successfully",
            "appeal_id": appeal_id
        })
    except Exception as e:
        print(f"Error in submit_dispute: {e}")
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_dispute_details(request, user_id, appeal_id):
    """Get detailed information about a specific dispute"""
    try:
        # Get appeal details
        appeal = appeals_collection.find_one({"appeal_id": appeal_id, "user_id": user_id})
        if not appeal:
            return JsonResponse({"status": "error", "message": "Dispute not found"}, status=404)

        # Get violation details
        violation = violations_collection.find_one({"violation_id": appeal.get("violation_id")})
        
        # Get user details
        user = users_collection.find_one({"user_id": user_id})
        
        # Get vehicle details
        vehicle = None
        if violation:
            vehicle = vehicles_collection.find_one({"vehicle_id": violation.get("vehicle_id")})

        dispute_details = {
            "appeal_id": appeal.get("appeal_id"),
            "violation_id": appeal.get("violation_id"),
            "status": appeal.get("status"),
            "description": appeal.get("description"),
            "evidence_file": appeal.get("evidence_file"),
            "admin_response": appeal.get("admin_response", ""),
            "submitted_date": appeal.get("created_at").strftime("%Y-%m-%d %H:%M:%S") if appeal.get("created_at") else "",
            "user_name": user.get("name", "") if user else "",
            "mobile_number": user.get("mobile_number", "") if user else "",
            "violation_type": violation.get("violation_type", "") if violation else "",
            "fine_amount": violation.get("fine_amount", 0) if violation else 0,
            "location": violation.get("location", "") if violation else "",
            "vehicle_number": vehicle.get("plate_number", "") if vehicle else "",
            "evidence_photo": violation.get("evidence_photo", "") if violation else ""
        }

        return JsonResponse({
            "status": "success", 
            "dispute": dispute_details
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def upload_evidence(request, user_id, appeal_id):
    """Upload additional evidence for a dispute"""
    try:
        data = json.loads(request.body)
        evidence_file = data.get("evidence_file", "")
        
        if not evidence_file:
            return JsonResponse({"status": "error", "message": "No evidence file provided"}, status=400)

        # Check if appeal exists and belongs to user
        appeal = appeals_collection.find_one({"appeal_id": appeal_id, "user_id": user_id})
        if not appeal:
            return JsonResponse({"status": "error", "message": "Dispute not found"}, status=404)

        if appeal.get("status") != "pending":
            return JsonResponse({"status": "error", "message": "Cannot upload evidence for resolved disputes"}, status=400)

        # Handle evidence file
        evidence_filename = ""
        if evidence_file and evidence_file.startswith("data:"):
            try:
                header, file_data = evidence_file.split(',', 1)
                file_bytes = base64.b64decode(file_data)
                evidence_filename = f"{appeal_id}_additional_evidence.pdf"
            except Exception:
                return JsonResponse({"status": "error", "message": "Invalid file format"}, status=400)

        # Update appeal with new evidence
        appeals_collection.update_one(
            {"appeal_id": appeal_id},
            {
                "$set": {
                    "evidence_file": evidence_filename,
                    "updated_at": datetime.now()
                }
            }
        )

        # Create notification
        notification_id = f"NOTI{datetime.now().strftime('%Y%m%d%H%M%S')}"
        notifications_collection.insert_one({
            "notification_id": notification_id,
            "user_id": user_id,
            "title": "Evidence Uploaded",
            "message": f"Additional evidence uploaded for dispute {appeal_id}",
            "type": "sms",
            "status": "sent",
            "created_at": datetime.now()
        })

        return JsonResponse({
            "status": "success",
            "message": "Evidence uploaded successfully"
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
