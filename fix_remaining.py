import os

fixes = {
    r"d:\projects\DiodeGuard\frontend\src\pages\LoginPage.jsx": [
        ("fetch('http://127.0.0.1:5000/api/auth/send-otp',", "fetch(`${import.meta.env.VITE_NODE_GATEWAY_URL || 'http://127.0.0.1:5000'}/api/auth/send-otp`,"),
        ("fetch('http://127.0.0.1:5000/api/auth/verify-otp',", "fetch(`${import.meta.env.VITE_NODE_GATEWAY_URL || 'http://127.0.0.1:5000'}/api/auth/verify-otp`,"),
    ],
    r"d:\projects\DiodeGuard\frontend\src\pages\PhishingDetector.jsx": [
        ("fetch('http://127.0.0.1:5000/api/phish/analyze',", "fetch(`${import.meta.env.VITE_NODE_GATEWAY_URL || 'http://127.0.0.1:5000'}/api/phish/analyze`,"),
    ],
}

for filepath, replacements in fixes.items():
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Fixed: {os.path.basename(filepath)}")
