"""
Data Preprocessing for Zero-Day Attack Detection.

Handles: loading, cleaning, encoding, scaling, sampling, and splitting
the CIC-IDS2017 dataset for GraphSAGE-based binary classification.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

import config


def load_and_clean(path: str = config.DATASET_PATH) -> pd.DataFrame:
    """Load CSV, clean column names, remove bad values."""
    print("[1/5] Loading dataset ...")
    df = pd.read_csv(path, low_memory=False)

    # Strip whitespace from column names
    df.columns = df.columns.str.strip()

    # Strip whitespace from the label column values
    df["Label"] = df["Label"].astype(str).str.strip()

    print(f"      Loaded {df.shape[0]:,} rows x {df.shape[1]} columns")

    # Replace infinities with NaN, then drop rows with NaN
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    before = len(df)
    df.dropna(inplace=True)
    after = len(df)
    if before - after > 0:
        print(f"      Dropped {before - after:,} rows containing NaN / Inf")

    return df


def encode_labels_binary(df: pd.DataFrame) -> pd.DataFrame:
    """Convert multi-class labels to binary: BENIGN=0, Attack=1."""
    print("[2/5] Encoding labels (binary: BENIGN vs Attack) ...")
    df["BinaryLabel"] = (df["Label"] != "BENIGN").astype(int)

    benign = (df["BinaryLabel"] == 0).sum()
    attack = (df["BinaryLabel"] == 1).sum()
    print(f"      BENIGN: {benign:,}  |  Attack: {attack:,}")

    return df


def stratified_sample(df: pd.DataFrame,
                      n: int = config.SAMPLE_SIZE,
                      seed: int = config.RANDOM_SEED) -> pd.DataFrame:
    """Take a stratified sample to keep training feasible on CPU."""
    print(f"[3/5] Stratified sampling -> {n:,} rows ...")

    # If dataset is smaller than sample size, just use all
    if len(df) <= n:
        print("      Dataset smaller than sample size - using full dataset")
        return df

    df_sampled = df.groupby("BinaryLabel", group_keys=False).apply(
        lambda x: x.sample(
            n=max(1, int(n * len(x) / len(df))),
            random_state=seed,
        ),
        include_groups=True,
    )
    df_sampled = df_sampled.reset_index(drop=True)
    print(f"      Sampled: {len(df_sampled):,} rows")
    print(f"      Class distribution:\n{df_sampled['BinaryLabel'].value_counts().to_string()}")

    return df_sampled


def scale_and_split(df: pd.DataFrame):
    """Standard-scale features and perform train/test split.

    Returns
    -------
    X_train, X_test : np.ndarray   - scaled feature matrices
    y_train, y_test : np.ndarray   - binary labels
    feature_names   : list[str]
    """
    print("[4/5] Scaling features & train/test split ...")

    # Drop non-feature columns
    drop_cols = ["Label", "BinaryLabel"]
    feature_cols = [c for c in df.columns if c not in drop_cols]
    feature_names = feature_cols

    X = df[feature_cols].values.astype(np.float32)
    y = df["BinaryLabel"].values.astype(np.int64)

    # Train / Test split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=config.TEST_SIZE,
        random_state=config.RANDOM_SEED,
        stratify=y,
    )

    # Standard scaling (fit on train, transform both)
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    print(f"      Train: {X_train.shape[0]:,}  |  Test: {X_test.shape[0]:,}")
    print(f"      Features: {X_train.shape[1]}")

    return X_train, X_test, y_train, y_test, feature_names


def preprocess():
    """Full preprocessing pipeline.

    Returns
    -------
    X_train, X_test, y_train, y_test, feature_names
    """
    print("=" * 60)
    print("       DATA PREPROCESSING")
    print("=" * 60)

    df = load_and_clean()
    df = encode_labels_binary(df)
    df = stratified_sample(df)
    X_train, X_test, y_train, y_test, feature_names = scale_and_split(df)

    print("[5/5] Preprocessing complete [OK]")
    print("=" * 60)
    return X_train, X_test, y_train, y_test, feature_names


if __name__ == "__main__":
    preprocess()
