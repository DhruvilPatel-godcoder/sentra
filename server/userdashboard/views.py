from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pymongo import MongoClient
from datetime import datetime, timedelta
import json

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
def get_user_dashboard_stats(request, user_id):
    """Get user dashboard statistics"""
    try:
        # Get user data
        user = users_collection.find_one({"user_id": user_id})
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)

        # Get user vehicles
        user_vehicles = list(vehicles_collection.find({"owner_id": user_id}))
        vehicle_ids = [v["vehicle_id"] for v in user_vehicles]

        # Get violations for user's vehicles
        total_violations = violations_collection.count_documents({"vehicle_id": {"$in": vehicle_ids}})
        pending_violations = list(violations_collection.find({"vehicle_id": {"$in": vehicle_ids}, "status": "pending"}))
        paid_violations = list(violations_collection.find({"vehicle_id": {"$in": vehicle_ids}, "status": "paid"}))

        # Calculate fine amounts
        total_fines = sum([v.get("fine_amount", 0) for v in violations_collection.find({"vehicle_id": {"$in": vehicle_ids}})])
        paid_fines = sum([v.get("fine_amount", 0) for v in paid_violations])
        pending_amount = sum([v.get("fine_amount", 0) for v in pending_violations])

        # Get bank account balance
        bank_account = bank_accounts_collection.find_one({"user_id": user_id})
        account_balance = bank_account.get("balance", 0) if bank_account else 0

        # Check document expiry (next 30 days)
        thirty_days_from_now = datetime.now() + timedelta(days=30)
        expiring_docs = documents_collection.count_documents({
            "vehicle_id": {"$in": vehicle_ids},
            "$or": [
                {"PUC_expiry_date": {"$lte": thirty_days_from_now}},
                {"Insurance_expiry_date": {"$lte": thirty_days_from_now}},
                {"RC_expiry_date": {"$lte": thirty_days_from_now}}
            ]
        })

        # PUC status logic
        puc_status = "valid"
        puc_expiry = None
        pending_fines_for_puc = 0

        if pending_amount > 1000:  # If pending fines > 1000, block PUC
            puc_status = "blocked"
            pending_fines_for_puc = pending_amount
        else:
            # Check actual PUC expiry
            latest_puc = documents_collection.find_one(
                {"vehicle_id": {"$in": vehicle_ids}},
                sort=[("PUC_expiry_date", -1)]
            )
            if latest_puc:
                puc_expiry_date = latest_puc.get("PUC_expiry_date")
                if puc_expiry_date and puc_expiry_date < datetime.now():
                    puc_status = "expired"
                puc_expiry = puc_expiry_date.strftime("%Y-%m-%d") if puc_expiry_date else None

        stats = {
            "totalViolations": total_violations,
            "pendingPayments": len(pending_violations),
            "totalFines": total_fines,
            "paidFines": paid_fines,
            "pendingAmount": pending_amount,
            "accountBalance": account_balance,
            "documentsExpiring": expiring_docs,
            "totalVehicles": len(user_vehicles),
            "pucStatus": puc_status,
            "pucExpiry": puc_expiry,
            "pendingFinesForPuc": pending_fines_for_puc,
        }

        return JsonResponse({"status": "success", "data": stats})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_recent_violations(request, user_id):
    """Get recent violations for user"""
    try:
        # Get user vehicles
        user_vehicles = list(vehicles_collection.find({"owner_id": user_id}))
        vehicle_ids = [v["vehicle_id"] for v in user_vehicles]

        # Get recent violations (last 10)
        recent_violations = list(violations_collection.find(
            {"vehicle_id": {"$in": vehicle_ids}},
            {"_id": 0}
        ).sort("created_at", -1).limit(10))

        # Enhance violation data with vehicle info
        violation_list = []
        for violation in recent_violations:
            vehicle = next((v for v in user_vehicles if v["vehicle_id"] == violation["vehicle_id"]), {})
            violation_data = {
                "violation_id": violation.get("violation_id"),
                "id": violation.get("violation_id"),
                "type": violation.get("violation_type"),
                "violation_type": violation.get("violation_type"),
                "location": violation.get("location"),
                "date": violation.get("created_at").strftime("%Y-%m-%d") if violation.get("created_at") else "",
                "created_at": violation.get("created_at"),
                "amount": violation.get("fine_amount", 0),
                "fine_amount": violation.get("fine_amount", 0),
                "status": violation.get("status", "pending"),
                "vehicle_number": vehicle.get("plate_number", ""),
                "evidence_photo": violation.get("evidence_photo", "")
            }
            violation_list.append(violation_data)

        return JsonResponse({"status": "success", "violations": violation_list})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_user_vehicles(request, user_id):
    """Get user vehicles with document status"""
    try:
        # Get user vehicles
        user_vehicles = list(vehicles_collection.find({"owner_id": user_id}, {"_id": 0}))
        
        vehicle_list = []
        for vehicle in user_vehicles:
            # Get latest document for this vehicle
            document = documents_collection.find_one({"vehicle_id": vehicle["vehicle_id"]})
            
            # Get violation count for this vehicle
            violation_count = violations_collection.count_documents({"vehicle_id": vehicle["vehicle_id"]})
            pending_violations = violations_collection.count_documents({
                "vehicle_id": vehicle["vehicle_id"], 
                "status": "pending"
            })

            vehicle_data = {
                "vehicle_id": vehicle.get("vehicle_id"),
                "id": vehicle.get("vehicle_id"),
                "plate_number": vehicle.get("plate_number"),
                "number": vehicle.get("plate_number"),
                "make": vehicle.get("make"),
                "model": vehicle.get("model"),
                "year": vehicle.get("year"),
                "vehicle_type": vehicle.get("vehicle_type"),
                "type": vehicle.get("vehicle_type"),
                "registration_date": vehicle.get("registration_date"),
                "violation_count": violation_count,
                "pending_violations": pending_violations,
                "puc_status": document.get("status", "unknown") if document else "no_document",
                "puc_expiry": document.get("PUC_expiry_date") if document else None,
                "insurance_expiry": document.get("Insurance_expiry_date") if document else None,
                "rc_expiry": document.get("RC_expiry_date") if document else None
            }
            vehicle_list.append(vehicle_data)

        return JsonResponse({"status": "success", "vehicles": vehicle_list})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_user_payments(request, user_id):
    """Get user payment history"""
    try:
        # Get payment history (last 20)
        payments = list(payments_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(20))

        payment_list = []
        for payment in payments:
            # Get violation details
            violation = violations_collection.find_one({"violation_id": payment.get("violation_id")})
            
            payment_data = {
                "payment_id": payment.get("payment_id"),
                "id": payment.get("payment_id"),
                "violation_id": payment.get("violation_id"),
                "amount": payment.get("amount", 0),
                "payment_method": payment.get("payment_method"),
                "payment_status": payment.get("payment_status"),
                "status": payment.get("payment_status"),
                "auto_deducted": payment.get("auto_deducted", False),
                "created_at": payment.get("created_at"),
                "date": payment.get("created_at").strftime("%Y-%m-%d") if payment.get("created_at") else "",
                "violation_type": violation.get("violation_type", "") if violation else "",
                "location": violation.get("location", "") if violation else ""
            }
            payment_list.append(payment_data)

        # Calculate payment stats
        total_paid = sum([p.get("amount", 0) for p in payments if p.get("payment_status") == "success"])
        auto_deducted_count = len([p for p in payments if p.get("auto_deducted")])
        
        return JsonResponse({
            "status": "success", 
            "payments": payment_list,
            "stats": {
                "total_paid": total_paid,
                "auto_deducted_count": auto_deducted_count,
                "total_transactions": len(payment_list)
            }
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_user_profile(request, user_id):
    """Get complete user profile data"""
    try:
        # Get user data
        user = users_collection.find_one({"user_id": user_id}, {"_id": 0, "face_data": 0})
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)

        # Get bank account
        bank_account = bank_accounts_collection.find_one({"user_id": user_id}, {"_id": 0})
        
        # Get notifications count
        unread_notifications = notifications_collection.count_documents({
            "user_id": user_id, 
            "status": {"$ne": "read"}
        })

        # Get appeals count
        pending_appeals = appeals_collection.count_documents({
            "user_id": user_id, 
            "status": "pending"
        })

        profile_data = {
            "user_info": {
                "user_id": user["user_id"],
                "name": user["name"],
                "mobile_number": user["mobile_number"],
                "email": user.get("email", ""),
                "dl_number": user.get("dl_number", ""),
                "bank_account_number": user.get("bank_account_number", ""),
                "is_active": user.get("is_active", True),
                "created_at": user.get("created_at"),
                "has_face_auth": user.get("face_data") is not None
            },
            "bank_account": {
                "account_number": bank_account["account_number"] if bank_account else "",
                "balance": bank_account["balance"] if bank_account else 0,
                "ifsc_code": bank_account.get("ifsc_code", "") if bank_account else ""
            },
            "notifications": {
                "unread_count": unread_notifications
            },
            "appeals": {
                "pending_count": pending_appeals
            }
        }

        return JsonResponse({"status": "success", "data": profile_data})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
