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
def get_user_violation_stats(request, user_id):
    """Get user violation statistics and summary"""
    try:
        # Get user data
        user = users_collection.find_one({"user_id": user_id})
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)

        # Get user vehicles
        user_vehicles = list(vehicles_collection.find({"owner_id": user_id}))
        vehicle_ids = [v["vehicle_id"] for v in user_vehicles]

        if not vehicle_ids:
            return JsonResponse({
                "status": "success", 
                "data": {
                    "total_violations": 0,
                    "pending_payments": 0,
                    "auto_deducted": 0,
                    "total_amount_due": 0,
                    "user_name": user.get("name", ""),
                    "mobile_number": user.get("mobile_number", "")
                }
            })

        # Get all violations for user's vehicles
        all_violations = list(violations_collection.find({"vehicle_id": {"$in": vehicle_ids}}))
        
        # Calculate stats
        total_violations = len(all_violations)
        pending_violations = [v for v in all_violations if v.get("status") == "pending"]
        pending_payments = len(pending_violations)
        total_amount_due = sum([v.get("fine_amount", 0) for v in pending_violations])

        # Count auto-deducted violations (based on payments with auto_deducted=True)
        auto_deducted_payments = list(payments_collection.find({
            "user_id": user_id, 
            "auto_deducted": True,
            "payment_status": "success"
        }))
        auto_deducted = len(auto_deducted_payments)

        stats = {
            "total_violations": total_violations,
            "pending_payments": pending_payments,
            "auto_deducted": auto_deducted,
            "total_amount_due": total_amount_due,
            "user_name": user.get("name", ""),
            "mobile_number": user.get("mobile_number", "")
        }

        return JsonResponse({"status": "success", "data": stats})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_user_violations_history(request, user_id):
    """Get detailed violation history for user"""
    try:
        # Get user data
        user = users_collection.find_one({"user_id": user_id})
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)

        # Get search and filter parameters
        search_term = request.GET.get('search', '').lower()
        status_filter = request.GET.get('status', 'all')

        # Get user vehicles
        user_vehicles = list(vehicles_collection.find({"owner_id": user_id}))
        vehicle_ids = [v["vehicle_id"] for v in user_vehicles]
        vehicle_map = {v["vehicle_id"]: v for v in user_vehicles}

        if not vehicle_ids:
            return JsonResponse({"status": "success", "violations": []})

        # Get all violations for user's vehicles (sorted by date, newest first)
        violations = list(violations_collection.find(
            {"vehicle_id": {"$in": vehicle_ids}},
            {"_id": 0}
        ).sort("created_at", -1))

        violation_list = []
        for violation in violations:
            # Get vehicle details
            vehicle = vehicle_map.get(violation.get("vehicle_id"), {})
            
            # Get payment details if exists
            payment = payments_collection.find_one({"violation_id": violation.get("violation_id")})
            
            # Get camera details if available
            camera_location = violation.get("location", "Unknown Location")
            
            # Determine status based on payment
            status = violation.get("status", "pending")
            if payment:
                if payment.get("payment_status") == "success":
                    status = "auto-deducted" if payment.get("auto_deducted") else "paid"
                elif payment.get("payment_status") == "failed":
                    status = "auto-failed"

            # Calculate penalties for overdue violations
            created_date = violation.get("created_at")
            total_amount = violation.get("fine_amount", 0)
            insufficient_funds_penalty = 0
            late_penalty = 0
            
            if created_date and status == "pending":
                days_overdue = (datetime.now() - created_date).days
                if days_overdue > 180:  # 6 months
                    late_penalty = violation.get("fine_amount", 0) * 0.5  # 50% penalty
                    status = "overdue"
                if payment and payment.get("payment_status") == "failed":
                    insufficient_funds_penalty = 100  # ₹100 penalty
                
                total_amount = violation.get("fine_amount", 0) + insufficient_funds_penalty + late_penalty

            violation_data = {
                "id": violation.get("violation_id"),
                "type": violation.get("violation_type", "Unknown"),
                "amount": violation.get("fine_amount", 0),
                "totalAmount": total_amount if total_amount != violation.get("fine_amount", 0) else None,
                "location": camera_location,
                "plateNumber": vehicle.get("plate_number", "Unknown"),
                "vehicleModel": f"{vehicle.get('make', '')} {vehicle.get('model', '')}".strip() or "Unknown",
                "date": violation.get("created_at").isoformat() if violation.get("created_at") else "",
                "time": violation.get("created_at").strftime("%H:%M") if violation.get("created_at") else "",
                "status": status,
                "evidencePhoto": violation.get("evidence_photo", ""),
                "evidence": f"Speed limit violation detected at {camera_location}",
                "officerName": "Traffic Camera System",
                "cameraId": f"CAM{violation.get('violation_id', '').replace('VIO', '')}",
                "coordinates": "23.0225° N, 72.5714° E",  # Ahmedabad coordinates
                "dueDate": (violation.get("created_at") + timedelta(days=30)).isoformat() if violation.get("created_at") else "",
                "autoDeductionAttempts": 1 if payment and payment.get("auto_deducted") else 0,
                "autoDeductionDate": payment.get("created_at").isoformat() if payment and payment.get("auto_deducted") else None,
                "failureReason": "Insufficient funds" if payment and payment.get("payment_status") == "failed" else None,
                "insufficientFundsPenalty": insufficient_funds_penalty if insufficient_funds_penalty > 0 else None,
                "latePenalty": late_penalty if late_penalty > 0 else None
            }
            
            # Filter based on search term
            if search_term:
                searchable_text = (
                    violation_data["type"].lower() + " " +
                    violation_data["location"].lower() + " " +
                    violation_data["id"].lower() + " " +
                    violation_data["plateNumber"].lower() + " " +
                    violation_data["vehicleModel"].lower()
                )
                if search_term not in searchable_text:
                    continue

            # Filter based on status
            if status_filter != 'all' and violation_data["status"] != status_filter:
                continue
            
            violation_list.append(violation_data)

        return JsonResponse({"status": "success", "violations": violation_list})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def pay_violation(request, user_id):
    """Process payment for a violation"""
    try:
        data = json.loads(request.body)
        violation_id = data.get("violation_id")
        payment_method = data.get("payment_method", "UPI")
        
        if not violation_id:
            return JsonResponse({"status": "error", "message": "Violation ID required"}, status=400)

        # Get violation details
        violation = violations_collection.find_one({"violation_id": violation_id})
        if not violation:
            return JsonResponse({"status": "error", "message": "Violation not found"}, status=404)

        # Check if violation belongs to user
        vehicle = vehicles_collection.find_one({"vehicle_id": violation["vehicle_id"]})
        if not vehicle or vehicle.get("owner_id") != user_id:
            return JsonResponse({"status": "error", "message": "Unauthorized"}, status=403)

        # Check if already paid
        existing_payment = payments_collection.find_one({
            "violation_id": violation_id,
            "payment_status": "success"
        })
        if existing_payment:
            return JsonResponse({"status": "error", "message": "Violation already paid"}, status=400)

        # Calculate total amount (including penalties)
        fine_amount = violation.get("fine_amount", 0)
        total_amount = fine_amount
        
        # Add late penalty if overdue (6+ months)
        created_date = violation.get("created_at")
        if created_date:
            days_overdue = (datetime.now() - created_date).days
            if days_overdue > 180:
                total_amount += fine_amount * 0.5  # 50% penalty

        # Add insufficient funds penalty if previous payment failed
        failed_payment = payments_collection.find_one({
            "violation_id": violation_id,
            "payment_status": "failed"
        })
        if failed_payment:
            total_amount += 100  # ₹100 penalty

        # Get bank account
        bank_account = bank_accounts_collection.find_one({"user_id": user_id})
        if not bank_account:
            return JsonResponse({"status": "error", "message": "Bank account not found"}, status=404)

        if bank_account.get("balance", 0) < total_amount:
            return JsonResponse({"status": "error", "message": "Insufficient balance"}, status=400)

        # Create payment record
        payment_id = f"PAY{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payment_record = {
            "payment_id": payment_id,
            "violation_id": violation_id,
            "user_id": user_id,
            "amount": total_amount,
            "payment_method": payment_method,
            "payment_status": "success",
            "auto_deducted": False,  # Manual payment
            "created_at": datetime.now()
        }
        payments_collection.insert_one(payment_record)

        # Update violation status
        violations_collection.update_one(
            {"violation_id": violation_id},
            {"$set": {"status": "paid"}}
        )

        # Update bank balance
        bank_accounts_collection.update_one(
            {"user_id": user_id},
            {"$inc": {"balance": -total_amount}}
        )

        # Create notification
        notification_id = f"NOTI{datetime.now().strftime('%Y%m%d%H%M%S')}"
        notifications_collection.insert_one({
            "notification_id": notification_id,
            "user_id": user_id,
            "title": "Payment Successful",
            "message": f"Successfully paid ₹{total_amount} for violation {violation_id}. Payment ID: {payment_id}",
            "type": "sms",
            "status": "sent",
            "created_at": datetime.now()
        })

        return JsonResponse({
            "status": "success",
            "message": f"Payment of ₹{total_amount} processed successfully",
            "payment_id": payment_id,
            "amount": total_amount
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def submit_dispute(request, user_id):
    """Submit a dispute for a violation"""
    try:
        data = json.loads(request.body)
        violation_id = data.get("violation_id")
        description = data.get("description", "").strip()
        
        if not violation_id or not description:
            return JsonResponse({"status": "error", "message": "Violation ID and description required"}, status=400)

        # Get violation details
        violation = violations_collection.find_one({"violation_id": violation_id})
        if not violation:
            return JsonResponse({"status": "error", "message": "Violation not found"}, status=404)

        # Check if violation belongs to user
        vehicle = vehicles_collection.find_one({"vehicle_id": violation["vehicle_id"]})
        if not vehicle or vehicle.get("owner_id") != user_id:
            return JsonResponse({"status": "error", "message": "Unauthorized"}, status=403)

        # Check if already disputed
        existing_appeal = appeals_collection.find_one({"violation_id": violation_id})
        if existing_appeal:
            return JsonResponse({"status": "error", "message": "Dispute already submitted"}, status=400)

        # Create appeal record
        appeal_id = f"APL{datetime.now().strftime('%Y%m%d%H%M%S')}"
        appeal_record = {
            "appeal_id": appeal_id,
            "violation_id": violation_id,
            "user_id": user_id,
            "description": description,
            "evidence_file": "",  # File upload not implemented
            "status": "pending",
            "created_at": datetime.now()
        }
        appeals_collection.insert_one(appeal_record)

        # Update violation status
        violations_collection.update_one(
            {"violation_id": violation_id},
            {"$set": {"status": "disputed"}}
        )

        # Create notification
        notification_id = f"NOTI{datetime.now().strftime('%Y%m%d%H%M%S')}"
        notifications_collection.insert_one({
            "notification_id": notification_id,
            "user_id": user_id,
            "title": "Dispute Submitted",
            "message": f"Your dispute for violation {violation_id} has been submitted. Appeal ID: {appeal_id}",
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
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def download_evidence(request, user_id, violation_id):
    """Download evidence for a violation"""
    try:
        # Get violation details
        violation = violations_collection.find_one({"violation_id": violation_id})
        if not violation:
            return JsonResponse({"status": "error", "message": "Violation not found"}, status=404)

        # Check if violation belongs to user
        vehicle = vehicles_collection.find_one({"vehicle_id": violation["vehicle_id"]})
        if not vehicle or vehicle.get("owner_id") != user_id:
            return JsonResponse({"status": "error", "message": "Unauthorized"}, status=403)

        evidence_data = {
            "violation_id": violation_id,
            "violation_type": violation.get("violation_type", ""),
            "location": violation.get("location", ""),
            "timestamp": violation.get("created_at").isoformat() if violation.get("created_at") else "",
            "evidence_photo": violation.get("evidence_photo", ""),
            "camera_details": {
                "camera_id": f"CAM{violation_id.replace('VIO', '')}",
                "location": violation.get("location", ""),
                "type": "Traffic Camera"
            }
        }

        return JsonResponse({
            "status": "success",
            "evidence_data": evidence_data,
            "download_url": f"/api/evidence/{violation_id}.pdf"  # Placeholder URL
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_violation_details(request, user_id, violation_id):
    """Get detailed information about a specific violation"""
    try:
        # Get violation details
        violation = violations_collection.find_one({"violation_id": violation_id})
        if not violation:
            return JsonResponse({"status": "error", "message": "Violation not found"}, status=404)

        # Check if violation belongs to user
        vehicle = vehicles_collection.find_one({"vehicle_id": violation["vehicle_id"]})
        if not vehicle or vehicle.get("owner_id") != user_id:
            return JsonResponse({"status": "error", "message": "Unauthorized"}, status=403)

        # Get payment details if exists
        payment = payments_collection.find_one({"violation_id": violation_id})
        
        # Get appeal details if exists
        appeal = appeals_collection.find_one({"violation_id": violation_id})

        violation_details = {
            "violation_id": violation_id,
            "violation_type": violation.get("violation_type", ""),
            "fine_amount": violation.get("fine_amount", 0),
            "location": violation.get("location", ""),
            "status": violation.get("status", ""),
            "created_at": violation.get("created_at").isoformat() if violation.get("created_at") else "",
            "evidence_photo": violation.get("evidence_photo", ""),
            "vehicle": {
                "plate_number": vehicle.get("plate_number", ""),
                "make": vehicle.get("make", ""),
                "model": vehicle.get("model", ""),
                "year": vehicle.get("year", "")
            },
            "payment": {
                "payment_id": payment.get("payment_id", "") if payment else "",
                "amount": payment.get("amount", 0) if payment else 0,
                "payment_method": payment.get("payment_method", "") if payment else "",
                "payment_status": payment.get("payment_status", "") if payment else "",
                "auto_deducted": payment.get("auto_deducted", False) if payment else False,
                "payment_date": payment.get("created_at").isoformat() if payment and payment.get("created_at") else ""
            } if payment else None,
            "appeal": {
                "appeal_id": appeal.get("appeal_id", "") if appeal else "",
                "description": appeal.get("description", "") if appeal else "",
                "status": appeal.get("status", "") if appeal else "",
                "submission_date": appeal.get("created_at").isoformat() if appeal and appeal.get("created_at") else ""
            } if appeal else None
        }

        return JsonResponse({"status": "success", "violation": violation_details})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
