FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if required for C extensions / network tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpcap-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ ./app/

EXPOSE 8000

CMD ["python", "app/main.py"]
