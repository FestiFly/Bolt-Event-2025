import requests

url = "https://api.heygen.com/v1/video_status.get"

params = {
    "video_id": "be5a1e956f2646329ebeb34c5f6801fe"
}

headers = {
    "accept": "application/json",
    "x-api-key": "NWM0NzA2YTgxY2Q3NDgwM2JkYjIzZDBkMGYyNjk0NjgtMTc1MDkyMDY1OA=="
}

response = requests.get(url, headers=headers, params=params)

print(response.text)
