from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from pymongo import MongoClient
from django.contrib.auth.hashers import make_password, check_password
import jwt
from datetime import datetime, timedelta
from bson import ObjectId
import requests
import string
import random
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

SECRET_KEY = 'FetiFly' 

# Connect to MongoDBclient = MongoClient('mongodb+srv://ihub:akash@ihub.fel24ru.mongodb.net/')
client = MongoClient('mongodb+srv://ihub:akash@ihub.fel24ru.mongodb.net/')
db = client['festifly']
organizers_collection = db['organizers']


@csrf_exempt
def organizer_google_auth(request):
    """Handle Google OAuth authentication for organizers"""
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    
    try:
        # Get Google token from request
        data = json.loads(request.body)
        token = data.get("token")
        
        if not token:
            return JsonResponse({"error": "No token provided"}, status=400)
        
        # Google Client ID (replace with your own)
        GOOGLE_CLIENT_ID = "417585596392-pvibn0rqis2ka0hjesis5k1imten2am8.apps.googleusercontent.com"
        
        # Verify the token
        try:
            # Specify the CLIENT_ID of the app that accesses the backend
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
            
            # Check if the token is for our app
            if idinfo['aud'] not in [GOOGLE_CLIENT_ID]:
                raise ValueError('Could not verify audience.')
            
            # ID token is valid. Get the user's Google Account info
            google_id = idinfo['sub']
            email = idinfo['email']
            name = idinfo.get('name', '')
            picture = idinfo.get('picture', '')
            
        except ValueError as e:
            # Invalid token
            return JsonResponse({"error": f"Invalid token: {str(e)}"}, status=401)
        
        # Check if organizer exists by email AND google_id
        # This ensures we're looking for the exact same Google account
        organizer = organizers_collection.find_one({
            "$or": [
                {"email": email, "google_id": google_id},
                {"email": email, "auth_provider": "google"}
            ]
        })
        
        is_new_organizer = False
        
        if organizer:
            # Organizer exists - log them in
            organizer_id = str(organizer["_id"])
            
            # Update last login and ensure google_id is saved
            organizers_collection.update_one(
                {"_id": organizer["_id"]},
                {"$set": {
                    "last_login": datetime.utcnow(),
                    "google_id": google_id,
                    "auth_provider": "google"
                }}
            )
            
        else:
            # Organizer doesn't exist - check if email is already taken by non-Google account
            email_exists = organizers_collection.find_one({"email": email})
            
            if email_exists:
                return JsonResponse({
                    "error": "This email is already registered. Please use your password to login or use a different Google account."
                }, status=409)
            
            # Generate a unique username
            username = email.split('@')[0] + '_' + ''.join(random.choices(string.digits, k=4))
            
            # Ensure unique username
            while organizers_collection.find_one({"username": username}):
                username = email.split('@')[0] + '_' + ''.join(random.choices(string.digits, k=4))
            
            # Create new organizer
            new_organizer = {
                "username": username,
                "email": email,
                "name": name,
                "password": None,  # No password for Google organizers
                "profile_image": picture,
                "auth_provider": "google",
                "google_id": google_id,
                "location": "",
                "phone_number": "",
                "created_at": datetime.utcnow(),
                "last_login": datetime.utcnow(),
                "festivals_count": 0
            }
            
            result = organizers_collection.insert_one(new_organizer)
            organizer_id = str(result.inserted_id)
            is_new_organizer = True
            
        # Fetch the organizer data to ensure we have the most up-to-date information
        organizer = organizers_collection.find_one({"_id": ObjectId(organizer_id)})
        
        if not organizer:
            return JsonResponse({"error": "Failed to create or retrieve organizer account"}, status=500)
            
        # Create JWT payload
        payload = {
            "organizer_id": organizer_id,
            "username": organizer["username"],
            "email": organizer["email"],
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

        # Prepare organizer response object (exclude password)
        organizer_response = {
            "id": organizer_id,
            "username": organizer["username"],
            "email": organizer["email"],
            "name": organizer.get("name", ""),
            "location": organizer.get("location", ""),
            "phone_number": organizer.get("phone_number", ""),
            "profile_image": organizer.get("profile_image", ""),
            "auth_provider": organizer.get("auth_provider", "email"),
            "festivals_count": organizer.get("festivals_count", 0),
            "google_id": organizer.get("google_id", "")  # Include google_id for verification
        }
        
        return JsonResponse({
            "token": token,
            "organizer": organizer_response,
            "isNewOrganizer": is_new_organizer
        })
        
    except Exception as e:
        print(f"Google auth error: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)
    
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

            # Create JWT with more comprehensive organizer data
            payload = {
                "organizer_id": str(organizer["_id"]),
                "username": organizer["username"],
                "email": organizer["email"],
                "exp": datetime.utcnow() + timedelta(days=7)  # Extend token life to 7 days
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

            # Prepare organizer response object (exclude password)
            organizer_response = {
                "id": str(organizer["_id"]),
                "username": organizer["username"],
                "email": organizer["email"],
                "name": organizer.get("name", ""),
                "location": organizer.get("location", ""),
                "phone_number": organizer.get("phone_number", ""),
            }

            return JsonResponse({
                "token": token, 
                "organizer": organizer_response
            }, status=200)

        except Exception as e:
            print(f"Login error: {str(e)}")
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Only POST method is allowed."}, status=405)

# Add this function to verify JWT tokens
def verify_organizer_token(token):
    """Verify JWT token and return organizer ID"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        organizer_id = payload.get("organizer_id")
        if not organizer_id:
            return None
        return organizer_id
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@csrf_exempt
def create_festival(request):
    if request.method == "POST":
        try:
            # Get JWT token from Authorization header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return JsonResponse({"error": "Authorization token required"}, status=401)
            
            token = auth_header.split(' ')[1]
            organizer_id = verify_organizer_token(token)
            
            if not organizer_id:
                return JsonResponse({"error": "Invalid or expired token"}, status=401)
            
            # Get organizer info from database
            organizer = organizers_collection.find_one({"_id": ObjectId(organizer_id)})
            if not organizer:
                return JsonResponse({"error": "Organizer not found"}, status=404)
                
            # Process festival data
            data = json.loads(request.body)
            required = ["name", "location", "tags", "subreddit"]
            
            # Check for required fields
            if not all(data.get(k) for k in required):
                return JsonResponse({"error": "Missing required fields"}, status=400)
            
            # Create minimal organizer info to store with festival
            organizer_info = {
                "id": organizer_id,
                "username": organizer["username"],
                "email": organizer["email"]
            }
            
            # Add location and phone if available
            if "location" in organizer:
                organizer_info["location"] = organizer["location"]
            if "phone_number" in organizer:
                organizer_info["phone_number"] = organizer["phone_number"]
            
            # Create festival document with proper structure
            festival_data = {
                "title": data["name"],
                "location": data["location"],
                "tags": data["tags"],
                "url": data.get("url", ""),
                "month": datetime.utcnow().strftime("%B"),
                "content": data.get("description", ""),
                "fetched_at": datetime.utcnow(),
                "status": data.get("status", "pending"),
                "source": "organizer",
                "dateAdded": datetime.utcnow(),
                "subreddit": data["subreddit"],
                "organizer": organizer_info
            }

            # Insert the festival
            result = db["festivals"].insert_one(festival_data)
            
            # Update organizer's festivals count
            organizers_collection.update_one(
                {"_id": ObjectId(organizer_id)},
                {"$inc": {"festivals_count": 1}}
            )
            
            # Return success response with the created festival ID
            return JsonResponse({
                "message": "Festival created successfully",
                "festival_id": str(result.inserted_id)
            }, status=201)
            
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON data"}, status=400)
        except Exception as e:
            print(f"Error creating festival: {str(e)}")
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Only POST method is allowed"}, status=405)

@csrf_exempt
def list_organizer_festivals(request):
    if request.method == "GET":
        try:
            # Get JWT token from Authorization header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return JsonResponse({"error": "Authorization token required"}, status=401)
            
            token = auth_header.split(' ')[1]
            organizer_id = verify_organizer_token(token)
            
            if not organizer_id:
                return JsonResponse({"error": "Invalid or expired token"}, status=401)
                
            # Fetch festivals created by this organizer only
            query = {"source": "organizer", "organizer.id": organizer_id}
            fests = list(db["festivals"].find(query).sort("dateAdded", -1))
            
            # Convert ObjectId to string for JSON serialization
            for fest in fests:
                fest["_id"] = str(fest["_id"])
                
            return JsonResponse({"festivals": fests}, status=200)
        except Exception as e:
            print(f"Error listing festivals: {str(e)}")
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Only GET method is allowed"}, status=405)

@csrf_exempt
def update_festival(request, fest_id):
    if request.method == "PATCH":
        try:
            # Get JWT token from Authorization header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return JsonResponse({"error": "Authorization token required"}, status=401)
            
            token = auth_header.split(' ')[1]
            organizer_id = verify_organizer_token(token)
            
            if not organizer_id:
                return JsonResponse({"error": "Invalid or expired token"}, status=401)
                
            # Check if festival exists and belongs to this organizer
            festival = db["festivals"].find_one({
                "_id": ObjectId(fest_id), 
                "organizer.id": organizer_id
            })
            
            if not festival:
                return JsonResponse({
                    "error": "Festival not found or you don't have permission to update it"
                }, status=404)
            
            # Process updates
            updates = json.loads(request.body)
            
            # Create a clean update object with allowed fields only
            allowed_updates = {
                k: v for k, v in updates.items() 
                if k in ["title", "location", "tags", "url", "content", "subreddit", "status"]
            }
            
            if "name" in updates:  # Handle "name" field mapping to "title"
                allowed_updates["title"] = updates["name"]
                
            if "description" in updates:  # Handle "description" field mapping to "content"
                allowed_updates["content"] = updates["description"]
            
            # Don't allow updating organizer information
            if not allowed_updates:
                return JsonResponse({"error": "No valid fields to update"}, status=400)
            
            # Perform update
            db["festivals"].update_one(
                {"_id": ObjectId(fest_id)}, 
                {"$set": allowed_updates}
            )
            
            return JsonResponse({"message": "Festival updated successfully"}, status=200)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON data"}, status=400)
        except Exception as e:
            print(f"Error updating festival: {str(e)}")
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Only PATCH method is allowed"}, status=405)

@csrf_exempt
def delete_festival(request, fest_id):
    if request.method == "DELETE":
        try:
            # Get JWT token from Authorization header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return JsonResponse({"error": "Authorization token required"}, status=401)
            
            token = auth_header.split(' ')[1]
            organizer_id = verify_organizer_token(token)
            
            if not organizer_id:
                return JsonResponse({"error": "Invalid or expired token"}, status=401)
            
            # Check if festival exists and belongs to this organizer
            festival = db["festivals"].find_one({
                "_id": ObjectId(fest_id), 
                "organizer.id": organizer_id
            })
            
            if not festival:
                return JsonResponse({
                    "error": "Festival not found or you don't have permission to delete it"
                }, status=404)
            
            # Delete the festival
            db["festivals"].delete_one({"_id": ObjectId(fest_id)})
            
            # Decrement organizer's festivals count
            organizers_collection.update_one(
                {"_id": ObjectId(organizer_id)},
                {"$inc": {"festivals_count": -1}}
            )
            
            return JsonResponse({"message": "Festival deleted successfully"}, status=200)
        except Exception as e:
            print(f"Error deleting festival: {str(e)}")
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Only DELETE method is allowed"}, status=405)