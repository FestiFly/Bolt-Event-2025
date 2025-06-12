from django.http import JsonResponse
from rest_framework.decorators import api_view
import openai, praw, requests
from textblob import TextBlob
import os

# --- Replace with your keys ---
openai.api_key = "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"
reddit = praw.Reddit(
    client_id="YOUR_REDDIT_ID",
    client_secret="YOUR_REDDIT_SECRET",
    user_agent="festifly-agent"
)

@api_view(['POST'])
def recommend_festivals(request):
    data = request.data
    prompt = f"What are the best cultural festivals near {data['location']} in {data['month']}?"
    
    completion = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    
    response = completion.choices[0].message.content
    return JsonResponse({"recommendations": response})

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
