"""
Training loop for the GraphSAGE Zero-Day Detector.

Includes class-weighted cross-entropy, early stopping, and checkpoint saving.
"""

import numpy as np
import torch
import torch.nn.functional as F

import config
from model import GraphSAGEDetector


def compute_class_weights(y, mask):
    """Compute inverse-frequency class weights for the training set."""
    labels = y[mask].numpy()
    counts = np.bincount(labels, minlength=config.NUM_CLASSES)
    total = counts.sum()
    weights = total / (config.NUM_CLASSES * counts.astype(np.float64))
    return torch.tensor(weights, dtype=torch.float)


def train_model(data):
    """Train the GraphSAGE model.

    Parameters
    ----------
    data : torch_geometric.data.Data  (with train_mask, test_mask)

    Returns
    -------
    model       : trained GraphSAGEDetector
    history     : dict with 'train_loss', 'train_acc', 'val_loss', 'val_acc'
    """
    print("\n" + "=" * 60)
    print("       TRAINING GraphSAGE")
    print("=" * 60)

    in_channels = data.num_node_features
    model = GraphSAGEDetector(in_channels=in_channels)
    print(f"  Model parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Class weights to handle imbalance
    class_weights = compute_class_weights(data.y, data.train_mask)
    print(f"  Class weights: {class_weights.tolist()}")

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=config.LEARNING_RATE,
        weight_decay=config.WEIGHT_DECAY,
    )

    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
    }

    best_val_loss = float("inf")
    patience_counter = 0

    for epoch in range(1, config.EPOCHS + 1):
        # ── Train ──
        model.train()
        optimizer.zero_grad()

        out = model(data.x, data.edge_index)
        loss = F.cross_entropy(
            out[data.train_mask],
            data.y[data.train_mask],
            weight=class_weights,
        )
        loss.backward()
        optimizer.step()

        # ── Evaluate ──
        model.eval()
        with torch.no_grad():
            logits = model(data.x, data.edge_index)

            # Train metrics
            train_pred = logits[data.train_mask].argmax(dim=1)
            train_acc = (train_pred == data.y[data.train_mask]).float().mean().item()
            train_loss = loss.item()

            # Validation (test set) metrics
            val_loss = F.cross_entropy(
                logits[data.test_mask],
                data.y[data.test_mask],
                weight=class_weights,
            ).item()
            val_pred = logits[data.test_mask].argmax(dim=1)
            val_acc = (val_pred == data.y[data.test_mask]).float().mean().item()

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        # -- Logging --
        if epoch % config.PRINT_EVERY == 0 or epoch == 1:
            print(
                f"  Epoch {epoch:3d}/{config.EPOCHS}  |  "
                f"Train Loss: {train_loss:.4f}  Acc: {train_acc:.4f}  |  "
                f"Val Loss: {val_loss:.4f}  Acc: {val_acc:.4f}"
            )

        # -- Early Stopping --
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            torch.save(model.state_dict(), config.MODEL_SAVE_PATH)
        else:
            patience_counter += 1

        if patience_counter >= config.EARLY_STOPPING_PATIENCE:
            print(f"\n  [!] Early stopping at epoch {epoch} (patience={config.EARLY_STOPPING_PATIENCE})")
            break

    # Load best model
    model.load_state_dict(torch.load(config.MODEL_SAVE_PATH, weights_only=True))
    print(f"\n  Best model saved to: {config.MODEL_SAVE_PATH}")
    print(f"  Best validation loss: {best_val_loss:.4f}")
    print("  Training complete [OK]")
    print("=" * 60)

    return model, history


if __name__ == "__main__":
    from data_preprocessing import preprocess
    from graph_construction import create_graph_data

    X_train, X_test, y_train, y_test, _ = preprocess()
    data = create_graph_data(X_train, X_test, y_train, y_test)
    model, history = train_model(data)
