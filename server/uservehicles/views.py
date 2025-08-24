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
def get_user_vehicle_stats(request, user_id):
    """Get user vehicle statistics and summary"""
    try:
        # Get user data
        user = users_collection.find_one({"user_id": user_id})
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)

        # Get user vehicles
        user_vehicles = list(vehicles_collection.find({"owner_id": user_id}))
        vehicle_ids = [v["vehicle_id"] for v in user_vehicles]
        
        # Get violations for user vehicles
        total_violations = violations_collection.count_documents({"vehicle_id": {"$in": vehicle_ids}})
        pending_violations = violations_collection.count_documents({"vehicle_id": {"$in": vehicle_ids}, "status": "pending"})
        
        # Get documents status
        all_documents = list(documents_collection.find({"vehicle_id": {"$in": vehicle_ids}}))
        documents_expiring = 0
        blocked_vehicles = 0
        
        for doc in all_documents:
            # Check if any document is expiring within 30 days
            for field in ["PUC_expiry_date", "Insurance_expiry_date", "RC_expiry_date"]:
                if doc.get(field):
                    expiry_date = doc[field]
                    if isinstance(expiry_date, str):
                        expiry_date = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
                    days_left = (expiry_date - datetime.now()).days
                    if 0 <= days_left <= 30:
                        documents_expiring += 1
        
        # Check for blocked vehicles (vehicles with pending fines)
        for vehicle_id in vehicle_ids:
            pending_fine_count = violations_collection.count_documents({"vehicle_id": vehicle_id, "status": "pending"})
            if pending_fine_count > 0:
                blocked_vehicles += 1

        stats = {
            "total_vehicles": len(user_vehicles),
            "total_violations": total_violations,
            "pending_violations": pending_violations,
            "documents_expiring": documents_expiring,
            "blocked_vehicles": blocked_vehicles,
            "mobile_number": user.get("mobile_number", ""),
            "user_name": user.get("name", "")
        }

        return JsonResponse({"status": "success", "data": stats})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_user_vehicles_with_documents(request, user_id):
    """Get detailed vehicles with document status for user"""
    try:
        # Get user data
        user = users_collection.find_one({"user_id": user_id})
        if not user:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)

        # Get user vehicles
        user_vehicles = list(vehicles_collection.find(
            {"owner_id": user_id},
            {"_id": 0}
        ).sort("registration_date", -1))

        vehicles_list = []
        for vehicle in user_vehicles:
            # Get vehicle documents
            vehicle_docs = documents_collection.find_one({"vehicle_id": vehicle["vehicle_id"]})
            
            # Get violation count for vehicle
            violation_count = violations_collection.count_documents({"vehicle_id": vehicle["vehicle_id"]})
            pending_violations = violations_collection.count_documents({"vehicle_id": vehicle["vehicle_id"], "status": "pending"})
            
            # Calculate pending fine amount
            pending_violations_data = list(violations_collection.find({"vehicle_id": vehicle["vehicle_id"], "status": "pending"}))
            pending_fine_amount = sum(v.get("fine_amount", 0) for v in pending_violations_data)
            
            # Process document status
            documents = []
            current_date = datetime.now()
            
            if vehicle_docs:
                # Registration Certificate
                rc_expiry = vehicle_docs.get("RC_expiry_date")
                if rc_expiry:
                    if isinstance(rc_expiry, str):
                        rc_expiry = datetime.fromisoformat(rc_expiry.replace('Z', '+00:00'))
                    days_left = (rc_expiry - current_date).days
                    
                    if pending_fine_amount > 0:
                        status = "blocked"
                    elif days_left < 0:
                        status = "expired"
                    elif days_left <= 30:
                        status = "expiring"
                    else:
                        status = "valid"
                    
                    documents.append({
                        "type": "registration",
                        "status": status,
                        "expiry_date": rc_expiry.isoformat(),
                        "days_left": days_left,
                        "blocked_reason": "Unpaid fines" if status == "blocked" else None,
                        "pending_fine": pending_fine_amount if status == "blocked" else None,
                        "number": vehicle_docs.get("RC_number", "")
                    })
                
                # PUC Certificate
                puc_expiry = vehicle_docs.get("PUC_expiry_date")
                if puc_expiry:
                    if isinstance(puc_expiry, str):
                        puc_expiry = datetime.fromisoformat(puc_expiry.replace('Z', '+00:00'))
                    days_left = (puc_expiry - current_date).days
                    
                    if pending_fine_amount > 0:
                        status = "blocked"
                    elif days_left < 0:
                        status = "expired"
                    elif days_left <= 30:
                        status = "expiring"
                    else:
                        status = "valid"
                    
                    documents.append({
                        "type": "puc",
                        "status": status,
                        "expiry_date": puc_expiry.isoformat(),
                        "days_left": days_left,
                        "blocked_reason": "Unpaid fines" if status == "blocked" else None,
                        "pending_fine": pending_fine_amount if status == "blocked" else None,
                        "number": vehicle_docs.get("PUC_number", "")
                    })
                
                # Insurance Policy
                insurance_expiry = vehicle_docs.get("Insurance_expiry_date")
                if insurance_expiry:
                    if isinstance(insurance_expiry, str):
                        insurance_expiry = datetime.fromisoformat(insurance_expiry.replace('Z', '+00:00'))
                    days_left = (insurance_expiry - current_date).days
                    
                    if pending_fine_amount > 0:
                        status = "blocked"
                    elif days_left < 0:
                        status = "expired"
                    elif days_left <= 30:
                        status = "expiring"
                    else:
                        status = "valid"
                    
                    documents.append({
                        "type": "insurance",
                        "status": status,
                        "expiry_date": insurance_expiry.isoformat(),
                        "days_left": days_left,
                        "blocked_reason": "Unpaid fines" if status == "blocked" else None,
                        "pending_fine": pending_fine_amount if status == "blocked" else None,
                        "number": vehicle_docs.get("Insurance_number", "")
                    })
            
            vehicle_data = {
                "id": vehicle.get("vehicle_id"),
                "vehicle_id": vehicle.get("vehicle_id"),
                "plate_number": vehicle.get("plate_number"),
                "make": vehicle.get("make"),
                "model": vehicle.get("model"),
                "year": vehicle.get("year"),
                "vehicle_type": vehicle.get("vehicle_type"),
                "registration_date": vehicle.get("registration_date").isoformat() if vehicle.get("registration_date") else "",
                "violation_count": violation_count,
                "pending_violations": pending_violations,
                "pending_fine_amount": pending_fine_amount,
                "documents": documents
            }
            
            vehicles_list.append(vehicle_data)

        return JsonResponse({
            "status": "success", 
            "vehicles": vehicles_list,
            "count": len(vehicles_list)
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def upload_vehicle_document(request, user_id):
    """Upload document for a vehicle"""
    try:
        data = json.loads(request.body)
        vehicle_id = data.get("vehicle_id")
        document_type = data.get("document_type")  # registration, puc, insurance
        document_file = data.get("document_file", "")  # Base64 encoded file
        expiry_date = data.get("expiry_date")
        document_number = data.get("document_number")
        
        if not vehicle_id or not document_type or not expiry_date:
            return JsonResponse({"status": "error", "message": "All fields are required"}, status=400)

        # Check if vehicle belongs to user
        vehicle = vehicles_collection.find_one({"vehicle_id": vehicle_id, "owner_id": user_id})
        if not vehicle:
            return JsonResponse({"status": "error", "message": "Vehicle not found or unauthorized"}, status=404)

        # Handle document file
        file_path = ""
        if document_file and document_file.startswith("data:"):
            try:
                header, file_data = document_file.split(',', 1)
                file_bytes = base64.b64decode(file_data)
                file_path = f"{vehicle_id}_{document_type}_{datetime.now().strftime('%Y%m%d')}.pdf"
                # In real implementation, save to file system
            except Exception:
                file_path = ""

        # Parse expiry date
        try:
            expiry_dt = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
        except:
            return JsonResponse({"status": "error", "message": "Invalid expiry date format"}, status=400)

        # Update document in database
        existing_doc = documents_collection.find_one({"vehicle_id": vehicle_id})
        
        update_fields = {
            "vehicle_id": vehicle_id,
            "status": "valid",
            "updated_at": datetime.now()
        }
        
        if file_path:
            update_fields["file_path"] = file_path
        
        # Set specific document fields based on type
        if document_type == "registration":
            update_fields["RC_number"] = document_number
            update_fields["RC_expiry_date"] = expiry_dt
        elif document_type == "puc":
            update_fields["PUC_number"] = document_number
            update_fields["PUC_expiry_date"] = expiry_dt
        elif document_type == "insurance":
            update_fields["Insurance_number"] = document_number
            update_fields["Insurance_expiry_date"] = expiry_dt
        
        if existing_doc:
            documents_collection.update_one(
                {"vehicle_id": vehicle_id},
                {"$set": update_fields}
            )
        else:
            update_fields["document_id"] = f"DOC{datetime.now().strftime('%Y%m%d%H%M%S')}"
            documents_collection.insert_one(update_fields)

        # Create notification
        notification_id = f"NOTI{datetime.now().strftime('%Y%m%d%H%M%S')}"
        notifications_collection.insert_one({
            "notification_id": notification_id,
            "user_id": user_id,
            "title": "Document Uploaded",
            "message": f"{document_type.title()} document uploaded for vehicle {vehicle['plate_number']}",
            "type": "sms",
            "status": "sent",
            "created_at": datetime.now()
        })

        return JsonResponse({
            "status": "success",
            "message": "Document uploaded successfully"
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def download_vehicle_document(request, user_id, vehicle_id, document_type):
    """Download document for a vehicle"""
    try:
        # Check if vehicle belongs to user
        vehicle = vehicles_collection.find_one({"vehicle_id": vehicle_id, "owner_id": user_id})
        if not vehicle:
            return JsonResponse({"status": "error", "message": "Vehicle not found or unauthorized"}, status=404)

        # Get document
        document = documents_collection.find_one({"vehicle_id": vehicle_id})
        if not document:
            return JsonResponse({"status": "error", "message": "Document not found"}, status=404)

        file_path = document.get("file_path", "")
        if not file_path:
            return JsonResponse({"status": "error", "message": "No file available for download"}, status=404)

        # In real implementation, return actual file
        # For now, return file info
        return JsonResponse({
            "status": "success",
            "file_path": file_path,
            "document_type": document_type,
            "vehicle_number": vehicle.get("plate_number"),
            "download_url": f"/media/documents/{file_path}"  # Placeholder URL
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def renew_vehicle_document(request, user_id):
    """Initiate document renewal process"""
    try:
        data = json.loads(request.body)
        vehicle_id = data.get("vehicle_id")
        document_type = data.get("document_type")
        
        if not vehicle_id or not document_type:
            return JsonResponse({"status": "error", "message": "Vehicle ID and document type are required"}, status=400)

        # Check if vehicle belongs to user
        vehicle = vehicles_collection.find_one({"vehicle_id": vehicle_id, "owner_id": user_id})
        if not vehicle:
            return JsonResponse({"status": "error", "message": "Vehicle not found or unauthorized"}, status=404)

        # Check for pending fines that might block renewal
        pending_violations = list(violations_collection.find({"vehicle_id": vehicle_id, "status": "pending"}))
        pending_amount = sum(v.get("fine_amount", 0) for v in pending_violations)
        
        if pending_amount > 0 and document_type == "puc":
            return JsonResponse({
                "status": "error", 
                "message": f"Cannot renew PUC. Please clear pending fines of ₹{pending_amount} first."
            }, status=400)

        # Create notification for renewal initiation
        notification_id = f"NOTI{datetime.now().strftime('%Y%m%d%H%M%S')}"
        notifications_collection.insert_one({
            "notification_id": notification_id,
            "user_id": user_id,
            "title": "Document Renewal Initiated",
            "message": f"{document_type.title()} renewal initiated for vehicle {vehicle['plate_number']}. Please visit the nearest RTO office.",
            "type": "sms",
            "status": "sent",
            "created_at": datetime.now()
        })

        return JsonResponse({
            "status": "success",
            "message": f"{document_type.title()} renewal process initiated. You will receive further instructions via SMS.",
            "pending_fines": pending_amount,
            "renewal_fee_estimate": 200 if document_type == "puc" else 500  # Sample fees
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def pay_fines_to_unblock(request, user_id):
    """Pay pending fines to unblock vehicle services"""
    try:
        data = json.loads(request.body)
        vehicle_id = data.get("vehicle_id")
        payment_method = data.get("payment_method", "UPI")
        
        if not vehicle_id:
            return JsonResponse({"status": "error", "message": "Vehicle ID is required"}, status=400)

        # Check if vehicle belongs to user
        vehicle = vehicles_collection.find_one({"vehicle_id": vehicle_id, "owner_id": user_id})
        if not vehicle:
            return JsonResponse({"status": "error", "message": "Vehicle not found or unauthorized"}, status=404)

        # Get pending violations
        pending_violations = list(violations_collection.find({"vehicle_id": vehicle_id, "status": "pending"}))
        if not pending_violations:
            return JsonResponse({"status": "error", "message": "No pending fines found"}, status=400)

        total_amount = sum(v.get("fine_amount", 0) for v in pending_violations)
        
        # Check user balance
        user_account = bank_accounts_collection.find_one({"user_id": user_id})
        if not user_account or user_account.get("balance", 0) < total_amount:
            return JsonResponse({
                "status": "error", 
                "message": f"Insufficient balance. Required: ₹{total_amount}, Available: ₹{user_account.get('balance', 0) if user_account else 0}"
            }, status=400)

        # Process payments for each violation
        payment_ids = []
        for violation in pending_violations:
            payment_id = f"PAY{datetime.now().strftime('%Y%m%d%H%M%S')}{len(payment_ids):03d}"
            
            # Create payment record
            payments_collection.insert_one({
                "payment_id": payment_id,
                "violation_id": violation["violation_id"],
                "user_id": user_id,
                "amount": violation.get("fine_amount", 0),
                "payment_method": payment_method,
                "payment_status": "success",
                "auto_deducted": True,
                "created_at": datetime.now()
            })
            
            # Update violation status
            violations_collection.update_one(
                {"violation_id": violation["violation_id"]},
                {"$set": {"status": "paid", "paid_at": datetime.now()}}
            )
            
            payment_ids.append(payment_id)

        # Deduct amount from user account
        bank_accounts_collection.update_one(
            {"user_id": user_id},
            {"$inc": {"balance": -total_amount}}
        )

        # Create notification
        notification_id = f"NOTI{datetime.now().strftime('%Y%m%d%H%M%S')}"
        notifications_collection.insert_one({
            "notification_id": notification_id,
            "user_id": user_id,
            "title": "Fines Paid Successfully",
            "message": f"₹{total_amount} paid for {len(pending_violations)} violations. Vehicle {vehicle['plate_number']} services unblocked.",
            "type": "sms",
            "status": "sent",
            "created_at": datetime.now()
        })

        return JsonResponse({
            "status": "success",
            "message": f"Successfully paid ₹{total_amount} for {len(pending_violations)} violations",
            "payment_ids": payment_ids,
            "total_amount": total_amount,
            "remaining_balance": user_account.get("balance", 0) - total_amount
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
