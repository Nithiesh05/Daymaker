"""A small, beginner-friendly Flask task manager."""

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, render_template, request


BASE_DIR = Path(__file__).resolve().parent


def get_db_path():
    configured = os.environ.get("DATABASE_PATH")
    return Path(configured) if configured else BASE_DIR / "data" / "tasks.db"


def connect_db():
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    with connect_db() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
            due_date TEXT,
            completed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )""")


def task_dict(row):
    task = dict(row)
    task["completed"] = bool(task["completed"])
    return task


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(JSON_SORT_KEYS=False)
    if test_config:
        app.config.update(test_config)
    init_db()

    @app.get("/")
    def home():
        return render_template("index.html")

    @app.get("/api/tasks")
    def list_tasks():
        with connect_db() as db:
            rows = db.execute("SELECT * FROM tasks ORDER BY completed ASC, CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, due_date IS NULL, due_date, id DESC").fetchall()
        return jsonify([task_dict(row) for row in rows])

    @app.post("/api/tasks")
    def add_task():
        data = request.get_json(silent=True) or {}
        title = str(data.get("title", "")).strip()
        description = str(data.get("description", "")).strip()
        priority = str(data.get("priority", "medium")).lower()
        due_date = str(data.get("due_date", "")).strip() or None
        errors = {}
        if not title:
            errors["title"] = "Give your task a name."
        elif len(title) > 100:
            errors["title"] = "Task names must be 100 characters or fewer."
        if len(description) > 500:
            errors["description"] = "Descriptions must be 500 characters or fewer."
        if priority not in {"low", "medium", "high"}:
            errors["priority"] = "Choose low, medium, or high priority."
        if due_date:
            try:
                datetime.strptime(due_date, "%Y-%m-%d")
            except ValueError:
                errors["due_date"] = "Choose a valid due date."
        if errors:
            return jsonify({"error": "Please check the highlighted fields.", "fields": errors}), 400
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with connect_db() as db:
            cursor = db.execute("INSERT INTO tasks(title, description, priority, due_date, created_at) VALUES (?, ?, ?, ?, ?)", (title, description, priority, due_date, now))
            row = db.execute("SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return jsonify(task_dict(row)), 201

    @app.patch("/api/tasks/<int:task_id>")
    def update_task(task_id):
        data = request.get_json(silent=True) or {}
        allowed = {"title", "description", "priority", "due_date", "completed"}
        if not data or set(data) - allowed:
            return jsonify({"error": "There is nothing valid to update."}), 400
        with connect_db() as db:
            row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
            if row is None:
                return jsonify({"error": "That task could not be found."}), 404
            current = task_dict(row)
            values = {key: data.get(key, current[key]) for key in allowed}
            values["title"] = str(values["title"]).strip()
            values["description"] = str(values["description"]).strip()
            values["priority"] = str(values["priority"]).lower()
            values["due_date"] = str(values["due_date"] or "").strip() or None
            errors = {}
            if not values["title"]:
                errors["title"] = "Give your task a name."
            elif len(values["title"]) > 100:
                errors["title"] = "Task names must be 100 characters or fewer."
            if len(values["description"]) > 500:
                errors["description"] = "Descriptions must be 500 characters or fewer."
            if values["priority"] not in {"low", "medium", "high"}:
                errors["priority"] = "Choose low, medium, or high priority."
            if values["due_date"]:
                try:
                    datetime.strptime(values["due_date"], "%Y-%m-%d")
                except ValueError:
                    errors["due_date"] = "Choose a valid due date."
            if not isinstance(values["completed"], bool):
                errors["completed"] = "Completion status must be true or false."
            if errors:
                return jsonify({"error": "Please check the highlighted fields.", "fields": errors}), 400
            db.execute("UPDATE tasks SET title=?, description=?, priority=?, due_date=?, completed=? WHERE id=?", (values["title"], values["description"], values["priority"], values["due_date"], int(values["completed"]), task_id))
            updated = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return jsonify(task_dict(updated))

    @app.delete("/api/tasks/<int:task_id>")
    def delete_task(task_id):
        with connect_db() as db:
            cursor = db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
            if cursor.rowcount == 0:
                return jsonify({"error": "That task could not be found."}), 404
        return "", 204

    @app.errorhandler(404)
    def not_found(_error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "That page or task could not be found."}), 404
        return "Page not found", 404

    @app.errorhandler(500)
    def server_error(_error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Something went wrong. Please try again."}), 500
        return "Something went wrong. Please try again.", 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=os.environ.get("FLASK_DEBUG") == "1")
