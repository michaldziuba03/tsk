import pandas as pd

df = pd.read_csv('orders.csv')
unikalne = df['orderID'].nunique()

print(f"Liczba unikalnych wartości w kolumnie 'orderID': {unikalne}")
