import pandas as pd
import numpy as np

# Synthetic Biological Dataset Generation (3,000 rows)
np.random.seed(42)
data_size = 3000

# Normal Vitals Data (Label = 0)
normal_temp = np.random.uniform(36.0, 37.5, data_size // 2)
normal_diff = np.random.uniform(0.0, 0.3, data_size // 2)

# Tampered / Attack Vitals Data (Label = 1)
tampered_temp_A = np.random.uniform(38.5, 42.0, data_size // 4)
tampered_diff_A = np.random.uniform(1.5, 5.0, data_size // 4)

tampered_temp_B = np.random.uniform(45.0, 60.0, data_size // 4)
tampered_diff_B = np.random.uniform(0.1, 2.0, data_size // 4)

# Combine datasets
temp_all = np.concatenate([normal_temp, tampered_temp_A, tampered_temp_B])
diff_all = np.concatenate([normal_diff, tampered_diff_A, tampered_diff_B])
labels = np.concatenate([np.zeros(data_size // 2), np.ones(data_size // 2)])

# Create Pandas DataFrame
df = pd.DataFrame({
    'Temperature_C': np.round(temp_all, 2),
    'Temp_Rate_Change_Delta': np.round(diff_all, 2),
    'Is_Tampered': labels.astype(int)  # 0 = Normal/Safe, 1 = Tampered/Attack
})

# Save to CSV File
df.to_csv('dataset.csv', index=False)
print("SUCCESS: 'dataset.csv' created with 3,000 rows!")