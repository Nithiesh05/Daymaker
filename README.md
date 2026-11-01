# Daymark — Task Manager

Daymark is a polished, responsive task manager built as a beginner-friendly DevOps portfolio project. It uses Flask for the web server and API, SQLite for persistent task data, and plain HTML, CSS, and JavaScript for the interface.

## Features

- Create tasks with a title, notes, priority, and optional due date
- Edit, complete, and delete tasks
- Filter by all tasks, due today, upcoming, or completed
- Search and sort your list
- See a progress overview and helpful validation messages
- Save tasks in SQLite so they stay after restarting the app
- Run locally or in Docker, with a GitHub Actions workflow for automated tests

## Run it locally

You need Python 3.10 or newer.

1. Download and unzip the project.
2. Open a terminal in the `task-manager` project folder.
3. Create and activate a virtual environment:

   **Windows PowerShell**

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   **macOS or Linux**

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

4. Install the packages:

   ```bash
   pip install -r requirements.txt
   ```

5. Start the app:

   ```bash
   python app.py
   ```

6. Visit [http://localhost:5000](http://localhost:5000) in your browser.

The app creates `data/tasks.db` the first time it runs. Keep that file if you want to keep your task list.

## Run it with Docker

Install Docker Desktop (or Docker Engine), then run these commands from the project folder:

```bash
docker build -t daymark-task-manager .
docker run --name daymark -p 5000:5000 -v daymark-data:/app/data daymark-task-manager
```

Open [http://localhost:5000](http://localhost:5000). The named Docker volume `daymark-data` keeps the SQLite database when the container is replaced. To stop the container, press `Ctrl+C`; to start the existing container again, run `docker start -ai daymark`.

## Run the tests

```bash
pytest -q
```

GitHub Actions runs this same test command when code is pushed or a pull request is opened. To enable it, create a GitHub repository, upload the project files, and push the code. The workflow is in `.github/workflows/ci.yml`.

## Project map

| File or folder | What it does |
| --- | --- |
| `app.py` | Starts Flask, creates the SQLite table, validates requests, and provides the task API |
| `templates/index.html` | Defines the page layout and task form |
| `static/styles.css` | Controls the responsive visual design |
| `static/app.js` | Loads tasks and handles search, filters, editing, and other page interactions |
| `tests/test_app.py` | Checks the main page, task lifecycle, and validation behavior |
| `.github/workflows/ci.yml` | Runs the tests automatically on GitHub |
| `Dockerfile` | Describes how to package the app into a container |
| `requirements.txt` | Lists the Python packages the app needs |

## A simple way to explore the DevOps workflow

1. Run the app locally and make a small change, such as adding a UI label.
2. Run `pytest -q` to check that the core app still works.
3. Build and run the Docker image to practice containerizing the app.
4. Push the code to GitHub and watch the Actions tab for the CI run.

The included workflow tests changes; it does not deploy the app or create cloud resources.

## Configuration

- `PORT` changes the web server port (defaults to `5000`).
- `DATABASE_PATH` changes where SQLite stores the database (defaults to `data/tasks.db`).
- Set `FLASK_DEBUG=1` only for local development if you want Flask's debug mode.

## Notes

This project is intended for learning and portfolio demonstrations. It does not include user accounts, so anyone who can access the running app shares the same task list. The Google Fonts link is optional; the app uses local system fonts if the browser is offline.
