from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from pymongo import MongoClient
from django.contrib.auth.hashers import make_password, check_password
import jwt

SECRET_KEY = 'FetiFly' 

# Connect to MongoDBclient = MongoClient('mongodb+srv://ihub:akash@ihub.fel24ru.mongodb.net/')
client = MongoClient('mongodb+srv://ihub:akash@ihub.fel24ru.mongodb.net/')
db = client['festifly']
organizers_collection = db['organizers']

@csrf_exempt
def organizer_signup(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            email = data.get("email")
            password = data.get("password")
            location = data.get("location")
            phone_number = data.get("phone_number")

            # Validate required fields
            if not username or not email or not password or not location or not phone_number:
                return JsonResponse({"error": "All fields are required."}, status=400)

            # Check if organizer already exists
            if organizers_collection.find_one({'$or': [{'email': email}, {'username': username}]}):
                return JsonResponse({"error": "Organizer already exists."}, status=409)

            # Hash the password
            hashed_password = make_password(password)

            # Prepare organizer data
            organizer_data = {
                "username": username,
                "email": email,
                "password": hashed_password,
                "location": location,
                "phone_number": phone_number
            }

            # Insert into MongoDB
            result = organizers_collection.insert_one(organizer_data)

            # Prepare response data (do not include password or _id)
            response_data = {
                "username": username,
                "email": email,
                "location": location,
                "phone_number": phone_number,
                "id": str(result.inserted_id)
            }

            return JsonResponse({"message": "Organizer registered successfully."}, status=201)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Only POST method is allowed."}, status=405)

@csrf_exempt
def organizer_login(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            password = data.get("password")

            if not email or not password:
                return JsonResponse({"error": "Email and password are required."}, status=400)

            organizer = organizers_collection.find_one({"email": email})
            if not organizer:
                return JsonResponse({"error": "Invalid credentials."}, status=401)

            if not check_password(password, organizer["password"]):
                return JsonResponse({"error": "Invalid credentials."}, status=401)

            payload = {
                "organizer_id": str(organizer["_id"]),
                "username": organizer["username"],
                "location": organizer["location"]
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

            return JsonResponse({"token": token}, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Only POST method is allowed."}, status=405)