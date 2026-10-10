import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib

# Set random seed for reproducibility
np.random.seed(42)
data_size = 3000

# 1. Normal Biological Data (Label = 0)
# Normal body temp: 36.0°C to 37.5°C | Temp change (delta): 0.0°C to 0.3°C
normal_temp = np.random.uniform(36.0, 37.5, data_size // 2)
normal_diff = np.random.uniform(0.0, 0.3, data_size // 2)

# 2. Tampered / Hacker Data (Label = 1)
# Case A: Sudden impossible spike (Delta change > 1.5°C in short time)
tampered_temp_A = np.random.uniform(38.5, 42.0, data_size // 4)
tampered_diff_A = np.random.uniform(1.5, 5.0, data_size // 4)

# Case B: Out of physical human range (< 30°C or > 44°C)
tampered_temp_B = np.random.uniform(45.0, 60.0, data_size // 4)
tampered_diff_B = np.random.uniform(0.1, 2.0, data_size // 4)

# Combine datasets
temp_all = np.concatenate([normal_temp, tampered_temp_A, tampered_temp_B])
diff_all = np.concatenate([normal_diff, tampered_diff_A, tampered_diff_B])
labels = np.concatenate([np.zeros(data_size // 2), np.ones(data_size // 2)])

# Create DataFrame
df = pd.DataFrame({'temp': temp_all, 'temp_diff': diff_all, 'is_tampered': labels})

# Features (Inputs) and Target (Output)
X = df[['temp', 'temp_diff']]
y = df['is_tampered']

# Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Random Forest Model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate Accuracy
accuracy = model.score(X_test, y_test) * 100
print(f"Model Accuracy: {accuracy:.2f}%")

# Save the trained model to disk
joblib.dump(model, 'my_temp_ai_model.pkl')
print("SUCCESS: 'my_temp_ai_model.pkl' successfully generated!")