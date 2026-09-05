import os, re

frontend_dir = r"d:\projects\DiodeGuard\frontend\src"
files_updated = []

for root, _, files in os.walk(frontend_dir):
    for file in files:
        if not (file.endswith(".jsx") or file.endswith(".js")):
            continue
        filepath = os.path.join(root, file)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        original = content

        # Pattern 1: fetch('http://localhost:8000/...')  ->  fetch(`${PYTHON_API}/...`)
        content = re.sub(
            r"fetch\('http://localhost:8000(/[^']*?)'\s*\)",
            r"fetch(`${import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000'}\1`)",
            content
        )
        # Pattern 2: fetch('http://127.0.0.1:5000/...')  ->  fetch(`${NODE_GW}/...`)
        content = re.sub(
            r"fetch\('http://127\.0\.0\.1:5000(/[^']*?)'\s*\)",
            r"fetch(`${import.meta.env.VITE_NODE_GATEWAY_URL || 'http://127.0.0.1:5000'}\1`)",
            content
        )
        # Pattern 3: fetch('http://localhost:5000/...')  ->  fetch(`${NODE_GW}/...`)
        content = re.sub(
            r"fetch\('http://localhost:5000(/[^']*?)'",
            r"fetch(`${import.meta.env.VITE_NODE_GATEWAY_URL || 'http://localhost:5000'}\1`",
            content
        )
        # Pattern 4: axios.get('http://localhost:8000/...')
        content = re.sub(
            r"axios\.(get|post)\('http://localhost:8000(/[^']*?)'",
            r"axios.\1(`${import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000'}\2`",
            content
        )
        # Pattern 5: axios.get('http://127.0.0.1:5000/...')
        content = re.sub(
            r"axios\.(get|post)\('http://127\.0\.0\.1:5000(/[^']*?)'",
            r"axios.\1(`${import.meta.env.VITE_NODE_GATEWAY_URL || 'http://127.0.0.1:5000'}\2`",
            content
        )

        if content != original:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            files_updated.append(file)
            print(f"Fixed: {file}")

print(f"\nTotal files fixed: {len(files_updated)}")
