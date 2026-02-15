import requests
import sys
import os
import subprocess
import json
import time
from rich.console import Console
from rich.table import Table

console = Console()
API_URL = "http://localhost:8000"
EMAIL = "semantic_test@example.com"
PASSWORD = "password123"

def run_command(command):
    """Run shell command and return output"""
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Command failed: {command}\n{result.stderr}")
        return None
    return result.stdout.strip()

def login():
    """Register/Login to get an access token."""
    console.print("[dim]Authenticating...[/dim]")
    # 1. Register
    try:
        requests.post(f"{API_URL}/api/v1/auth/register", json={
            "email": EMAIL,
            "password": PASSWORD,
            "full_name": "Semantic Search Test User",
            "role": "expert"
        })
    except:
        pass

    # 2. Activate (using the same trick as before, assuming we have DB access)
    # This is a hack for the test script; in production, email verification is used.
    run_command(f"docker compose exec -T postgres psql -U atas_pro_user -d atas_pro -c \"UPDATE users SET is_verified = true, status = 'active' WHERE email = '{EMAIL}';\"")

    # 3. Login
    resp = requests.post(f"{API_URL}/api/v1/auth/login", data={
        "username": EMAIL,
        "password": PASSWORD
    })
    
    if resp.status_code != 200:
        console.print(f"[bold red]Login failed: {resp.text}[/bold red]")
        sys.exit(1)
        
    return resp.json()["access_token"]

def get_my_id(token):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{API_URL}/api/v1/users/me", headers=headers)
    return resp.json()["id"]

def update_profile(token, user_id):
    console.print("[dim]Updating profile with AI keywords...[/dim]")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Update profile with specific skills/bio
    profile_data = {
        "full_name": "Dr. AI Researcher",
        "bio": "I am an expert in Machine Learning, Deep Learning, and Natural Language Processing. I have 10 years of experience with Python and TensorFlow.",
        "title": "Senior AI Research Scientist",
        "skills": ["Machine Learning", "Deep Learning", "NLP", "Python", "TensorFlow"],
        "visibility": "public" # Must be public to be found? Check router logic.
    }
    
    # Create or Update
    resp = requests.put(f"{API_URL}/api/v1/profiles/me", headers=headers, json=profile_data)
    if resp.status_code == 404:
        # Create if not exists (though registration should create empty profile usually)
        resp = requests.post(f"{API_URL}/api/v1/profiles/{user_id}", headers=headers, json=profile_data)
    
    if resp.status_code not in [200, 201]:
        console.print(f"[bold red]Failed to update profile: {resp.text}[/bold red]")
        sys.exit(1)
        
    console.print("[dim]Waiting 5 seconds for Celery worker to generate embeddings...[/dim]")
    time.sleep(5)
        
    return profile_data["bio"]

# Removed manual trigger_embedding_generation function as it's now handled asynchronously by the backend


def search_profiles(token, query, should_find=True):
    console.print(f"[bold cyan]Searching for: '{query}'...[/bold cyan]")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Call semantic search endpoint
    start_time = time.time()
    resp = requests.get(f"{API_URL}/api/v1/profiles/semantic-search", params={"q_text": query}, headers=headers)
    duration = (time.time() - start_time) * 1000
    
    if resp.status_code != 200:
        console.print(f"[bold red]Search failed: {resp.text}[/bold red]")
        return
        
    results = resp.json()
    console.print(f"Found {len(results)} results in {duration:.2f}ms")
    
    table = Table(title=f"Search Results for '{query}'")
    table.add_column("Name", style="green")
    table.add_column("Title", style="yellow")
    table.add_column("Bio Snippet", style="white")
    
    found_our_user = False
    for p in results:
        bio_snippet = (p.get('bio') or "")[:50] + "..."
        table.add_row(p.get('full_name'), p.get('title'), bio_snippet)
        if p.get('full_name') == "Dr. AI Researcher":
            found_our_user = True
            
    console.print(table)
    
    if should_find:
        if found_our_user:
            console.print("[bold green]✅ SUCCESS: Created user was found via semantic search![/bold green]")
        else:
            console.print("[bold red]❌ FAILURE: Created user was NOT found.[/bold red]")
    else:
        if not found_our_user:
            console.print("[bold green]✅ SUCCESS: User correctly NOT found (irrelevant query).[/bold green]")
        else:
            console.print("[bold red]❌ FAILURE: User WAS found (should be irrelevant).[/bold red]")

def test_rate_limit(token):
    console.print("[bold cyan]Testing Rate Limit (30 req/hour)...[/bold cyan]")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Trigger 35 requests
    for i in range(35):
        resp = requests.get(f"{API_URL}/api/v1/profiles/semantic-search", params={"q_text": "test"}, headers=headers)
        if resp.status_code == 429:
            console.print(f"[bold green]✅ SUCCESS: Rate limit triggered at request {i+1}![/bold green]")
            return
        elif resp.status_code != 200:
            console.print(f"[bold red]Unexpected error at request {i+1}: {resp.status_code}[/bold red]")
            return
        print(f"Request {i+1}: OK")
        
    console.print("[bold red]❌ FAILURE: Rate limit NOT triggered after 35 requests![/bold red]")

def search_profiles_check(token, query):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.get(f"{API_URL}/api/v1/profiles/semantic-search", params={"q_text": query}, headers=headers)
        if resp.status_code == 200:
            results = resp.json()
            for p in results:
                if p.get('full_name') == "Dr. AI Researcher":
                    return True
    except:
        pass
    return False

if __name__ == "__main__":
    console.print("[bold]Starting Semantic Search Verification...[/bold]")
    
    # 1. Login
    token = login()
    user_id = get_my_id(token)
    
    # 2. Update Profile
    bio = update_profile(token, user_id)
    
    # 3. Wait for Async Embedding Generation
    console.print("[dim]Waiting for async embedding generation (Celery task)...[/dim]")
    # Give Celery some time to pick up the task and process it
    # First search might be fast if worker is idle, but let's be safe
    for i in range(10):
        time.sleep(2)
        console.print(f"[dim]Checking search results (attempt {i+1}/10)...[/dim]")
        
        # We can try to search immediately. If we find it, great.
        found = search_profiles_check(token, "looking for machine learning expert")
        if found:
            break
    
    # 4. Search Validation
    search_profiles(token, "looking for machine learning expert", should_find=True)
    search_profiles(token, "need help with baking cookies", should_find=False) # Should NOT find him

    # 5. Rate Limit Validation
    test_rate_limit(token)
