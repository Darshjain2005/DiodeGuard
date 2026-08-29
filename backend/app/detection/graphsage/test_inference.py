"""
Test Inference Script for Zero-Day Attack Detection

This script demonstrates how to load the trained GraphSAGE model
and use it to predict whether new network traffic flows are BENIGN or Attacks.
"""

import os
import torch
import numpy as np
import pandas as pd

# Import from our module
from config import MODEL_SAVE_PATH
from model import GraphSAGEDetector
from data_preprocessing import load_and_clean, encode_labels_binary, scale_and_split
from graph_construction import build_knn_graph

def test_model():
    print("Loading data for a quick test...")
    # Load a tiny sample of 20 random rows from the dataset just for testing
    df = load_and_clean()
    df = encode_labels_binary(df)
    
    # Take 20 random samples
    df_sample = df.sample(n=20, random_state=42).reset_index(drop=True)
    
    # We need to scale the features. 
    # In a real production system, you would save the StandardScaler from training
    # and load it here. For this quick test, we'll just scale this batch.
    drop_cols = ["Label", "BinaryLabel"]
    feature_cols = [c for c in df_sample.columns if c not in drop_cols]
    
    X = df_sample[feature_cols].values.astype(np.float32)
    y_true = df_sample["BinaryLabel"].values.astype(np.int64)
    original_labels = df_sample["Label"].values
    
    # Scale features
    X = (X - np.mean(X, axis=0)) / (np.std(X, axis=0) + 1e-8)
    
    print("\nBuilding graph for the test batch...")
    # Build a graph just for these 20 nodes
    data = build_knn_graph(X, y_true, k=3)
    
    print(f"\nLoading trained model from {MODEL_SAVE_PATH}...")
    model = GraphSAGEDetector(in_channels=data.num_node_features)
    
    if not os.path.exists(MODEL_SAVE_PATH):
        print(f"Error: Model not found at {MODEL_SAVE_PATH}")
        return
        
    model.load_state_dict(torch.load(MODEL_SAVE_PATH, map_location=torch.device('cpu'), weights_only=True))
    model.eval()
    
    print("\nRunning inference...")
    with torch.no_grad():
        logits = model(data.x, data.edge_index)
        probs = torch.softmax(logits, dim=1)
        predictions = logits.argmax(dim=1).numpy()
        confidence = probs.numpy()
        
    print("\n" + "="*70)
    print(f"{'Row':<5} | {'Original Label':<20} | {'True (Binary)':<15} | {'Predicted':<10} | {'Confidence':<10}")
    print("-" * 70)
    
    class_names = {0: "BENIGN", 1: "Attack"}
    
    correct = 0
    for i in range(len(predictions)):
        pred_class = class_names[predictions[i]]
        true_class = class_names[y_true[i]]
        conf_score = confidence[i][predictions[i]] * 100
        
        is_match = "[OK]" if predictions[i] == y_true[i] else "[FAIL]"
        if predictions[i] == y_true[i]:
            correct += 1
            
        print(f"{i:<5} | {original_labels[i]:<20} | {true_class:<15} | {pred_class:<10} | {conf_score:.1f}% {is_match}")
        
    print("=" * 70)
    print(f"Test Accuracy on this batch: {correct}/{len(predictions)} ({(correct/len(predictions))*100:.1f}%)")

if __name__ == "__main__":
    test_model()
