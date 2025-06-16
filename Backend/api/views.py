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

# --- Replace with your keys ---
openai.api_key = "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"
reddit = praw.Reddit(
    client_id="YOUR_REDDIT_ID",
    client_secret="YOUR_REDDIT_SECRET",
    user_agent="festifly-agent"
)

@api_view(['POST'])
def festival_vibe(request):
    subreddit = request.data.get("subreddit")
    comments = []
    for submission in reddit.subreddit(subreddit).hot(limit=5):
        submission.comments.replace_more(limit=0)
        for comment in submission.comments[:10]:
            comments.append(comment.body)
    
    vibe_score = sum(TextBlob(c).sentiment.polarity for c in comments) / len(comments)
    return JsonResponse({"vibe": vibe_score})

@api_view(['POST'])
def organizer_create(request):
    data = request.data
    # Here you can save to a DB or just echo back
    return JsonResponse({"status": "success", "data": data})

@api_view(['GET'])
def festival_details(request):
    # Dummy map or logistics logic
    return JsonResponse({
        "map_link": "https://maps.google.com/?q=location",
        "calendar_link": "https://calendar.google.com",
        "suggested_hotels": ["Hotel A", "Hotel B"]
    })

# You can expand this to include more subreddits
RELEVANT_SUBREDDITS = ["Festivals", "IndiaTravel", "travel", "backpacking", "festival_culture"]

# You can use your Reddit API credentials here
HEADERS = {"User-Agent": "FestiflyBot/0.1"}

def fetch_reddit_festivals(location, interests, month):
    search_query = f"{location} {month} {' '.join(interests)} festival"
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

                # Defensive check
                title = data.get("title")
                permalink = data.get("permalink")
                score = data.get("score", 0)

                if title and permalink:
                    results.append({
                        "title": title,
                        "location": location,
                        "tags": interests,
                        "reddit_url": f"https://reddit.com{permalink}",
                        "upvotes": score,
                        "month": month,
                        "vibe_score": None,
                        "fetched_at": datetime.utcnow()
                    })

    return results

# Connect to MongoDB
client = MongoClient('mongodb+srv://ihub:akash@ihub.fel24ru.mongodb.net/')
db = client['festifly']
festival_collection = db['festivals']

@csrf_exempt
def get_recommendations(request):
    if request.method == "POST":
        try:
            # Parse request body
            data = json.loads(request.body)
            location = data.get("location")
            interests = data.get("interests", [])
            month = data.get("month")

            # Validate required fields
            if not location or not month:
                return JsonResponse({"error": "Both 'location' and 'month' are required."}, status=400)

            # Fetch festivals from Reddit
            fetched_festivals = fetch_reddit_festivals(location, interests, month)

            # Insert into MongoDB (does add _id, but we won't return it)
            if fetched_festivals:
                festival_collection.insert_many(fetched_festivals)

            # Return the original (ObjectId-free) data
            return JsonResponse({"festivals": fetched_festivals}, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Only POST method is allowed."}, status=405)

