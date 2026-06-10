import os
import sys

# Add apps/api to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tasks.celery_app import app

def check_celery_available() -> bool:
    try:
        # Use a timeout of 1 second to avoid blocking
        with app.connection(connect_timeout=1.0) as conn:
            conn.connect()
        return True
    except Exception as e:
        print(f"Connection check failed: {e}")
        return False

print("Checking celery connection...")
is_ok = check_celery_available()
print(f"Is Celery connected? {is_ok}")
