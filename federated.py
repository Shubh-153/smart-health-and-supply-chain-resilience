import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from datetime import datetime, timedelta

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

def build_features(dates_series):
    df = pd.DataFrame({'date': pd.to_datetime(dates_series)})
    df['t'] = np.arange(len(df))
    df['dow'] = df['date'].dt.dayofweek
    for d in range(7):
        df[f'dow_{d}'] = (df['dow'] == d).astype(int)
    return df[['t'] + [f'dow_{d}' for d in range(7)]]

class LocalNode:
    def __init__(self, region_name, dates, footfall_values):
        self.region = region_name
        
        X = build_features(dates)
        y = np.array(footfall_values)
        
        self.X_train = X.iloc[:-5]
        self.y_train = y[:-5]
        self.X_val = X.iloc[-5:]
        self.y_val = y[-5:]
        
        self.local_model = LinearRegression()
        
    def train_and_export_weights(self):
        self.local_model.fit(self.X_train, self.y_train)
        return {
            "region": self.region,
            "intercept": self.local_model.intercept_,
            "coefs": self.local_model.coef_,
            "sample_count": len(self.X_train)
        }
        
    def evaluate_local(self):
        preds = self.local_model.predict(self.X_val)
        return r2_score(self.y_val, preds)
        
    def evaluate_global(self, global_intercept, global_coefs):
        preds = self.X_val.dot(global_coefs) + global_intercept
        return r2_score(self.y_val, preds)

class FederatedAggregator:
    def __init__(self):
        pass
        
    def aggregate(self, exports):
        """
        STRUCTURAL ENFORCEMENT: This function receives ONLY the 'exports' list,
        which contains dicts of {intercept, coefs, sample_count}.
        It has zero references to LocalNode instances or their raw data matrices.
        """
        total_samples = sum(exp["sample_count"] for exp in exports)
        global_intercept = 0.0
        global_coefs = np.zeros_like(exports[0]["coefs"])
        
        for exp in exports:
            weight = exp["sample_count"] / total_samples
            global_intercept += exp["intercept"] * weight
            global_coefs += exp["coefs"] * weight
            
        return global_intercept, global_coefs

def run_federated_demo():
    print("--- FEDERATED LEARNING DEMONSTRATION ---")
    print("NOTE: This is a simulated Federated Averaging (FedAvg) implementation ")
    print("for demonstration purposes, not a production secure multi-party computation.\n")
    
    punjab_df = pd.read_csv("seed/footfall.csv")
    punjab_daily = punjab_df.groupby("date")["patients"].sum().reset_index()
    
    dates = punjab_daily["date"].tolist()
    
    # Generate Maharashtra Data (Match the base volume of Punjab so linear intercept averaging works)
    maha_base = punjab_daily["patients"].mean()
    maha_season = np.array([-0.2 if pd.to_datetime(d).dayofweek == 6 else 0.05 for d in dates])
    maha_noise = np.random.normal(0, maha_base * 0.05, 30)
    maha_trend = np.linspace(0, maha_base * 0.15, 30)
    maha_y = np.round(maha_base * (1 + maha_season) + maha_trend + maha_noise).astype(int)
    
    punjab_node = LocalNode("Punjab", dates, punjab_daily["patients"])
    maha_node = LocalNode("Maharashtra", dates, maha_y)
    
    punjab_export = punjab_node.train_and_export_weights()
    maha_export = maha_node.train_and_export_weights()
    
    aggregator = FederatedAggregator()
    # ENFORCEMENT LINE
    global_intercept, global_coefs = aggregator.aggregate([punjab_export, maha_export])
    
    print(f"{'Region':<15} | {'Local Model R²':<15} | {'Global Model R²':<15}")
    print("-" * 50)
    
    for node in [punjab_node, maha_node]:
        local_r2 = node.evaluate_local()
        global_r2 = node.evaluate_global(global_intercept, global_coefs)
        print(f"{node.region:<15} | {local_r2:<15.4f} | {global_r2:<15.4f}")
        
if __name__ == "__main__":
    run_federated_demo()
