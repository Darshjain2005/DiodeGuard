"""
Graph Construction for GraphSAGE.

Builds a k-NN graph from the feature matrix so that each network
flow becomes a node and edges connect flows with similar features.
"""

import numpy as np
import torch
from sklearn.neighbors import NearestNeighbors
from torch_geometric.data import Data

import config


def build_knn_graph(X: np.ndarray,
                    y: np.ndarray,
                    k: int = config.K_NEIGHBORS) -> Data:
    """Create a PyTorch Geometric Data object from features + labels.

    Parameters
    ----------
    X : (N, F) feature matrix (already scaled)
    y : (N,)   label array
    k : int    number of nearest neighbours

    Returns
    -------
    torch_geometric.data.Data with x, edge_index, y
    """
    print(f"  Building {k}-NN graph for {X.shape[0]:,} nodes …")

    # Fit k-NN
    nn = NearestNeighbors(n_neighbors=k, algorithm="auto", n_jobs=-1)
    nn.fit(X)
    distances, indices = nn.kneighbors(X)

    # Build edge list (undirected: add both directions)
    src, dst = [], []
    for node_idx in range(X.shape[0]):
        for neighbour_idx in indices[node_idx]:
            if node_idx != neighbour_idx:  # skip self-loops
                src.append(node_idx)
                dst.append(neighbour_idx)
                src.append(neighbour_idx)
                dst.append(node_idx)

    edge_index = torch.tensor([src, dst], dtype=torch.long)

    # Remove duplicate edges
    edge_index = torch.unique(edge_index, dim=1)

    # Node features & labels
    x = torch.tensor(X, dtype=torch.float)
    y_tensor = torch.tensor(y, dtype=torch.long)

    data = Data(x=x, edge_index=edge_index, y=y_tensor)
    print(f"  Graph: {data.num_nodes:,} nodes, {data.num_edges:,} edges")

    return data


def create_graph_data(X_train, X_test, y_train, y_test):
    """Build graphs and attach train/test masks.

    We construct a single combined graph so that test nodes can benefit
    from message-passing with training neighbours (transductive setting).

    Returns
    -------
    data : torch_geometric.data.Data with train_mask, test_mask
    """
    print("\n" + "=" * 60)
    print("       GRAPH CONSTRUCTION")
    print("=" * 60)

    # Combine train + test into a single graph
    X_all = np.vstack([X_train, X_test])
    y_all = np.concatenate([y_train, y_test])

    data = build_knn_graph(X_all, y_all)

    # Create masks
    n_train = X_train.shape[0]
    n_total = X_all.shape[0]

    train_mask = torch.zeros(n_total, dtype=torch.bool)
    test_mask = torch.zeros(n_total, dtype=torch.bool)
    train_mask[:n_train] = True
    test_mask[n_train:] = True

    data.train_mask = train_mask
    data.test_mask = test_mask

    print(f"  Train nodes: {train_mask.sum().item():,}")
    print(f"  Test  nodes: {test_mask.sum().item():,}")
    print("  Graph construction complete [OK]")
    print("=" * 60)

    return data


if __name__ == "__main__":
    from data_preprocessing import preprocess
    X_train, X_test, y_train, y_test, _ = preprocess()
    data = create_graph_data(X_train, X_test, y_train, y_test)
    print(data)
