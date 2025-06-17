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
from pymongo.errors import PyMongoError# Assume we cleanly separate it

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
