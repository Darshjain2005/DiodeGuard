"""Zero-Day Attack Detection -- Main Pipeline

End-to-end: preprocess -> build graph -> train GraphSAGE -> evaluate.

Usage
-----
    python zero_day_module/main.py
"""

import sys
import os
import io
import time

# Force UTF-8 output on Windows to avoid cp1252 encoding errors
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure the module directory is on the path so relative imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_preprocessing import preprocess
from graph_construction import create_graph_data
from train import train_model
from evaluate import evaluate_model


def main():
    start = time.time()

    print("-" * 60)
    print("   SENTINELX -- Zero-Day Attack Detection (GraphSAGE)")
    print("-" * 60 + "\n")

    # Step 1: Preprocess
    X_train, X_test, y_train, y_test, feature_names = preprocess()

    # Step 2: Build graph
    data = create_graph_data(X_train, X_test, y_train, y_test)

    # Step 3: Train
    model, history = train_model(data)

    # Step 4: Evaluate
    metrics = evaluate_model(model, data, history)

    elapsed = time.time() - start
    print(f"\n>> Total time: {elapsed / 60:.1f} minutes")
    print("\n[DONE] Pipeline complete. Results saved to: zero_day_module/results/")


if __name__ == "__main__":
    main()
