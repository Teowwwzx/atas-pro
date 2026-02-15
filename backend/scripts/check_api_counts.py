import requests
import os

# Assuming running from host, so using localhost:8000
API_URL = "http://localhost:8000"

def check_counts():
    print("🔍 Checking Profile Counts via API...")
    
    # Check total count of experts
    try:
        response = requests.get(f"{API_URL}/api/v1/profiles/discover/count?role=expert")
        if response.status_code == 200:
            count = response.json().get("total_count")
            print(f"✅ Total Experts in DB (via API): {count}")
            
            if count >= 1000:
                print("   -> Confirmed: API sees all 1000+ experts.")
            else:
                print("   -> ⚠️  Warning: API sees fewer experts than expected.")
        else:
            print(f"❌ Failed to get count. Status: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error connecting to API: {e}")

    # Check discover list size (pagination)
    try:
        response = requests.get(f"{API_URL}/api/v1/profiles/discover?role=expert&page_size=50")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ /discover endpoint returned {len(data)} items (requested page_size=50).")
            print("   -> This explains why you only see 50 users at a time.")
        else:
            print(f"❌ Failed to get discover list. Status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error connecting to API: {e}")

if __name__ == "__main__":
    check_counts()
