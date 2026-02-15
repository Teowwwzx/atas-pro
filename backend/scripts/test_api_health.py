import requests
import sys
import uuid
import time

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
# Use a random email to avoid conflict on repeated runs
RANDOM_ID = str(uuid.uuid4())[:8]
TEST_EMAIL = f"healthcheck_{RANDOM_ID}@example.com"
TEST_PASSWORD = "TestPassword123!"

def print_status(name, success, details=None):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {name}")
    if details:
        print(f"{details}")

def run_health_check():
    print(f"Starting API Health Check on {BASE_URL}...\n")
    
    # 1. Test Public Endpoint (Events Count)
    try:
        response = requests.get(f"{BASE_URL}/events/count")
        if response.status_code == 200:
            print_status("Public Endpoint (Events Count)", True, f"Response: {response.json()}")
        else:
            print_status("Public Endpoint (Events Count)", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        print_status("Public Endpoint (Events Count)", False, f"Error: {str(e)}")
        return False

    # 2. Test Registration
    try:
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": "Health Check User",
            "role": "user" # Adjust if needed based on your schema
        }
        # Note: Adjust endpoint if it's strictly /auth/register or similar
        response = requests.post(f"{BASE_URL}/auth/register", json=payload)
        
        if response.status_code in [200, 201]:
            print_status("User Registration", True, f"Created: {TEST_EMAIL}")
            
            # Auto-activate user for testing purposes (dev environment only)
            import subprocess
            print("   Activating user via Docker...")
            try:
                cmd = [
                    "docker", "exec", "-t", "atas_postgres", 
                    "psql", "-U", "atas_pro_user", "-d", "atas_pro", 
                    "-c", f"UPDATE users SET is_verified = true, status = 'active' WHERE email = '{TEST_EMAIL}';"
                ]
                subprocess.run(cmd, check=True, capture_output=True)
                print("   User activated successfully.")
            except Exception as e:
                print(f"   Warning: Failed to activate user automatically: {e}")

        elif response.status_code == 400 and "Email already registered" in response.text:
             print_status("User Registration", True, f"User {TEST_EMAIL} already exists")
        else:
            print_status("User Registration", False, f"Status: {response.status_code}, Body: {response.text}")
            # If registration fails, we might check login in case user exists (though unlikely with random email)
            return False
    except Exception as e:
        print_status("User Registration", False, f"Error: {str(e)}")
        return False

    # 3. Test Login (Get Token)
    token = None
    try:
        # FastAPI OAuth2PasswordRequestForm expects form data, not JSON
        data = {
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/auth/login", data=data)
        
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token")
            print_status("User Login", True, "Token received")
        else:
            print_status("User Login", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        print_status("User Login", False, f"Error: {str(e)}")
        return False

    # 4. Test Authenticated Endpoint (Get My Profile)
    if token:
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{BASE_URL}/profiles/me", headers=headers)
            
            if response.status_code == 200:
                print_status("Authenticated Endpoint (Get Profile)", True, f"User ID: {response.json().get('user_id')}")
            elif response.status_code == 404:
                # Profile might not exist yet, let's try creating it or acceptable if 404 is expected for new users
                print_status("Authenticated Endpoint (Get Profile)", False, "Profile not found (404) - New user might need profile creation")
            else:
                print_status("Authenticated Endpoint (Get Profile)", False, f"Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            print_status("Authenticated Endpoint (Get Profile)", False, f"Error: {str(e)}")

    # 5. Test Semantic Search (if available)
    try:
        # Assuming this is a public endpoint or requires auth? Usually public in ATAS.
        # Checking profile_router.py, /profiles/semantic-search uses q_text
        response = requests.get(f"{BASE_URL}/profiles/semantic-search?q_text=python")
        
        if response.status_code == 200:
            print_status("Semantic Search", True, f"Found {len(response.json())} results")
        else:
            # It might be 401 if auth required, or 404 if not implemented/mounted there
            print_status("Semantic Search", False, f"Status: {response.status_code} (Might need auth or different path)")
    except Exception as e:
        print_status("Semantic Search", False, f"Error: {str(e)}")

    print("\nHealth check completed.")

if __name__ == "__main__":
    run_health_check()
