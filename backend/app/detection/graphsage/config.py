"""
Configuration for the Zero-Day Attack Detection Module (GraphSAGE).
All hyperparameters, file paths, and settings are centralised here.
"""

import os

# ──────────────────────────── Paths ────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
DATASET_PATH = os.path.join(PROJECT_DIR, "dataset", "combinenew.csv")
RESULTS_DIR = os.path.join(BASE_DIR, "results")
MODEL_SAVE_PATH = os.path.join(RESULTS_DIR, "best_graphsage_model.pth")

# Create results directory if it doesn't exist
os.makedirs(RESULTS_DIR, exist_ok=True)

# ──────────────────────────── Data ─────────────────────────────
SAMPLE_SIZE = 100_000          # Stratified sample from the full dataset
TEST_SIZE = 0.20               # 80/20 train-test split
RANDOM_SEED = 42
LABEL_COLUMN = " Label"        # Note: leading space in original CSV

# ──────────────────────────── Graph ────────────────────────────
K_NEIGHBORS = 5                # k for the k-NN graph construction

# ──────────────────────────── Model ────────────────────────────
HIDDEN_DIM_1 = 128             # First GraphSAGE hidden layer
HIDDEN_DIM_2 = 64              # Second GraphSAGE hidden layer
NUM_CLASSES = 2                # Binary: BENIGN (0) vs Attack (1)
DROPOUT = 0.3

# ──────────────────────────── Training ─────────────────────────
LEARNING_RATE = 0.005
WEIGHT_DECAY = 5e-4
EPOCHS = 100
EARLY_STOPPING_PATIENCE = 15   # Stop if val loss doesn't improve for N epochs

# ──────────────────────────── Display ──────────────────────────
PRINT_EVERY = 5                # Print metrics every N epochs
