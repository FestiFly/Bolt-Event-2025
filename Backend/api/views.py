from django.http import JsonResponse
from rest_framework.decorators import api_view
import openai, praw, requests
from textblob import TextBlob
import os
import requests
from datetime import datetime
import re
from django.views.decorators.csrf import csrf_exempt
from pymongo import MongoClient
import json
import copy
from pymongo.errors import PyMongoError
import google.generativeai as genai
from bson.objectid import ObjectId

# MongoDB setup
client = MongoClient('mongodb+srv://ihub:akash@ihub.fel24ru.mongodb.net/')
db = client['festifly']
festival_collection = db['festivals']

# -------------------------------------------------- Utilities -------------------------------------------------
# Set up OpenAI and Reddit API clients
openai.api_key = "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"
reddit = praw.Reddit(
    client_id="3VH_mH98qrCYqfsi7U959A",
    client_secret="fjqtjosj1j9b5spWZ8YgUQ8N5NNbJw",
    user_agent="festifly-agent"
)

# Gemini setup
genai.configure(api_key="AIzaSyC5iWXg1sKwZsbh-YpgA58CP8Ulg4q4Y5I")
model = genai.GenerativeModel("gemini-2.0-flash")

# Connect to MongoDB
client = MongoClient('mongodb+srv://ihub:akash@ihub.fel24ru.mongodb.net/')
db = client['festifly']
festival_collection = db['festivals']

# You can expand this to include more subreddits
RELEVANT_SUBREDDITS = ["Festivals", "IndiaTravel", "travel", "backpacking", "festival_culture"]

# You can use your Reddit API credentials here
HEADERS = {"User-Agent": "FestiflyBot/0.1"}

def get_post_vibe(permalink):
    try:
        post_id = permalink.split("/comments/")[1].split("/")[0]
        submission = reddit.submission(id=post_id)
        submission.comments.replace_more(limit=0)
        comments = [comment.body for comment in submission.comments[:10]]
        if not comments:
            return None
        scores = [TextBlob(comment).sentiment.polarity for comment in comments]
        return round(sum(scores) / len(scores), 2)
    except Exception as e:
        print(f"Error calculating vibe for {permalink}: {e}")
        return None

def fetch_reddit_festivals(location, interests, month):
    search_query = f"{location} {month} {' '.join(interests)} festival"
    seen_links = set()
    results = []

    for subreddit in RELEVANT_SUBREDDITS:
        url = f"https://www.reddit.com/r/{subreddit}/search.json"
        params = {
            "q": search_query,
            "restrict_sr": "true",
            "sort": "top",
            "limit": 10,
            "t": "year"
        }

        response = requests.get(url, headers=HEADERS, params=params)

        if response.status_code == 200:
            posts = response.json().get("data", {}).get("children", [])

            for post in posts:
                data = post.get("data", {})
                title = data.get("title")
                permalink = data.get("permalink")
                score = data.get("score", 0)

                if title and permalink:
                    full_url = f"https://reddit.com{permalink}"

                    # Skip if already added
                    if full_url in seen_links:
                        continue
                    seen_links.add(full_url)

                    # Get vibe score
                    vibe = get_post_vibe(permalink)

                    # Get post body content (summary)
                    try:
                        post_id = permalink.split("/comments/")[1].split("/")[0]
                        submission = reddit.submission(id=post_id)
                        content = submission.selftext[:500] if submission.selftext else None
                    except Exception as e:
                        print(f"Error fetching content for {permalink}: {e}")
                        content = None

                    results.append({
                        "title": title,
                        "location": location,
                        "tags": interests,
                        "reddit_url": full_url,
                        "upvotes": score,
                        "month": month,
                        "vibe_score": vibe,
                        "content": content,
                        "fetched_at": datetime.utcnow()
                    })

    return results

@csrf_exempt
def get_recommendations(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)

    try:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON body."}, status=400)

        location = data.get("location", "").strip()
        interests = data.get("interests", [])
        month = data.get("month", "").strip()

        if not location or not month:
            return JsonResponse({
                "error": "Both 'location' and 'month' are required fields."
            }, status=400)

        print(f"[{datetime.utcnow()}] Searching: location={location}, month={month}, interests={interests}")

        festivals = fetch_reddit_festivals(location, interests, month)

        if not festivals:
            return JsonResponse({
                "message": "No festivals found for the given filters.",
                "festivals": []
            }, status=200)

        try:
            insert_result = festival_collection.insert_many(copy.deepcopy(festivals))
            for i, fest in enumerate(festivals):
                fest["_id"] = str(insert_result.inserted_ids[i])
        except PyMongoError as e:
            print(f"MongoDB error: {str(e)}")

        # Sort by vibe and upvotes
        festivals.sort(key=lambda x: (x.get("vibe_score") or 0, x.get("upvotes", 0)), reverse=True)

        # Reorder keys: _id on top
        for i in range(len(festivals)):
            fest = festivals[i]
            reordered = {
                "_id": fest.get("_id"),
                "title": fest.get("title"),
                "location": fest.get("location"),
                "tags": fest.get("tags"),
                "content": fest.get("content"),
                "reddit_url": fest.get("reddit_url"),
                "upvotes": fest.get("upvotes"),
                "month": fest.get("month"),
                "vibe_score": fest.get("vibe_score"),
                "fetched_at": fest.get("fetched_at")
            }
            festivals[i] = reordered

        return JsonResponse({"festivals": festivals}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)

@csrf_exempt
@api_view(["POST"])
def get_festival_by_id(request):
    try:
        body = json.loads(request.body)
        festival_id = body.get("_id")

        if not festival_id:
            return JsonResponse({"error": "_id is required"}, status=400)

        festival = festival_collection.find_one({"_id": ObjectId(festival_id)})
        if not festival:
            return JsonResponse({"error": "Festival not found"}, status=404)

        festival["_id"] = str(festival["_id"])  # Convert ObjectId to string for frontend
        return JsonResponse({"festival": festival}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)

@csrf_exempt
@api_view(["POST"])
def fetch_reddit_reviews_by_id(request):
    try:
        data = json.loads(request.body)
        festival_id = data.get("_id")

        if not festival_id:
            return JsonResponse({"error": "_id is required"}, status=400)

        # Fetch festival from DB
        festival = festival_collection.find_one({"_id": ObjectId(festival_id)})
        if not festival:
            return JsonResponse({"error": "Festival not found in database."}, status=404)

        # ✅ Return early if already cached
        existing_reviews = festival.get("reddit_review", [])
        if existing_reviews:
            return JsonResponse({
                "message": "Reviews loaded from cache.",
                "reviews": existing_reviews
            }, status=200)

        # If not cached, generate search query
        title = festival.get("title", "")
        location = festival.get("location", "")
        month = festival.get("month", "")
        search_query = f"{title} {location} {month} festival"
        print(f"Reddit review query: {search_query}")

        comments_collected = []

        for subreddit in RELEVANT_SUBREDDITS:
            url = f"https://www.reddit.com/r/{subreddit}/search.json"
            params = {
                "q": search_query,
                "restrict_sr": "true",
                "sort": "top",
                "limit": 5,
                "t": "year"
            }

            res = requests.get(url, headers=HEADERS, params=params)
            if res.status_code != 200:
                continue

            posts = res.json().get("data", {}).get("children", [])
            for post in posts:
                post_data = post.get("data", {})
                permalink = post_data.get("permalink")

                if not permalink:
                    continue

                try:
                    post_id = permalink.split("/comments/")[1].split("/")[0]
                    submission = reddit.submission(id=post_id)
                    submission.comments.replace_more(limit=0)
                    top_comments = [comment.body for comment in submission.comments[:5]]

                    for comment_text in top_comments:
                        comments_collected.append({
                            "comment": comment_text,
                            "post_url": f"https://reddit.com{permalink}",
                            "score": TextBlob(comment_text).sentiment.polarity
                        })
                except Exception as e:
                    print(f"Error processing post: {e}")

        comments_collected.sort(key=lambda x: x["score"], reverse=True)

        # Save to DB under 'reddit_review'
        festival_collection.update_one(
            {"_id": ObjectId(festival_id)},
            {"$set": {"reddit_review": comments_collected}}  # 👈 use $set instead of $push
        )

        return JsonResponse({
            "message": "Reviews fetched and saved.",
            "reviews": comments_collected
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)
    
@csrf_exempt
def ai_travel_suggestions(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            destination = data.get("destination")
            from_city = data.get("from_city", "your location")
            travel_date = data.get("travel_date", "next month")
            return_date = data.get("return_date", "")
            budget = data.get("budget", "moderate")

            if not destination:
                return JsonResponse({"error": "Destination is required"}, status=400)

            prompt = f"""
            You're a travel assistant. Suggest budget-friendly flight and hotel options for the following trip:

            {{
              "from_city": "{from_city}",
              "destination": "{destination}",
              "travel_date": "{travel_date}",
              "return_date": "{return_date}",
              "budget": "{budget}"
            }}

            Please respond in the following JSON format:

            {{
              "flights": [
                {{
                  "airline": "Airline Name",
                  "price_range": "Approximate Price"
                }},
                {{
                  "airline": "Airline Name",
                  "price_range": "Approximate Price"
                }}
              ],
              "hotels": [
                {{
                  "hotel_name": "Hotel Name",
                  "price_range": "Approximate Price"
                }},
                {{
                  "hotel_name": "Hotel Name",
                  "price_range": "Approximate Price"
                }}
              ]
            }}

            List 2-3 airline options and 2-3 hotel names with approximate price ranges. Only return the JSON object as shown above, without any extra text or explanation.
            """

            def clean_ai_response(ai_response):
                # Remove code block markers and language labels (e.g., ```json)
                cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", ai_response.strip())
                cleaned = re.sub(r"\n?```$", "", cleaned)
                # Now parse the cleaned string as JSON
                return json.loads(cleaned)

            response = model.generate_content(prompt)
            result = clean_ai_response(response.text)

            return JsonResponse({"ai_response": result}, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Only POST method allowed"}, status=405)

@csrf_exempt
def get_all_festivals(request):
    if request.method != "GET":
        return JsonResponse({"error": "Only GET method is allowed."}, status=405)

    try:
        festivals_cursor = festival_collection.find()
        festivals = []
        for fest in festivals_cursor:
            fest_copy = copy.deepcopy(fest)
            fest_copy["_id"] = str(fest_copy.get("_id", ""))
            festivals.append({
                "_id": fest_copy.get("_id"),
                "title": fest_copy.get("title"),
                "location": fest_copy.get("location"),
                "tags": fest_copy.get("tags"),
                "content": fest_copy.get("content"),
                "reddit_url": fest_copy.get("reddit_url"),
                "upvotes": fest_copy.get("upvotes"),
                "month": fest_copy.get("month"),
                "vibe_score": fest_copy.get("vibe_score"),
                "fetched_at": fest_copy.get("fetched_at")
            })

        return JsonResponse({"festivals": festivals}, status=200)

    except PyMongoError as e:
        return JsonResponse({"error": f"MongoDB error: {str(e)}"}, status=500)
    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)
    
#===============================================================Voice Assistant===========================================================@csrf_exempt
@csrf_exempt
@api_view(["POST"])
def generate_voice_briefing(request):
    try:
        import base64

        data = json.loads(request.body)
        festival_id = data.get("_id")
        language = data.get("language", "en").lower()

        if not festival_id:
            return JsonResponse({"error": "_id is required"}, status=400)

        # Fetch festival from DB
        fest = festival_collection.find_one({"_id": ObjectId(festival_id)})
        if not fest:
            return JsonResponse({"error": "Festival not found"}, status=404)

        # ✅ Return cached voice data if available
        voice_data = fest.get("ai_voice_data", {})
        if language in voice_data and all(k in voice_data[language] for k in ["script", "blob"]):
            return JsonResponse({
                "script": voice_data[language]["script"],
                "audio_url": voice_data[language].get("url"),
                "audio_blob": voice_data[language]["blob"]
            })

        # 🎙️ Language to Voice ID mapping
        VOICE_MAP_BY_LANG = {
            "en": "EXAVITQu4vr4xnSDxMaL",             # Rachel
            "ta": "gCr8TeSJgJaeaIoV4RWH",              # Priya
            "hi": "1qEiC6qsybMkmnNdVMbK",              # Rahul
        }
        voice_id = VOICE_MAP_BY_LANG.get(language, VOICE_MAP_BY_LANG["en"])

        # 🧠 Compose AI prompt
        reviews = fest.get("reddit_review", [])[:3]
        review_summary = "\n".join(f"- {r['comment']}" for r in reviews)

        prompt = f"""
        You're an AI assistant. Write a 30-second voice briefing about this festival.

        Title: {fest['title']}
        Location: {fest['location']}
        Month: {fest['month']}
        Vibe Score: {fest.get('vibe_score', 'N/A')}
        Description: {fest.get('content', '')}
        Reviews:
        {review_summary}

        Keep it natural, spoken, and friendly.
        """

        # Generate script via Gemini
        response = model.generate_content(prompt)
        script_en = response.text.strip()

        # 🌍 Translate if necessary
        final_script = script_en
        if language != "en":
            translate_url = "https://translate.googleapis.com/translate_a/single"
            params = {
                "client": "gtx",
                "sl": "en",
                "tl": language,
                "dt": "t",
                "q": script_en,
            }
            res = requests.get(translate_url, params=params)
            translated = res.json()[0]
            final_script = "".join([line[0] for line in translated])

        # 🎧 ElevenLabs TTS
        eleven_api_key = "sk_ef9305110b34246545463b96bea287d63816fd6c78398d6d"
        tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": eleven_api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": final_script,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.7
            }
        }

        res = requests.post(tts_url, headers=headers, json=payload)
        if res.status_code != 200:
            return JsonResponse({"error": "Voice generation failed", "details": res.text}, status=500)

        # 💾 Save local mp3 (optional)
        filename = f"{festival_id}_{language}.mp3"
        audio_path = f"static/voices/{filename}"
        os.makedirs("static/voices", exist_ok=True)
        with open(audio_path, "wb") as f:
            f.write(res.content)

        # 🔐 Convert to base64
        audio_base64 = base64.b64encode(res.content).decode("utf-8")

        # 📦 Save in structured format
        festival_collection.update_one(
            {"_id": ObjectId(festival_id)},
            {"$set": {
                f"ai_voice_data.{language}": {
                    "script": final_script,
                    "url": f"/static/voices/{filename}",
                    "blob": audio_base64
                }
            }}
        )

        return JsonResponse({
            "script": final_script,
            "audio_url": f"/static/voices/{filename}",
            "audio_blob": audio_base64
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

#=============================================================== Video Model ===========================================================

@csrf_exempt
@api_view(["POST"])
def generate_ai_video(request):
    try:
        import base64

        data = json.loads(request.body)
        festival_id = data.get("_id")
        language = data.get("language", "en").lower()

        if not festival_id:
            return JsonResponse({"error": "_id is required"}, status=400)

        # Fetch festival from DB
        fest = festival_collection.find_one({"_id": ObjectId(festival_id)})
        if not fest:
            return JsonResponse({"error": "Festival not found"}, status=404)

        # ✅ Check if video already exists
        video_data = fest.get("ai_video_data", {})
        if language in video_data and "url" in video_data[language]:
            return JsonResponse({
                "video_url": video_data[language]["url"],
                "script": video_data[language].get("script", "")
            })

        # 🧠 Try to get voice script from ai_voice_data
        voice_data = fest.get("ai_voice_data", {})
        script = voice_data.get(language, {}).get("script")

        # Fallback: Generate script using Gemini
        if not script:
            reviews = fest.get("reddit_review", [])[:3]
            review_summary = "\n".join(f"- {r['comment']}" for r in reviews)
            prompt = f"""
            You're an AI assistant. Write a 30-second voice briefing about this festival.

            Title: {fest['title']}
            Location: {fest['location']}
            Month: {fest['month']}
            Vibe Score: {fest.get('vibe_score', 'N/A')}
            Description: {fest.get('content', '')}
            Reviews:
            {review_summary}

            Keep it natural, spoken, and friendly.
            """
            script = model.generate_content(prompt).text.strip()

        # 🎯 Call Tavus API
        TAVUS_API_KEY = "f41d88f2ca6d46cc812c0e0e106df7ca"
        TEMPLATE_ID = "r89d84ea6160"

        tavus_url = f"https://api.tavus.io/v1/templates/{TEMPLATE_ID}/videos"
        headers = {
            "x-api-key": TAVUS_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "video": {
                "title": f"{fest['title']} AI Concierge",
                "input_text": script
            }
        }

        # res = requests.post(tavus_url, headers=headers, json=payload)
        # if res.status_code != 200:
        #     return JsonResponse({"error": "Tavus video generation failed", "details": res.text}, status=500)

        # tavus_data = res.json()
        # video_url = tavus_data.get("video_url") or tavus_data.get("url") or "PENDING"

        # ⚠️ MOCK MODE ENABLED — Tavus API temporarily skipped
        video_url = "https://dl2.hotshare.click/Eleven_2025_Original_360p_HD.mp4"  # Placeholder public video

        print("⚠️ Mock video used — Tavus API was not called due to network/access issue.")

        # Save in MongoDB
        festival_collection.update_one(
            {"_id": ObjectId(festival_id)},
            {"$set": {
                f"ai_video_data.{language}": {
                    "url": video_url,
                    "script": script
                }
            }}
        )

        return JsonResponse({
            "video_url": video_url,
            "script": script
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

#=============================================================== Users ===========================================================

@csrf_exempt
@api_view(["POST"])
def payment_success(request):
    try:
        data = json.loads(request.body)
        email = data.get("email")
        plan = data.get("plan")  # "monthly" or "yearly"

        if not email or not plan:
            return JsonResponse({"error": "Missing email or plan"}, status=400)

        user_collection = db["users"]
        now = datetime.utcnow()

        if plan == "monthly":
            expire_time = now.replace(microsecond=0) + timedelta(days=30)
            update_fields = {"is_pro": True, "expire_time": expire_time}
        elif plan == "yearly":
            expire_time = now.replace(microsecond=0) + timedelta(days=365)
            update_fields = {"is_plus": True, "expire_time": expire_time}
        else:
            return JsonResponse({"error": "Invalid plan"}, status=400)

        user_collection.update_one(
            {"email": email},
            {"$set": update_fields},
            upsert=True
        )

        return JsonResponse({"message": "Subscription updated."}, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
