from fastapi.testclient import TestClient
from sqlmodel import Session
from main import UserProfile, Transaction, Goal

# --- User Profile Tests ---
def test_get_profile_creates_default(client: TestClient):
    response = client.get("/api/profile/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Usuário Axxy"
    assert data["email"] == "usuario@email.com"

def test_update_profile(client: TestClient):
    # First ensure a profile exists (or create one)
    client.get("/api/profile/")
    
    new_data = {"name": "New Name", "email": "new@email.com", "avatar": "new.png"}
    response = client.post("/api/profile/", json=new_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["email"] == "new@email.com"

# --- Transaction Tests ---
def test_create_transaction(client: TestClient):
    tx_data = {
        "description": "Test Salary",
        "amount": 5000.0,
        "type": "income",
        "date": "2024-01-01",
        "category": "Salary",
        "status": "completed"
    }
    response = client.post("/api/transactions/", json=tx_data)
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Test Salary"
    assert data["id"] is not None

def test_read_transactions(client: TestClient):
    # Create a transaction first
    client.post("/api/transactions/", json={
        "description": "T1", "amount": 10.0, "type": "expense", 
        "date": "2024-01-01", "category": "Food", "status": "completed"
    })
    
    response = client.get("/api/transactions/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["description"] == "T1"

def test_delete_transaction(client: TestClient):
    # Create
    create_res = client.post("/api/transactions/", json={
        "description": "To Delete", "amount": 10.0, "type": "expense", 
        "date": "2024-01-01", "category": "Food", "status": "completed"
    })
    tx_id = create_res.json()["id"]
    
    # Delete
    del_res = client.delete(f"/api/transactions/{tx_id}/")
    assert del_res.status_code == 200
    
    # Verify gone
    # Note: Our read_transactions endpoint returns a list, so we check if it's in the list
    list_res = client.get("/api/transactions/")
    ids = [t["id"] for t in list_res.json()]
    assert tx_id not in ids

# --- Goal Tests ---
def test_create_goal(client: TestClient):
    goal_data = {
        "name": "Test Goal",
        "currentAmount": 0,
        "targetAmount": 1000,
        "deadline": "2024-12-31",
        "color": "red"
    }
    response = client.post("/api/goals/", json=goal_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Goal"

def test_read_goals(client: TestClient):
    client.post("/api/goals/", json={
        "name": "G1", "currentAmount": 0, "targetAmount": 100, 
        "deadline": "2024-01-01", "color": "blue"
    })
    response = client.get("/api/goals/")
    assert response.status_code == 200
    assert len(response.json()) >= 1

# --- Core Financials Tests (Mock Data) ---
def test_read_accounts_mock(client: TestClient):
    response = client.get("/api/accounts/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0 # Should return mocks
    assert "name" in data[0]

def test_read_categories_mock(client: TestClient):
    response = client.get("/api/categories/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

def test_read_budgets_mock(client: TestClient):
    response = client.get("/api/budgets/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

# --- Health & Alerts Tests (Mock Data) ---
def test_read_debts_mock(client: TestClient):
    response = client.get("/api/debts/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

def test_read_alerts_mock(client: TestClient):
    response = client.get("/api/alerts/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

# --- Advanced Features Tests ---
def test_reports(client: TestClient):
    response = client.get("/api/reports/")
    assert response.status_code == 200
    data = response.json()
    assert "kpi" in data
    assert "distribution" in data

def test_leakage_analysis(client: TestClient):
    response = client.get("/api/leakage-analysis/")
    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data

def test_interconnected_summary(client: TestClient):
    response = client.get("/api/interconnected-summary/")
    assert response.status_code == 200
    data = response.json()
    assert "activeGoals" in data
    assert "upcomingDebts" in data

def test_predictive_analysis(client: TestClient):
    response = client.get("/api/predictive-analysis/")
    assert response.status_code == 200
    data = response.json()
    assert "scenarios" in data
