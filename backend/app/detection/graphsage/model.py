"""
GraphSAGE Model for Zero-Day Attack Detection.

Two-layer GraphSAGE with dropout and a linear classification head.
"""

import torch
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv

import config


class GraphSAGEDetector(torch.nn.Module):
    """Two-layer GraphSAGE network for binary classification.

    Architecture
    ------------
    SAGEConv(input → hidden_1) → ReLU → Dropout
    SAGEConv(hidden_1 → hidden_2) → ReLU → Dropout
    Linear(hidden_2 → num_classes)
    """

    def __init__(self,
                 in_channels: int,
                 hidden_1: int = config.HIDDEN_DIM_1,
                 hidden_2: int = config.HIDDEN_DIM_2,
                 out_channels: int = config.NUM_CLASSES,
                 dropout: float = config.DROPOUT):
        super().__init__()

        self.conv1 = SAGEConv(in_channels, hidden_1)
        self.conv2 = SAGEConv(hidden_1, hidden_2)
        self.classifier = torch.nn.Linear(hidden_2, out_channels)
        self.dropout = dropout

    def forward(self, x, edge_index):
        # Layer 1
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # Layer 2
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # Classifier
        x = self.classifier(x)
        return x

    def get_embeddings(self, x, edge_index):
        """Return node embeddings from the penultimate layer (useful for viz)."""
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        return x
