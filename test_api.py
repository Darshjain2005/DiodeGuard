import requests

try:
    res = requests.get('http://127.0.0.1:8000/health')
    print("Health Status:", res.status_code)
    print(res.text)
except Exception as e:
    print("Error connecting:", e)
