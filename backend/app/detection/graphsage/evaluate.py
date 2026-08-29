"""
Evaluation & Visualisation for the GraphSAGE Zero-Day Detector.

Produces: classification report, confusion matrix, ROC curve,
training curves, and summary metrics.
"""

import os

import matplotlib
matplotlib.use("Agg")                       # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

import config


# ─────────────────────── Metric helpers ───────────────────────

def compute_metrics(model, data):
    """Compute all evaluation metrics on the test set.

    Returns
    -------
    metrics : dict   (accuracy, precision, recall, f1, roc_auc)
    y_true  : array
    y_pred  : array
    y_prob  : array  (probability of class 1)
    """
    model.eval()
    with torch.no_grad():
        logits = model(data.x, data.edge_index)
        probs = torch.softmax(logits, dim=1)

    y_true = data.y[data.test_mask].numpy()
    y_pred = logits[data.test_mask].argmax(dim=1).numpy()
    y_prob = probs[data.test_mask][:, 1].numpy()

    metrics = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_true, y_prob),
    }

    return metrics, y_true, y_pred, y_prob


# ─────────────────────── Plot helpers ─────────────────────────

def plot_confusion_matrix(y_true, y_pred, save_path):
    """Heatmap of the confusion matrix."""
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt=",d",
        cmap="Blues",
        xticklabels=["BENIGN", "Attack"],
        yticklabels=["BENIGN", "Attack"],
        linewidths=0.5,
        linecolor="grey",
    )
    plt.title("Confusion Matrix — GraphSAGE Zero-Day Detector", fontsize=14, fontweight="bold")
    plt.xlabel("Predicted Label", fontsize=12)
    plt.ylabel("True Label", fontsize=12)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"  Saved: {save_path}")


def plot_roc_curve(y_true, y_prob, roc_auc, save_path):
    """ROC Curve with AUC score."""
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, color="#2563eb", lw=2, label=f"GraphSAGE (AUC = {roc_auc:.4f})")
    plt.plot([0, 1], [0, 1], color="grey", lw=1, linestyle="--", label="Random Classifier")
    plt.fill_between(fpr, tpr, alpha=0.1, color="#2563eb")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate", fontsize=12)
    plt.ylabel("True Positive Rate", fontsize=12)
    plt.title("ROC Curve - GraphSAGE Zero-Day Detector", fontsize=14, fontweight="bold")
    plt.legend(loc="lower right", fontsize=11)
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"  Saved: {save_path}")


def plot_training_curves(history, save_path):
    """Loss and accuracy curves over training epochs."""
    epochs = range(1, len(history["train_loss"]) + 1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # Loss
    ax1.plot(epochs, history["train_loss"], label="Train Loss", color="#2563eb", lw=2)
    ax1.plot(epochs, history["val_loss"], label="Val Loss", color="#dc2626", lw=2)
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.set_title("Training & Validation Loss", fontweight="bold")
    ax1.legend()
    ax1.grid(alpha=0.3)

    # Accuracy
    ax2.plot(epochs, history["train_acc"], label="Train Acc", color="#2563eb", lw=2)
    ax2.plot(epochs, history["val_acc"], label="Val Acc", color="#dc2626", lw=2)
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Accuracy")
    ax2.set_title("Training & Validation Accuracy", fontweight="bold")
    ax2.legend()
    ax2.grid(alpha=0.3)

    fig.suptitle("GraphSAGE Training Curves", fontsize=15, fontweight="bold", y=1.02)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Saved: {save_path}")


# ----------------------- Main evaluate ------------------------

def evaluate_model(model, data, history):
    """Full evaluation pipeline: metrics -> report -> plots.

    Parameters
    ----------
    model   : trained GraphSAGEDetector
    data    : torch_geometric.data.Data (with test_mask)
    history : dict from train_model
    """
    print("\n" + "=" * 60)
    print("       EVALUATION")
    print("=" * 60)

    metrics, y_true, y_pred, y_prob = compute_metrics(model, data)

    # -- Print metrics --
    print("\n  +-------------------+-------------------+")
    print("  |     GraphSAGE -- Test Metrics        |")
    print("  +-------------------+-------------------+")
    print(f"  | Accuracy          | {metrics['accuracy']:.4f}            |")
    print(f"  | Precision         | {metrics['precision']:.4f}            |")
    print(f"  | Recall            | {metrics['recall']:.4f}            |")
    print(f"  | F1 Score          | {metrics['f1']:.4f}            |")
    print(f"  | ROC-AUC           | {metrics['roc_auc']:.4f}            |")
    print("  +-------------------+-------------------+")

    # -- Classification report --
    print("\n  Classification Report:")
    print("  " + "-" * 55)
    report = classification_report(
        y_true, y_pred,
        target_names=["BENIGN", "Attack"],
        digits=4,
    )
    for line in report.split("\n"):
        print(f"  {line}")

    # -- Save plots --
    print("\n  Generating plots ...")
    plot_confusion_matrix(
        y_true, y_pred,
        os.path.join(config.RESULTS_DIR, "confusion_matrix.png"),
    )
    plot_roc_curve(
        y_true, y_prob, metrics["roc_auc"],
        os.path.join(config.RESULTS_DIR, "roc_curve.png"),
    )
    plot_training_curves(
        history,
        os.path.join(config.RESULTS_DIR, "training_curves.png"),
    )

    # -- Save metrics to text file --
    metrics_path = os.path.join(config.RESULTS_DIR, "metrics_summary.txt")
    with open(metrics_path, "w") as f:
        f.write("GraphSAGE Zero-Day Detector -- Test Results\n")
        f.write("=" * 50 + "\n\n")
        for k, v in metrics.items():
            f.write(f"{k:>12s}: {v:.6f}\n")
        f.write("\n" + "=" * 50 + "\n")
        f.write("\nClassification Report:\n")
        f.write(report)
    print(f"  Saved: {metrics_path}")

    print("\n  Evaluation complete [OK]")
    print("=" * 60)

    return metrics


if __name__ == "__main__":
    from data_preprocessing import preprocess
    from graph_construction import create_graph_data
    from train import train_model

    X_train, X_test, y_train, y_test, _ = preprocess()
    data = create_graph_data(X_train, X_test, y_train, y_test)
    model, history = train_model(data)
    evaluate_model(model, data, history)
