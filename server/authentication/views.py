from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

@csrf_exempt
@require_http_methods(["POST"])
def admin_login(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        # Updated credentials
        if username == 'Sentra159' and password == 'Sentra@159':
            return JsonResponse({
                'status': 'success',
                'message': 'Login successful',
                'token': 'admin_token_sentra159',
                'user': {
                    'admin_id': 'Sentra159',
                    'name': 'SENTRA Admin',
                    'department': 'Traffic Control Department',
                    'role': 'System Administrator',
                    'login_time': '2024-12-21T10:30:00Z'
                }
            })
        else:
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid admin credentials. Please check your Admin ID and password.'
            }, status=401)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def admin_logout(request):
    return JsonResponse({
        'status': 'success',
        'message': 'Logout successful'
    })
