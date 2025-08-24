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

@csrf_exempt
@require_http_methods(["GET"])
def get_user_payment_stats(request, user_id):
    """Get user payment statistics and summary"""
    try:
        # Get user data
        user = users_collection.find_one({"user_id": user_id})
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)

        # Get all payments for user
        all_payments = list(payments_collection.find({"user_id": user_id}))
        
        # Calculate stats
        total_paid = sum([p.get("amount", 0) for p in all_payments if p.get("payment_status") == "success"])
        completed_payments = len([p for p in all_payments if p.get("payment_status") == "success"])
        failed_payments = len([p for p in all_payments if p.get("payment_status") == "failed"])
        pending_payments = len([p for p in all_payments if p.get("payment_status") == "pending"])
        auto_deducted_count = len([p for p in all_payments if p.get("auto_deducted")])

        # Get bank account balance
        bank_account = bank_accounts_collection.find_one({"user_id": user_id})
        account_balance = bank_account.get("balance", 0) if bank_account else 0

        stats = {
            "total_paid": total_paid,
            "completed_payments": completed_payments,
            "failed_payments": failed_payments,
            "pending_payments": pending_payments,
            "auto_deducted_count": auto_deducted_count,
            "total_transactions": len(all_payments),
            "account_balance": account_balance,
            "mobile_number": user.get("mobile_number", ""),
            "user_name": user.get("name", "")
        }

        return JsonResponse({"status": "success", "data": stats})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_user_payment_history(request, user_id):
    """Get detailed payment history for user"""
    try:
        # Get user data
        user = users_collection.find_one({"user_id": user_id})
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)

        # Get search parameter
        search_term = request.GET.get('search', '').lower()

        # Get all payments for user (sorted by date, newest first)
        payments = list(payments_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1))

        # Get user vehicles for vehicle number mapping
        user_vehicles = list(vehicles_collection.find({"owner_id": user_id}))
        vehicle_map = {v["vehicle_id"]: v for v in user_vehicles}

        payment_list = []
        for payment in payments:
            # Get violation details
            violation = violations_collection.find_one({"violation_id": payment.get("violation_id")})
            
            # Get vehicle details
            vehicle = None
            if violation:
                vehicle = vehicle_map.get(violation.get("vehicle_id"))

            payment_data = {
                "id": payment.get("payment_id"),
                "payment_id": payment.get("payment_id"),
                "violation_id": payment.get("violation_id"),
                "vehicle_number": vehicle.get("plate_number", "Unknown") if vehicle else "Unknown",
                "mobile_number": user.get("mobile_number", ""),
                "amount": payment.get("amount", 0),
                "status": payment.get("payment_status", "unknown"),
                "method": payment.get("payment_method", "Unknown"),
                "date": payment.get("created_at").isoformat() if payment.get("created_at") else "",
                "formatted_date": payment.get("created_at").strftime("%Y-%m-%d %H:%M:%S") if payment.get("created_at") else "",
                "transaction_id": f"TXN{payment.get('payment_id', '').replace('PAY', '')}",
                "auto_deducted": payment.get("auto_deducted", False),
                "violation_type": violation.get("violation_type", "") if violation else "",
                "location": violation.get("location", "") if violation else "",
                "fine_amount": violation.get("fine_amount", 0) if violation else 0
            }
            
            # Filter based on search term
            if search_term:
                searchable_text = (
                    payment_data["payment_id"].lower() + " " +
                    payment_data["violation_id"].lower() + " " +
                    payment_data["vehicle_number"].lower() + " " +
                    payment_data["transaction_id"].lower() + " " +
                    payment_data["violation_type"].lower() + " " +
                    payment_data["location"].lower()
                )
                if search_term not in searchable_text:
                    continue
            
            payment_list.append(payment_data)

        return JsonResponse({"status": "success", "payments": payment_list})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def retry_failed_payment(request, user_id):
    """Retry a failed payment"""
    try:
        data = json.loads(request.body)
        payment_id = data.get("payment_id")
        
        if not payment_id:
            return JsonResponse({"status": "error", "message": "Payment ID required"}, status=400)

        # Get the failed payment
        payment = payments_collection.find_one({"payment_id": payment_id, "user_id": user_id})
        if not payment:
            return JsonResponse({"status": "error", "message": "Payment not found"}, status=404)

        if payment.get("payment_status") != "failed":
            return JsonResponse({"status": "error", "message": "Payment is not in failed status"}, status=400)

        # Update payment status to pending (simulating retry)
        payments_collection.update_one(
            {"payment_id": payment_id},
            {
                "$set": {
                    "payment_status": "pending",
                    "created_at": datetime.now()
                }
            }
        )

        # Create notification
        notification_id = f"NOTI{datetime.now().strftime('%Y%m%d%H%M%S')}"
        notifications_collection.insert_one({
            "notification_id": notification_id,
            "user_id": user_id,
            "title": "Payment Retry Initiated",
            "message": f"Payment retry for ₹{payment.get('amount', 0)} has been initiated. Transaction ID: TXN{payment_id.replace('PAY', '')}",
            "type": "sms",
            "status": "sent",
            "created_at": datetime.now()
        })

        return JsonResponse({
            "status": "success", 
            "message": "Payment retry initiated successfully"
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def download_payment_receipt(request, user_id, payment_id):
    """Generate payment receipt download link"""
    try:
        # Get payment details
        payment = payments_collection.find_one({"payment_id": payment_id, "user_id": user_id})
        if not payment:
            return JsonResponse({"status": "error", "message": "Payment not found"}, status=404)

        # Get violation details
        violation = violations_collection.find_one({"violation_id": payment.get("violation_id")})
        
        # Get user details
        user = users_collection.find_one({"user_id": user_id})
        
        # Get vehicle details
        vehicle = None
        if violation:
            vehicle = vehicles_collection.find_one({"vehicle_id": violation.get("vehicle_id")})

        receipt_data = {
            "payment_id": payment.get("payment_id"),
            "transaction_id": f"TXN{payment.get('payment_id', '').replace('PAY', '')}",
            "amount": payment.get("amount", 0),
            "payment_method": payment.get("payment_method", ""),
            "payment_status": payment.get("payment_status", ""),
            "date": payment.get("created_at").strftime("%Y-%m-%d %H:%M:%S") if payment.get("created_at") else "",
            "user_name": user.get("name", "") if user else "",
            "mobile_number": user.get("mobile_number", "") if user else "",
            "violation_type": violation.get("violation_type", "") if violation else "",
            "vehicle_number": vehicle.get("plate_number", "") if vehicle else "",
            "location": violation.get("location", "") if violation else ""
        }

        return JsonResponse({
            "status": "success", 
            "receipt_data": receipt_data,
            "download_url": f"/api/receipts/{payment_id}.pdf"  # Placeholder URL
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_pending_violations(request, user_id):
    """Get pending violations for payment"""
    try:
        # Get user vehicles
        user_vehicles = list(vehicles_collection.find({"owner_id": user_id}))
        vehicle_ids = [v["vehicle_id"] for v in user_vehicles]

        # Get pending violations
        pending_violations = list(violations_collection.find(
            {"vehicle_id": {"$in": vehicle_ids}, "status": "pending"},
            {"_id": 0}
        ).sort("created_at", -1))

        violation_list = []
        for violation in pending_violations:
            vehicle = next((v for v in user_vehicles if v["vehicle_id"] == violation["vehicle_id"]), {})
            violation_data = {
                "violation_id": violation.get("violation_id"),
                "violation_type": violation.get("violation_type"),
                "fine_amount": violation.get("fine_amount", 0),
                "location": violation.get("location"),
                "vehicle_number": vehicle.get("plate_number", ""),
                "date": violation.get("created_at").strftime("%Y-%m-%d") if violation.get("created_at") else "",
                "evidence_photo": violation.get("evidence_photo", "")
            }
            violation_list.append(violation_data)

        total_pending_amount = sum([v["fine_amount"] for v in violation_list])

        return JsonResponse({
            "status": "success", 
            "violations": violation_list,
            "total_pending_amount": total_pending_amount,
            "count": len(violation_list)
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def process_bulk_payment(request, user_id):
    """Process payment for multiple violations"""
    try:
        data = json.loads(request.body)
        violation_ids = data.get("violation_ids", [])
        payment_method = data.get("payment_method", "UPI")
        
        if not violation_ids:
            return JsonResponse({"status": "error", "message": "No violations selected"}, status=400)

        # Get violations
        violations = list(violations_collection.find({"violation_id": {"$in": violation_ids}, "status": "pending"}))
        
        if not violations:
            return JsonResponse({"status": "error", "message": "No valid pending violations found"}, status=404)

        total_amount = sum([v.get("fine_amount", 0) for v in violations])
        
        # Get bank account
        bank_account = bank_accounts_collection.find_one({"user_id": user_id})
        if not bank_account:
            return JsonResponse({"status": "error", "message": "Bank account not found"}, status=404)

        if bank_account.get("balance", 0) < total_amount:
            return JsonResponse({"status": "error", "message": "Insufficient balance"}, status=400)

        # Process payments
        payment_ids = []
        for violation in violations:
            # Create payment record
            payment_id = f"PAY{datetime.now().strftime('%Y%m%d%H%M%S')}{len(payment_ids)+1:03d}"
            payment_record = {
                "payment_id": payment_id,
                "violation_id": violation["violation_id"],
                "user_id": user_id,
                "amount": violation.get("fine_amount", 0),
                "payment_method": payment_method,
                "payment_status": "success",
                "auto_deducted": True,
                "created_at": datetime.now()
            }
            payments_collection.insert_one(payment_record)
            payment_ids.append(payment_id)

            # Update violation status
            violations_collection.update_one(
                {"violation_id": violation["violation_id"]},
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
            "title": "Bulk Payment Successful",
            "message": f"Successfully paid ₹{total_amount} for {len(violations)} violations.",
            "type": "sms",
            "status": "sent",
            "created_at": datetime.now()
        })

        return JsonResponse({
            "status": "success",
            "message": f"Successfully processed {len(violations)} payments",
            "total_amount": total_amount,
            "payment_ids": payment_ids
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
