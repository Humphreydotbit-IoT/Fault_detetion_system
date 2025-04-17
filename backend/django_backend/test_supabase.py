# test_supabase.py
from supabase import create_client
import os
import time

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

print(f"URL: {url}")
print(f"KEY: {key[:5]}...")  # Print just first 5 chars for security

try:
    supabase = create_client(url, key)
    
    # Try a direct insert
    test_data = {
        'id': 'test-' + str(int(time.time())),
        'time': '2025-04-16T16:30:00+07:00',
        'floor': 1,
        'room': 1,
        'device_type': 'test',
        'fault_flags': 1,
        'severity': 1,
        'resolved': False
    }
    
    result = supabase.table('equipment_faults').insert(test_data).execute()
    print(f"Test insert result: {result}")
    
except Exception as e:
    print(f"Error: {str(e)}")