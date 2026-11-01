import pytest

from app import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    app = create_app({"TESTING": True})
    return app.test_client()


def test_home_page_loads(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"daymark" in response.data


def test_create_edit_complete_and_delete_task(client):
    created = client.post("/api/tasks", json={"title": "Plan the launch", "priority": "high"})
    assert created.status_code == 201
    task = created.get_json()
    assert task["title"] == "Plan the launch"
    assert task["completed"] is False

    edited = client.patch(f"/api/tasks/{task['id']}", json={"title": "Plan the project launch", "completed": True})
    assert edited.status_code == 200
    assert edited.get_json()["completed"] is True

    assert client.get("/api/tasks").get_json()[0]["title"] == "Plan the project launch"
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 204
    assert client.get("/api/tasks").get_json() == []


def test_validation_and_missing_task_errors(client):
    assert client.post("/api/tasks", json={"title": "  "}).status_code == 400
    assert client.post("/api/tasks", json={"title": "Valid", "priority": "urgent"}).status_code == 400
    assert client.patch("/api/tasks/999", json={"completed": True}).status_code == 404
    assert client.delete("/api/tasks/999").status_code == 404
