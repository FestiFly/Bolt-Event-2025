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
