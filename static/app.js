const state = { tasks: [], filter: "all", editingId: null };
const $ = (selector) => document.querySelector(selector);
const todayISO = () => new Date().toISOString().slice(0, 10);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

function formatDate(date) { return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function dueLabel(task) {
  if (!task.due_date) return "";
  if (task.due_date === todayISO()) return "Today";
  const due = new Date(`${task.due_date}T00:00:00`);
  const diff = Math.ceil((due - new Date(`${todayISO()}T00:00:00`)) / 86400000);
  return diff < 0 ? `Overdue · ${formatDate(task.due_date)}` : formatDate(task.due_date);
}

function visibleTasks() {
  let tasks = [...state.tasks];
  if (state.filter === "today") tasks = tasks.filter((task) => task.due_date === todayISO() && !task.completed);
  if (state.filter === "upcoming") tasks = tasks.filter((task) => task.due_date && task.due_date > todayISO() && !task.completed);
  if (state.filter === "completed") tasks = tasks.filter((task) => task.completed);
  const query = $("#search-input").value.trim().toLowerCase();
  if (query) tasks = tasks.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(query));
  const sort = $("#sort-select").value;
  if (sort === "due") tasks.sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  if (sort === "newest") tasks.sort((a, b) => b.id - a.id);
  if (sort === "alphabetical") tasks.sort((a, b) => a.title.localeCompare(b.title));
  return tasks;
}

function render() {
  const all = state.tasks, open = all.filter((task) => !task.completed), done = all.length - open.length;
  const today = open.filter((task) => task.due_date === todayISO()).length;
  const percent = all.length ? Math.round(done / all.length * 100) : 0;
  $("#all-count").textContent = all.length; $("#today-count").textContent = today;
  $("#completed-total").textContent = done; $("#remaining-total").textContent = open.length;
  $("#due-total").textContent = today; $("#done-total").textContent = done;
  $("#progress-percent").textContent = `${percent}%`; $("#progress-ring").style.setProperty("--progress", `${percent * 3.6}deg`);
  $("#progress-copy").textContent = all.length ? (done === all.length ? "Look at you go!" : `${done} of ${all.length} tasks done`) : "Ready when you are";
  $("#progress-hint").textContent = all.length ? (done === all.length ? "Everything on your list is complete. Amazing work." : "Keep going, you're making great progress.") : "Add a task to start building momentum.";
  const names = { all: "All tasks", today: "Due today", upcoming: "Upcoming", completed: "Completed" };
  $("#crumb-title").textContent = names[state.filter];
  // Preserve the count badge nested inside this heading.
  $("#list-title").firstChild.textContent = `${names[state.filter]} `;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.filter === state.filter));
  const tasks = visibleTasks(); $("#visible-count").textContent = tasks.length;
  $("#task-list").innerHTML = tasks.map((task) => `<article class="task-card ${task.completed ? "is-complete" : ""}">
    <button class="check-button ${task.completed ? "checked" : ""}" data-action="toggle" data-id="${task.id}" aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}" aria-pressed="${task.completed}">${task.completed ? "✓" : ""}</button>
    <div class="task-copy"><h3>${escapeHTML(task.title)}</h3>${task.description ? `<p>${escapeHTML(task.description)}</p>` : ""}<div class="task-meta"><span class="priority ${task.priority}"><i></i>${task.priority} priority</span>${task.due_date ? `<span class="due-date ${task.due_date < todayISO() && !task.completed ? "overdue" : ""}"><span>▣</span>${dueLabel(task)}</span>` : ""}</div></div>
    <div class="task-actions"><button class="icon-button edit-button" data-action="edit" data-id="${task.id}" aria-label="Edit ${escapeHTML(task.title)}">✎</button><button class="icon-button delete-button" data-action="delete" data-id="${task.id}" aria-label="Delete ${escapeHTML(task.title)}">⌫</button></div></article>`).join("");
  const noTasks = tasks.length === 0; $("#empty-state").classList.toggle("visible", noTasks); $("#task-list").classList.toggle("hidden", noTasks);
  $("#empty-title").textContent = state.filter === "all" && !all.length ? "A clean slate." : `Nothing ${state.filter === "completed" ? "completed" : "here"} yet.`;
  $("#empty-copy").textContent = state.filter === "all" && !all.length ? "Add your first task and make today count." : "Try another view, or add a new task to your list.";
  $("#empty-add").classList.toggle("hidden", state.filter !== "all" || !!all.length);
}

async function refresh() { try { state.tasks = await api("/api/tasks"); render(); } catch (error) { toast(error.message); } }
function openModal(task = null) {
  state.editingId = task?.id ?? null; $("#task-form").reset();
  $("#modal-title").textContent = task ? "Edit task" : "Create a task"; $("#save-task").innerHTML = task ? "Save changes <span>→</span>" : "Create task <span>→</span>";
  if (task) { $("#task-title").value = task.title; $("#task-description").value = task.description; $("#task-priority").value = task.priority; $("#task-due").value = task.due_date || ""; }
  $("#form-error").textContent = ""; document.querySelectorAll(".field-error").forEach((el) => el.textContent = "");
  $("#modal-backdrop").hidden = false; document.body.classList.add("modal-open"); setTimeout(() => $("#task-title").focus(), 30);
}
function closeModal() { $("#modal-backdrop").hidden = true; document.body.classList.remove("modal-open"); }

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => { state.filter = button.dataset.filter; render(); }));
$("#new-task-button").addEventListener("click", () => openModal()); $("#empty-add").addEventListener("click", () => openModal());
$("#close-modal").addEventListener("click", closeModal); $("#cancel-modal").addEventListener("click", closeModal);
$("#modal-backdrop").addEventListener("click", (event) => { if (event.target === $("#modal-backdrop")) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("#modal-backdrop").hidden) closeModal(); });
$("#search-input").addEventListener("input", render); $("#sort-select").addEventListener("change", render);
$("#task-form").addEventListener("submit", async (event) => {
  event.preventDefault(); $("#form-error").textContent = "";
  const payload = { title: $("#task-title").value, description: $("#task-description").value, priority: $("#task-priority").value, due_date: $("#task-due").value };
  try {
    if (state.editingId) await api(`/api/tasks/${state.editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await api("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
    closeModal(); await refresh(); toast(state.editingId ? "Task updated." : "Task added to your list.");
  } catch (error) { $("#form-error").textContent = error.message; }
});
$("#task-list").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]"); if (!button) return;
  const task = state.tasks.find((item) => item.id === Number(button.dataset.id)); if (!task) return;
  try {
    if (button.dataset.action === "toggle") await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed: !task.completed }) });
    if (button.dataset.action === "edit") return openModal(task);
    if (button.dataset.action === "delete") { if (!window.confirm(`Delete “${task.title}”?`)) return; await api(`/api/tasks/${task.id}`, { method: "DELETE" }); toast("Task deleted."); }
    await refresh();
  } catch (error) { toast(error.message); }
});

const now = new Date(); $("#today-label").textContent = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
$("#footer-date").textContent = now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
const hour = now.getHours(); $("#greeting").textContent = hour < 12 ? "GOOD MORNING" : hour < 18 ? "GOOD AFTERNOON" : "GOOD EVENING";
refresh();
