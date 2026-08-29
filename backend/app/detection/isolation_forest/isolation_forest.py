"""
Isolation Forest Anomaly Detection

Unsupervised machine learning model to detect abnormal network flows 
that don't match known patterns (zero-day anomalies).
"""

from sklearn.ensemble import IsolationForest
import pandas as pd
import numpy as np
import pickle
import os

class AnomalyDetector:
    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        """
        contamination: The expected proportion of outliers (anomalies) in the data.
        """
        self.model = IsolationForest(
            n_estimators=100, 
            contamination=contamination, 
            random_state=random_state,
            n_jobs=-1
        )
        self.is_trained = False
        self.feature_cols = None

    def _prepare_features(self, df: pd.DataFrame) -> np.ndarray:
        """Extracts and cleans features for the Isolation Forest."""
        # Drop label columns if they exist
        drop_cols = ["Label", "BinaryLabel"]
        
        if self.feature_cols is None:
            self.feature_cols = [c for c in df.columns if c.strip() not in [dc.strip() for dc in drop_cols]]
        
        X = df[self.feature_cols].copy()
        
        # Fill NaNs and replace infinities
        X.replace([np.inf, -np.inf], np.nan, inplace=True)
        X.fillna(0, inplace=True)
        
        return X.values.astype(np.float32)

    def train(self, df: pd.DataFrame):
        """Trains the Isolation Forest on the provided dataset."""
        print(f"Training Isolation Forest on {len(df)} flows...")
        X = self._prepare_features(df)
        self.model.fit(X)
        self.is_trained = True
        print("Training complete.")

    def predict(self, df: pd.DataFrame) -> pd.Series:
        """
        Predicts anomalies.
        Returns a boolean Series: True for anomaly, False for normal.
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before calling predict().")
            
        print(f"Predicting anomalies for {len(df)} flows...")
        X = self._prepare_features(df)
        
        # IsolationForest returns -1 for outliers and 1 for inliers.
        preds = self.model.predict(X)
        
        # Convert to boolean (True = Anomaly)
        is_anomaly = (preds == -1)
        return pd.Series(is_anomaly)
        
    def save(self, filepath: str):
        """Saves the trained model to disk."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump({'model': self.model, 'features': self.feature_cols}, f)
            
    def load(self, filepath: str):
        """Loads a trained model from disk."""
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
            self.model = data['model']
            self.feature_cols = data['features']
            self.is_trained = True
