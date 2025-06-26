from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from pymongo import MongoClient, DESCENDING
from bson.objectid import ObjectId
from django.contrib.auth.hashers import make_password, check_password
import jwt
from datetime import datetime, timedelta
import random
import string

SECRET_KEY = 'FetiFly'

# Connect to MongoDB
client = MongoClient('mongodb+srv://ihub:akash@ihub.fel24ru.mongodb.net/')
db = client['festifly']
users_collection = db['users']

# Generate a random referral code
def generate_referral_code():
    prefix = "FESTIFLY"
    unique_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}{unique_part}"

@csrf_exempt
def user_signup(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            email = data.get("email")
            password = data.get("password")
            name = data.get("name", "")
            preferences = data.get("preferences", [])
            referral_code = data.get("referralCode")  # Get referral code if provided

            # Validate required fields
            if not username or not email or not password:
                return JsonResponse({"error": "Username, email, and password are required"}, status=400)

            # Check if user already exists
            existing_user = users_collection.find_one({'$or': [{'email': email}, {'username': username}]})
            if existing_user:
                if existing_user.get('email') == email:
                    return JsonResponse({"error": "Email already registered"}, status=409)
                else:
                    return JsonResponse({"error": "Username already taken"}, status=409)

            # Hash the password
            hashed_password = make_password(password)

            # Generate a unique referral code for this user
            user_referral_code = generate_referral_code()

            # Create user document
            user_data = {
                "username": username,
                "email": email,
                "password": hashed_password,
                "name": name,
                "preferences": preferences,
                "location": "",
                "bio": "",
                "created_at": datetime.utcnow(),
                "last_login": None,
                "referralCode": user_referral_code,
                "referrals": [],
                "referredBy": None
            }

            # Handle referral code if provided
            if referral_code:
                referring_user = users_collection.find_one({"referralCode": referral_code})
                if referring_user:
                    # Set referredBy for the new user
                    user_data["referredBy"] = {
                        "userId": str(referring_user["_id"]),
                        "username": referring_user["username"],
                        "date": datetime.utcnow()
                    }
                    
                    # Update the referring user's referrals array
                    users_collection.update_one(
                        {"_id": referring_user["_id"]},
                        {"$push": {"referrals": {
                            "userId": None,  # Will be updated after user creation
                            "username": username,
                            "date": datetime.utcnow()
                        }}}
                    )
            
            # Insert into MongoDB
            result = users_collection.insert_one(user_data)
            
            # If this user was referred by someone, update the referrer's referrals array with the new user's ID
            if referral_code and referring_user:
                users_collection.update_one(
                    {"_id": referring_user["_id"], "referrals.username": username},
                    {"$set": {"referrals.$.userId": str(result.inserted_id)}}
                )

            # Generate JWT token
            payload = {
                "user_id": str(result.inserted_id),
                "username": username,
                "email": email,
                "exp": datetime.utcnow() + timedelta(days=7)
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

            # Update last login
            users_collection.update_one({"_id": result.inserted_id}, {"$set": {"last_login": datetime.utcnow()}})

            # Response object (exclude password)
            user_response = {
                "id": str(result.inserted_id),
                "username": username,
                "email": email,
                "name": name,
                "preferences": preferences,
                "referralCode": user_referral_code
            }

            return JsonResponse({
                "message": "User registered successfully",
                "token": token,
                "user": user_response
            }, status=201)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Only POST method is allowed."}, status=405)


@csrf_exempt
def user_login(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            password = data.get("password")

            if not email or not password:
                return JsonResponse({"error": "Email and password are required"}, status=400)

            # Find user by email
            user = users_collection.find_one({"email": email})
            if not user:
                return JsonResponse({"error": "Invalid credentials"}, status=401)

            # Verify password
            if not check_password(password, user["password"]):
                return JsonResponse({"error": "Invalid credentials"}, status=401)

            # Generate JWT token
            payload = {
                "user_id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "exp": datetime.utcnow() + timedelta(days=7)
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

            # Update last login
            users_collection.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow()}})

            # Prepare user response object (exclude password)
            user_response = {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "name": user.get("name", ""),
                "preferences": user.get("preferences", []),
                "location": user.get("location", ""),
                "bio": user.get("bio", ""),
                "referralCode": user.get("referralCode", ""),
                "referrals": user.get("referrals", []),
                "referredBy": user.get("referredBy")
            }

            return JsonResponse({
                "token": token,
                "user": user_response
            }, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Only POST method is allowed."}, status=405)


@csrf_exempt
def verify_token(request):
    if request.method != "GET":
        return JsonResponse({"error": "Only GET method is allowed."}, status=405)
    
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return JsonResponse({"valid": False, "error": "No token provided"}, status=401)
    
    token = auth_header.split(' ')[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        
        # Find user by ID
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return JsonResponse({"valid": False, "error": "User not found"}, status=401)
        
        # Prepare user response object (exclude password)
        user_response = {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "name": user.get("name", ""),
            "preferences": user.get("preferences", []),
            "location": user.get("location", ""),
            "bio": user.get("bio", ""),
            "referralCode": user.get("referralCode", ""),
            "referrals": user.get("referrals", []),
            "referredBy": user.get("referredBy")
        }
        
        return JsonResponse({
            "valid": True,
            "user": user_response
        })
    
    except jwt.ExpiredSignatureError:
        return JsonResponse({"valid": False, "error": "Token expired"}, status=401)
    except (jwt.InvalidTokenError, Exception) as e:
        return JsonResponse({"valid": False, "error": f"Invalid token: {str(e)}"}, status=401)


@csrf_exempt
def user_profile(request):
    if request.method != "GET":
        return JsonResponse({"error": "Only GET method is allowed."}, status=405)
    
    # Verify token
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return JsonResponse({"error": "No token provided"}, status=401)
    
    token = auth_header.split(' ')[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        
        # Find user by ID
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return JsonResponse({"error": "User not found"}, status=404)
        
        # Prepare user response object (exclude password)
        user_response = {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "name": user.get("name", ""),
            "preferences": user.get("preferences", []),
            "location": user.get("location", ""),
            "bio": user.get("bio", ""),
            "referralCode": user.get("referralCode", generate_referral_code()),
            "referrals": user.get("referrals", []),
            "referredBy": user.get("referredBy")
        }
        
        # If user doesn't have a referral code yet, generate and save one
        if not user.get("referralCode"):
            referralCode = user_response["referralCode"]
            users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"referralCode": referralCode}}
            )
        
        return JsonResponse(user_response)
    
    except jwt.ExpiredSignatureError:
        return JsonResponse({"error": "Token expired"}, status=401)
    except (jwt.InvalidTokenError, Exception) as e:
        return JsonResponse({"error": f"Invalid token: {str(e)}"}, status=401)


@csrf_exempt
def update_profile(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    
    # Verify token
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return JsonResponse({"error": "No token provided"}, status=401)
    
    token = auth_header.split(' ')[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        
        # Parse request data
        data = json.loads(request.body)
        name = data.get("name")
        bio = data.get("bio")
        location = data.get("location")
        preferences = data.get("preferences", [])
        
        # Update user profile
        update_data = {}
        if name is not None:
            update_data["name"] = name
        if bio is not None:
            update_data["bio"] = bio
        if location is not None:
            update_data["location"] = location
        if preferences:
            update_data["preferences"] = preferences
        
        if not update_data:
            return JsonResponse({"error": "No data to update"}, status=400)
        
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        # Get updated user
        updated_user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not updated_user:
            return JsonResponse({"error": "User not found"}, status=404)
        
        # Prepare response
        user_response = {
            "id": str(updated_user["_id"]),
            "username": updated_user["username"],
            "email": updated_user["email"],
            "name": updated_user.get("name", ""),
            "preferences": updated_user.get("preferences", []),
            "location": updated_user.get("location", ""),
            "bio": updated_user.get("bio", ""),
            "referralCode": updated_user.get("referralCode", ""),
            "referrals": updated_user.get("referrals", []),
            "referredBy": updated_user.get("referredBy")
        }
        
        return JsonResponse({
            "message": "Profile updated successfully",
            "user": user_response
        })
        
    except jwt.ExpiredSignatureError:
        return JsonResponse({"error": "Token expired"}, status=401)
    except (jwt.InvalidTokenError, Exception) as e:
        return JsonResponse({"error": f"Invalid token: {str(e)}"}, status=401)


@csrf_exempt
def apply_referral(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    
    # Verify token
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return JsonResponse({"error": "No token provided"}, status=401)
    
    token = auth_header.split(' ')[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        
        # Parse request data
        data = json.loads(request.body)
        referral_code = data.get("referralCode")
        
        if not referral_code:
            return JsonResponse({"error": "Referral code is required"}, status=400)
        
        # Check if user already has a referrer
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if user.get("referredBy"):
            return JsonResponse({"error": "You already have a referrer"}, status=400)
        
        # Find referring user by referral code
        referring_user = users_collection.find_one({"referralCode": referral_code})
        if not referring_user:
            return JsonResponse({"error": "Invalid referral code"}, status=404)
        
        # Prevent self-referral
        if str(referring_user["_id"]) == user_id:
            return JsonResponse({"error": "You cannot refer yourself"}, status=400)
        
        # Update the current user with referrer information
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"referredBy": {
                "userId": str(referring_user["_id"]),
                "username": referring_user["username"],
                "date": datetime.utcnow()
            }}}
        )
        
        # Update the referring user's referrals list
        users_collection.update_one(
            {"_id": referring_user["_id"]},
            {"$push": {"referrals": {
                "userId": user_id,
                "username": user["username"],
                "date": datetime.utcnow()
            }}}
        )
        
        return JsonResponse({
            "success": True,
            "message": "Referral code applied successfully",
            "referrer": {
                "username": referring_user["username"]
            }
        })
        
    except jwt.ExpiredSignatureError:
        return JsonResponse({"error": "Token expired"}, status=401)
    except (jwt.InvalidTokenError, Exception) as e:
        return JsonResponse({"error": f"Invalid token: {str(e)}"}, status=401)