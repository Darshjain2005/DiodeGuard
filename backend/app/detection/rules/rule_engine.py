"""
Rule-Based Detection Engine

Parses Sigma-inspired YAML rules and evaluates network flow data
to detect known attack patterns (e.g. Brute Force, DoS, PortScan).
"""

import os
import glob
import yaml
import pandas as pd

class RuleEngine:
    def __init__(self, rules_dir: str):
        self.rules_dir = rules_dir
        self.rules = self.load_rules()

    def load_rules(self) -> list:
        """Loads all YAML rules from the rules directory."""
        rules = []
        rule_files = glob.glob(os.path.join(self.rules_dir, "*.yaml"))
        for file_path in rule_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    rule = yaml.safe_load(f)
                    rules.append(rule)
            except Exception as e:
                print(f"Error loading rule {file_path}: {e}")
        return rules

    def _evaluate_condition(self, value, condition_str):
        """Evaluates a value against a condition string (e.g. '> 50000')."""
        if isinstance(condition_str, str):
            condition_str = condition_str.strip()
            if condition_str.startswith(">="):
                return float(value) >= float(condition_str[2:])
            elif condition_str.startswith("<="):
                return float(value) <= float(condition_str[2:])
            elif condition_str.startswith(">"):
                return float(value) > float(condition_str[1:])
            elif condition_str.startswith("<"):
                return float(value) < float(condition_str[1:])
            elif condition_str.startswith("=="):
                return float(value) == float(condition_str[2:])
            else:
                # Direct equality check for strings/numbers without operators
                return str(value) == str(condition_str)
        elif isinstance(condition_str, list):
            # E.g. [21, 22]
            return value in condition_str
        else:
            # Direct match
            return value == condition_str

    def evaluate_flow(self, flow: dict) -> list:
        """
        Evaluates a single network flow against all loaded rules.
        Returns a list of triggered rule titles.
        """
        triggered_rules = []
        
        for rule in self.rules:
            # For simplicity, we just process the "selection" block and 
            # optionally any other blocks referenced in the "condition" field.
            # Here we implement a simplified Sigma evaluation logic tailored to our dataset.
            
            try:
                detection_block = rule.get("detection", {})
                
                # Check 'selection' block
                selection_match = True
                if "selection" in detection_block:
                    for key, condition in detection_block["selection"].items():
                        # We need to match the key exactly to the dataset column name
                        # Our dataset columns might have leading spaces, so we strip them for comparison
                        flow_val = None
                        for f_key, f_val in flow.items():
                            if str(f_key).strip() == str(key).strip():
                                flow_val = f_val
                                break
                        
                        if flow_val is None:
                            selection_match = False
                            break
                            
                        if not self._evaluate_condition(flow_val, condition):
                            selection_match = False
                            break

                # Check additional blocks (e.g., 'flow_duration') if specified in condition
                condition_logic = detection_block.get("condition", "selection")
                additional_match = True
                
                if "and" in condition_logic:
                    parts = [p.strip() for p in condition_logic.split("and")]
                    for part in parts:
                        if part != "selection" and part in detection_block:
                            # Evaluate this block
                            for key, condition in detection_block[part].items():
                                flow_val = None
                                for f_key, f_val in flow.items():
                                    if str(f_key).strip() == str(key).strip():
                                        flow_val = f_val
                                        break
                                
                                if flow_val is None or not self._evaluate_condition(flow_val, condition):
                                    additional_match = False
                                    break
                
                if selection_match and additional_match:
                    triggered_rules.append(rule.get("title", "Unknown Rule"))
                    
            except Exception as e:
                # Skip poorly formatted rules during evaluation
                pass
                
        return triggered_rules

    def scan_dataframe(self, df: pd.DataFrame) -> pd.Series:
        """
        Scans an entire pandas DataFrame.
        Returns a Series of lists (triggered rules for each row).
        """
        print(f"Scanning {len(df)} flows against {len(self.rules)} rules...")
        
        # Convert df to list of dicts for faster iteration
        records = df.to_dict(orient="records")
        results = [self.evaluate_flow(record) for record in records]
        
        return pd.Series(results)
