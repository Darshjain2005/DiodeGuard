import os
import re

frontend_dir = r"d:\projects\DiodeGuard\frontend\src"

python_regexes = [
    re.compile(r"'http://localhost:8000'"),
    re.compile(r"`http://localhost:8000")
]

node_regexes = [
    re.compile(r"'http://127\.0\.0\.1:5000'"),
    re.compile(r"`http://127\.0\.0\.1:5000"),
    re.compile(r"'http://localhost:5000'"),
    re.compile(r"`http://localhost:5000")
]

files_updated = 0

for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(".jsx") or file.endswith(".js"):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Replace Python API URLs
            content = content.replace("'http://localhost:8000'", "(import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000')")
            content = content.replace("`http://localhost:8000", "`${import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000'}")
            
            # Replace Node Gateway URLs
            content = content.replace("'http://127.0.0.1:5000'", "(import.meta.env.VITE_NODE_GATEWAY_URL || 'http://127.0.0.1:5000')")
            content = content.replace("`http://127.0.0.1:5000", "`${import.meta.env.VITE_NODE_GATEWAY_URL || 'http://127.0.0.1:5000'}")
            
            content = content.replace("'http://localhost:5000'", "(import.meta.env.VITE_NODE_GATEWAY_URL || 'http://localhost:5000')")
            content = content.replace("`http://localhost:5000", "`${import.meta.env.VITE_NODE_GATEWAY_URL || 'http://localhost:5000'}")
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated: {filepath}")
                files_updated += 1

print(f"Total files updated: {files_updated}")
