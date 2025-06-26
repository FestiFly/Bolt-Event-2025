import requests

url = "https://api.heygen.com/v2/video/generate"

payload = {
    "video_inputs": [
        {
            "avatar_id": "Adriana_Business_Front_2_public",
            "voice": {
                "type": "text",
                "voice_id": "9ff7fd2dd9114c3bae005e62aa485e52",  # Replace with a valid voice ID if needed
                "input_text": "Hello, this is a test from Heygen!"
            },
            "style": "TalkingHead"
        }
    ],
    "caption": False,
    "dimension": {
        "width": 1280,
        "height": 720
    }
}

headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "x-api-key": "NWM0NzA2YTgxY2Q3NDgwM2JkYjIzZDBkMGYyNjk0NjgtMTc1MDkyMDY1OA=="
}

response = requests.post(url, json=payload, headers=headers)

print(response.text)
