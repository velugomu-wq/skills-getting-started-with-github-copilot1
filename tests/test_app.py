from copy import deepcopy
import urllib.parse

from fastapi.testclient import TestClient

from src.app import app, activities


client = TestClient(app)


def setup_function(fn):
    # snapshot activities before each test
    fn._activities_snapshot = deepcopy(activities)


def teardown_function(fn):
    # restore activities after each test
    activities.clear()
    activities.update(fn._activities_snapshot)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # Basic sanity checks
    assert "Chess Club" in data
    assert "Programming Class" in data


def test_signup_and_unregister_flow():
    activity = "Basketball Team"
    email = "teststudent@example.com"

    # Ensure clean start
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]

    # Sign up
    signup_url = f"/activities/{urllib.parse.quote(activity)}/signup?email={urllib.parse.quote(email)}"
    resp = client.post(signup_url)
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Confirm participant present
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email in resp.json()[activity]["participants"]

    # Unregister
    delete_url = f"/activities/{urllib.parse.quote(activity)}/participants?email={urllib.parse.quote(email)}"
    resp = client.delete(delete_url)
    assert resp.status_code == 200
    assert "Unregistered" in resp.json().get("message", "")

    # Confirm participant removed
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]
