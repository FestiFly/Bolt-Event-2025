from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from rest_framework.decorators import api_view
import json
from rest_framework.decorators import api_view
from pymongo import MongoClient, DESCENDING
from bson.objectid import ObjectId
from django.contrib.auth.hashers import make_password, check_password
import jwt
from datetime import datetime, timedelta
import random
import string
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

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
def google_auth(request):
    """Handle Google OAuth authentication"""
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
        
        # Check if user exists
        user = users_collection.find_one({"email": email})
        
        if user:
            # User exists - log them in
            user_id = str(user["_id"])
            
            # Update last login
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
        else:
            # User doesn't exist - create new account
            username = email.split('@')[0] + '_' + ''.join(random.choices(string.digits, k=4))
            
            # Generate a unique username (avoid collisions)
            while users_collection.find_one({"username": username}):
                username = email.split('@')[0] + '_' + ''.join(random.choices(string.digits, k=4))
            
            # Generate a unique referral code
            user_referral_code = generate_referral_code()
            
            # Create new user
            new_user = {
                "username": username,
                "email": email,
                "name": name,
                "password": None,  # No password for Google users
                "profile_image": picture,
                "auth_provider": "google",
                "google_id": google_id,
                "preferences": [],
                "location": "",
                "bio": "",
                "created_at": datetime.utcnow(),
                "last_login": datetime.utcnow(),
                "referralCode": user_referral_code,
                "referrals": [],
                "referredBy": None
            }
            
            result = users_collection.insert_one(new_user)
            user_id = str(result.inserted_id)
            
        # Generate JWT token - include any premium status if exists
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        
        # Check for premium subscription
        premium_plan = None
        if user.get('premium') and user['premium'].get('is_active'):
            premium_plan = user['premium'].get('plan')
            
        # Check if premium subscription has expired
        user = check_subscription_expiry(user)
        
        # Create JWT payload
        payload = {
            "user_id": user_id,
            "username": user["username"],
            "email": user["email"],
            "plan": premium_plan,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

        # Prepare user response object (exclude password)
        user_response = {
            "id": user_id,
            "username": user["username"],
            "email": user["email"],
            "name": user.get("name", ""),
            "preferences": user.get("preferences", []),
            "location": user.get("location", ""),
            "bio": user.get("bio", ""),
            "profile_image": user.get("profile_image", ""),
            "auth_provider": user.get("auth_provider", "email"),
            "referralCode": user.get("referralCode", ""),
            "premium": user.get("premium", {
                "is_active": False,
                "plan": None,
                "expires_at": None
            }),
        }
        
        return JsonResponse({
            "token": token,
            "user": user_response,
            "isNewUser": not bool(user.get("last_login"))
        })
        
    except Exception as e:
        print(f"Google auth error: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)
    

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
                "plan": user.get("premium", {}).get("plan", None),
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
                "plan": user.get("premium", {}).get("plan", None),
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


# Update this function to properly handle timezone differences
def check_subscription_expiry(user):
    """Check if a user's premium subscription has expired and update accordingly"""
    if not user or 'premium' not in user or not user['premium'].get('is_active', False):
        return user
    
    # Check if the expiration date has passed
    expiry_date = user['premium'].get('expires_at')
    if not expiry_date:
        return user
    
    # We'll compare IST stored time with current IST time
    now_ist = datetime.utcnow() + timedelta(hours=5, minutes=30)
     
    
    # If expired, update the premium status
    if expiry_date < now_ist:
        # Mark subscription as expired but keep historical data
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "premium.is_active": False,
                "premium.expired": True,
                "premium.expired_at": now_ist
            }}
        )
        
        # Update user object to reflect changes
        user['premium']['is_active'] = False
        user['premium']['expired'] = True
        user['premium']['expired_at'] = now_ist
        
        print(f"User subscription expired and marked as inactive")
        
    return user

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
        
        # Check if premium subscription has expired
        user = check_subscription_expiry(user)
        
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
            "referredBy": user.get("referredBy"),
            "premium": user.get("premium", {
                "is_active": False,
                "plan": None
            }),
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
        
        # Check if premium subscription has expired
        user = check_subscription_expiry(user)
        
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
            "referredBy": user.get("referredBy"),
            "premium": user.get("premium", {
                "is_active": False,
                "plan": None,
                "expires_at": None
            }),
            "created_at": user.get("created_at"),
            "last_login": user.get("last_login")
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
    
#=============================================================== Payments ================================================================

@csrf_exempt
def payment_success(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    
    try:
        data = json.loads(request.body)
        email = data.get("email")
        plan = data.get("plan")  # "monthly" or "yearly"
        payment_id = data.get("payment_id")
        user_id = data.get("userId")  # Get userId from request body
        
        print(f"Payment success data: {data}")  # Debug log
        
        # Try to get user ID from token first
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                token_user_id = payload.get("user_id")
                if token_user_id:
                    user_id = token_user_id  # Prefer token user_id over request body
                print(f"Token user_id: {token_user_id}")  # Debug log
            except Exception as e:
                print(f"Error decoding token: {e}")
        
        print(f"Final user_id: {user_id}, email: {email}")  # Debug log
            
        if not email and not user_id:
            return JsonResponse({"error": "Missing user identification (email or userId)"}, status=400)
        
        if not plan:
            return JsonResponse({"error": "Missing plan details"}, status=400)

        # Build query to find user
        query_conditions = []
        
        # Add user_id condition if available
        if user_id:
            try:
                query_conditions.append({"_id": ObjectId(user_id)})
            except Exception as e:
                print(f"Invalid ObjectId: {user_id}, error: {e}")
        
        # Add email condition if available
        if email:
            query_conditions.append({"email": email})
        
        if not query_conditions:
            return JsonResponse({"error": "No valid user identification provided"}, status=400)
        
        # Use $or to find user by either condition
        query = {"$or": query_conditions} if len(query_conditions) > 1 else query_conditions[0]
        
        print(f"MongoDB query: {query}")  # Debug log
        
        # Find the user
        user = users_collection.find_one(query)
        if not user:
            print(f"User not found with query: {query}")  # Debug log
            
            # Try to find user by email only as fallback
            if email:
                user = users_collection.find_one({"email": email})
                print(f"Fallback email search result: {user is not None}")
            
            if not user:
                return JsonResponse({"error": "User not found"}, status=404)
        
        print(f"Found user: {user['username']} ({user['email']})")  # Debug log
            
        # Start with IST time directly instead of UTC
        # Get current time in IST (UTC+5:30)
        now_utc = datetime.utcnow()
        now_ist = now_utc + timedelta(hours=5, minutes=30)
        
        print(f"Current UTC time: {now_utc}")
        print(f"Current IST time being stored: {now_ist}")
        
        if plan == "monthly":
            # Calculate expiry in IST directly
            expire_ist = now_ist + timedelta(days=30)
            print(f"Subscription will expire at (IST): {expire_ist}")
            
            premium_data = {
                "is_active": True,
                "plan": "monthly",
                "payment_id": payment_id,
                "amount": 49,
                "currency": "INR",
                "started_at": now_ist,  # Store IST time
                "started_at_utc": now_utc,  # Store UTC time as reference
                "expires_at": expire_ist,  # Store IST expiry time
                "expires_at_utc": now_utc + timedelta(days=30),  # Store UTC expiry as reference
                "timezone": "Asia/Kolkata",  # Store timezone info
                "is_pro": True,
                "is_plus": False,  # Monthly plan is not Plus
                "expired": False   # Reset expired flag if present
            }
        elif plan == "yearly":
            # Calculate expiry in IST directly
            expire_ist = now_ist + timedelta(days=365)
            print(f"Subscription will expire at (IST): {expire_ist}")
            
            premium_data = {
                "is_active": True,
                "plan": "yearly",
                "payment_id": payment_id,
                "amount": 499,
                "currency": "INR", 
                "started_at": now_ist,  # Store IST time
                "started_at_utc": now_utc,  # Store UTC time as reference
                "expires_at": expire_ist,  # Store IST expiry time
                "expires_at_utc": now_utc + timedelta(days=365),  # Store UTC expiry as reference
                "timezone": "Asia/Kolkata",  # Store timezone info
                "is_pro": False,   # Clear pro flag
                "is_plus": True,   # Only set plus flag
                "expired": False   # Reset expired flag if present
            }
        else:
            return JsonResponse({"error": "Invalid plan"}, status=400)
        
        # Update user in database
        update_result = users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"premium": premium_data}}
        )
        
        # Update JWT token to include the plan
        new_payload = {
            "user_id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "plan": plan,  # Add the plan to JWT
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        new_token = jwt.encode(new_payload, SECRET_KEY, algorithm="HS256")
        
        print(f"Update result: {update_result.modified_count} documents modified")  # Debug log
        
        if update_result.modified_count == 0:
            return JsonResponse({"error": "Failed to update user premium status"}, status=500)
        
        # In the response, include formatted dates for frontend
        return JsonResponse({
            "success": True,
            "message": f"Premium {plan} plan activated successfully",
            "expires_at": expire_ist.isoformat(),
            "expires_at_formatted": expire_ist.strftime("%Y-%m-%d %H:%M:%S IST"), 
            "started_at": now_ist.isoformat(),
            "token": new_token,
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "username": user["username"],
                "plan": plan
            }
        })
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return JsonResponse({"error": "Invalid JSON data", "success": False}, status=400)
    except Exception as e:
        print(f"Payment success error: {e}")
        return JsonResponse({"error": str(e), "success": False}, status=500)

# Add a new endpoint to manually check and refresh subscription status
@csrf_exempt
def check_subscription_status(request):
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
        
        # Check if premium subscription has expired
        updated_user = check_subscription_expiry(user)
        
        # Get premium status
        premium = updated_user.get('premium', {})
        is_active = premium.get('is_active', False)
        plan = premium.get('plan')
        expires_at = premium.get('expires_at')
        
        # Format expiry date if available
        expiry_formatted = None
        if expires_at:
            expiry_formatted = expires_at.strftime("%Y-%m-%d %H:%M:%S UTC")
            
        return JsonResponse({
            "is_active": is_active,
            "plan": plan,
            "expires_at": expiry_formatted,
            "is_expired": premium.get('expired', False),
            "need_renewal": is_active == False and premium.get('expired', False)
        })
        
    except jwt.ExpiredSignatureError:
        return JsonResponse({"error": "Token expired"}, status=401)
    except (jwt.InvalidTokenError, Exception) as e:
        return JsonResponse({"error": f"Invalid token: {str(e)}"}, status=401)