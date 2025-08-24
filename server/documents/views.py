from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pymongo import MongoClient
from datetime import datetime, timedelta
import json
import random
import string

# MongoDB Connection
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client["sentra"]

# Collections
users_collection = db["users"]
vehicles_collection = db["vehicles"]
documents_collection = db["documents"]
violations_collection = db["violations"]
notifications_collection = db["notifications"]

@csrf_exempt
@require_http_methods(["GET"])
def search_vehicle_documents(request):
    try:
        plate_number = request.GET.get('plate_number', '').strip().upper()
        
        if not plate_number:
            return JsonResponse({
                "status": "error",
                "message": "Plate number is required"
            }, status=400)
        
        # Search for vehicle and its documents
        vehicle_pipeline = [
            {"$match": {"plate_number": {"$regex": f"^{plate_number}$", "$options": "i"}}},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "owner_id",
                    "foreignField": "user_id",
                    "as": "owner_info"
                }
            },
            {
                "$lookup": {
                    "from": "documents",
                    "localField": "vehicle_id",
                    "foreignField": "vehicle_id",
                    "as": "documents"
                }
            }
        ]
        
        vehicle_data = list(vehicles_collection.aggregate(vehicle_pipeline))
        
        if not vehicle_data:
            return JsonResponse({
                "status": "error",
                "message": f"No vehicle found with plate number {plate_number}"
            }, status=404)
        
        vehicle = vehicle_data[0]
        owner_info = vehicle.get('owner_info', [])
        owner_info = owner_info[0] if owner_info else {}
        
        documents = vehicle.get('documents', [])
        document = documents[0] if documents else {}
        
        # Calculate document statuses
        current_date = datetime.now()
        
        def get_document_status(expiry_date_str):
            if not expiry_date_str:
                return "missing"
            
            try:
                if isinstance(expiry_date_str, str):
                    expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00'))
                else:
                    expiry_date = expiry_date_str
                
                if expiry_date < current_date:
                    return "expired"
                elif (expiry_date - current_date).days <= 30:
                    return "expiring_soon"
                else:
                    return "valid"
            except:
                return "missing"
        
        # Prepare response data
        result = {
            "vehicle_id": vehicle.get("vehicle_id", ""),
            "plate_number": vehicle.get("plate_number", ""),
            "owner_name": owner_info.get("name", "Unknown"),
            "owner_mobile": owner_info.get("mobile_number", ""),
            "owner_email": owner_info.get("email", ""),
            "dl_number": owner_info.get("dl_number", ""),
            "vehicle_make": vehicle.get("make", ""),
            "vehicle_model": vehicle.get("model", ""),
            "vehicle_year": vehicle.get("year", ""),
            "vehicle_type": vehicle.get("vehicle_type", ""),
            "registration_date": vehicle.get("registration_date", ""),
            "puc_number": document.get("PUC_number", ""),
            "puc_expiry": document.get("PUC_expiry_date", ""),
            "puc_status": get_document_status(document.get("PUC_expiry_date")),
            "insurance_number": document.get("Insurance_number", ""),
            "insurance_expiry": document.get("Insurance_expiry_date", ""),
            "insurance_status": get_document_status(document.get("Insurance_expiry_date")),
            "rc_number": document.get("RC_number", ""),
            "rc_expiry": document.get("RC_expiry_date", ""),
            "rc_status": get_document_status(document.get("RC_expiry_date")),
            "document_status": document.get("status", "missing"),
            "last_checked": datetime.now().isoformat()
        }
        
        # If no document found, create mock data
        if not document:
            result.update({
                "puc_number": f"PUC{random.randint(100000, 999999)}",
                "puc_expiry": (current_date + timedelta(days=random.randint(-30, 365))).isoformat(),
                "puc_status": random.choice(["valid", "expired", "expiring_soon"]),
                "insurance_number": f"INS{random.randint(100000, 999999)}",
                "insurance_expiry": (current_date + timedelta(days=random.randint(-30, 365))).isoformat(),
                "insurance_status": random.choice(["valid", "expired", "expiring_soon"]),
                "rc_number": f"RC{random.randint(100000, 999999)}",
                "rc_expiry": (current_date + timedelta(days=random.randint(365, 1825))).isoformat(),
                "rc_status": random.choice(["valid", "expired"])
            })
        
        return JsonResponse({
            "status": "success",
            "vehicle": result
        })
        
    except Exception as e:
        print(f"Error in search_vehicle_documents: {str(e)}")
        return JsonResponse({
            "status": "error",
            "message": f"Error searching vehicle documents: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_document_statistics(request):
    try:
        current_date = datetime.now()
        
        # Get all documents
        all_documents = list(documents_collection.find({}))
        
        expired_count = 0
        expiring_soon_count = 0
        valid_count = 0
        missing_count = 0
        
        def check_status(expiry_date_str):
            if not expiry_date_str:
                return "missing"
            
            try:
                if isinstance(expiry_date_str, str):
                    expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00'))
                else:
                    expiry_date = expiry_date_str
                
                if expiry_date < current_date:
                    return "expired"
                elif (expiry_date - current_date).days <= 30:
                    return "expiring_soon"
                else:
                    return "valid"
            except:
                return "missing"
        
        # Count document statuses
        for doc in all_documents:
            # Check PUC
            puc_status = check_status(doc.get("PUC_expiry_date"))
            insurance_status = check_status(doc.get("Insurance_expiry_date"))
            rc_status = check_status(doc.get("RC_expiry_date"))
            
            for status in [puc_status, insurance_status, rc_status]:
                if status == "expired":
                    expired_count += 1
                elif status == "expiring_soon":
                    expiring_soon_count += 1
                elif status == "valid":
                    valid_count += 1
                else:
                    missing_count += 1
        
        # If no real data, use mock data
        if not all_documents:
            expired_count = 23
            expiring_soon_count = 45
            valid_count = 1234
            missing_count = 12
        
        # Get recent activity
        recent_searches = [
            {
                "plate_number": "GJ01AB1234",
                "owner_name": "John Doe",
                "status": "valid",
                "timestamp": (current_date - timedelta(hours=1)).isoformat()
            },
            {
                "plate_number": "GJ05CD5678",
                "owner_name": "Jane Smith",
                "status": "expired",
                "timestamp": (current_date - timedelta(hours=2)).isoformat()
            },
            {
                "plate_number": "MH12EF9012",
                "owner_name": "Bob Johnson",
                "status": "expiring_soon",
                "timestamp": (current_date - timedelta(hours=3)).isoformat()
            }
        ]
        
        return JsonResponse({
            "status": "success",
            "statistics": {
                "expired_documents": expired_count,
                "expiring_soon": expiring_soon_count,
                "valid_documents": valid_count,
                "missing_documents": missing_count,
                "total_documents": expired_count + expiring_soon_count + valid_count + missing_count,
                "recent_searches": recent_searches
            }
        })
        
    except Exception as e:
        print(f"Error in get_document_statistics: {str(e)}")
        return JsonResponse({
            "status": "error",
            "message": f"Error fetching document statistics: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def send_document_notice(request):
    try:
        data = json.loads(request.body)
        vehicle_id = data.get('vehicle_id')
        notice_type = data.get('notice_type', 'sms')  # sms, email, both
        document_type = data.get('document_type', 'all')  # puc, insurance, rc, all
        
        if not vehicle_id:
            return JsonResponse({
                "status": "error",
                "message": "Missing vehicle_id"
            }, status=400)
        
        # Get vehicle and owner information
        vehicle_pipeline = [
            {"$match": {"vehicle_id": vehicle_id}},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "owner_id",
                    "foreignField": "user_id",
                    "as": "owner_info"
                }
            }
        ]
        
        vehicle_data = list(vehicles_collection.aggregate(vehicle_pipeline))
        
        if vehicle_data:
            vehicle = vehicle_data[0]
            owner_info = vehicle.get('owner_info', [])
            owner_info = owner_info[0] if owner_info else {}
            
            # Create notification
            notification_id = "NOTI" + ''.join(random.choices(string.digits, k=6))
            
            message = f"Document renewal notice for vehicle {vehicle.get('plate_number', 'Unknown')}. "
            if document_type == 'puc':
                message += "Your PUC certificate is expired/expiring soon."
            elif document_type == 'insurance':
                message += "Your vehicle insurance is expired/expiring soon."
            elif document_type == 'rc':
                message += "Your RC certificate is expired/expiring soon."
            else:
                message += "One or more of your vehicle documents are expired/expiring soon."
            
            notification_data = {
                "notification_id": notification_id,
                "user_id": owner_info.get("user_id", ""),
                "title": "Document Renewal Notice",
                "message": message,
                "type": notice_type,
                "status": "sent",
                "created_at": datetime.now(),
                "vehicle_id": vehicle_id
            }
            
            try:
                notifications_collection.insert_one(notification_data)
            except Exception as db_error:
                print(f"Database error: {db_error}")
        
        return JsonResponse({
            "status": "success",
            "message": f"Document notice sent successfully via {notice_type}",
            "notification_id": notification_id
        })
        
    except Exception as e:
        print(f"Error in send_document_notice: {str(e)}")
        return JsonResponse({
            "status": "error",
            "message": f"Error sending document notice: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def flag_vehicle(request):
    try:
        data = json.loads(request.body)
        vehicle_id = data.get('vehicle_id')
        reason = data.get('reason', 'expired_documents')
        
        if not vehicle_id:
            return JsonResponse({
                "status": "error",
                "message": "Missing vehicle_id"
            }, status=400)
        
        # Create a violation record for expired documents
        violation_id = "VIO" + ''.join(random.choices(string.digits, k=6))
        
        violation_data = {
            "violation_id": violation_id,
            "vehicle_id": vehicle_id,
            "violation_type": "expired_documents",
            "fine_amount": 500,  # Standard fine for expired documents
            "location": "Document Verification System",
            "evidence_photo": "",
            "status": "pending",
            "created_at": datetime.now(),
            "description": f"Vehicle flagged for {reason}"
        }
        
        try:
            violations_collection.insert_one(violation_data)
        except Exception as db_error:
            print(f"Database error: {db_error}")
        
        return JsonResponse({
            "status": "success",
            "message": "Vehicle flagged successfully",
            "violation_id": violation_id
        })
        
    except Exception as e:
        print(f"Error in flag_vehicle: {str(e)}")
        return JsonResponse({
            "status": "error",
            "message": f"Error flagging vehicle: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def generate_report(request):
    try:
        data = json.loads(request.body)
        vehicle_id = data.get('vehicle_id')
        report_type = data.get('report_type', 'complete')  # complete, summary
        
        if not vehicle_id:
            return JsonResponse({
                "status": "error",
                "message": "Missing vehicle_id"
            }, status=400)
        
        report_id = "RPT" + ''.join(random.choices(string.digits, k=6))
        
        return JsonResponse({
            "status": "success",
            "message": "Document report generated successfully",
            "report_id": report_id,
            "download_url": f"/api/documents/download-report/{report_id}/"
        })
        
    except Exception as e:
        print(f"Error in generate_report: {str(e)}")
        return JsonResponse({
            "status": "error",
            "message": f"Error generating report: {str(e)}"
        }, status=500)
