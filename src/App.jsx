import React, { useState, useEffect } from "react";
import {
  Plus, Trash2, Pencil, Clock, Play, Check, X, ListChecks, CalendarClock,
  TrendingUp, ChevronRight, ChevronLeft, CircleDot, Lock, LogOut,
} from "lucide-react";
import { api, setStoredPin, clearStoredPin, getStoredRole, setStoredRole, clearStoredRole } from "./api.js";

// ---------- design tokens (same palette as the other ikorka panels) ----------
const T = {
  bg: "#0d1117",
  panel: "#151b23",
  panelAlt: "#1c2430",
  border: "#2a3441",
  text: "#e6edf3",
  sub: "#8b96a5",
  accent: "#3ddc97",
  amber: "#f0b429",
  red: "#f0555a",
  blue: "#5aa9f0",
};

// COO_PIN, OWNER_PIN, EVGENIYA_PIN all get identical full access on this
// panel — there's no restricted/view-only role here.
const ROLE_LABELS = { coo: "СОО", owner: "Власниця", evgeniya: "Євгенія" };

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso) - new Date(startIso);
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} год ${m} хв` : `${m} хв`;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getWeekDays(offset) {
  const now = new Date();
  const dow = now.getDay() === 0 ? 7 : now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
const DOW_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт"];
function useTicker(active) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

const PAGE_SIZE = 15;

// Remembers the current page per list (storageKey) across reloads. Sort
// happens in the caller BEFORE this slices — pagination must never
// reorder, only window into whatever order was already decided (active
// tasks on top, etc). localStorage is shared across all ikorka-* panels
// on the same GitHub Pages origin, so storageKey must be app+tab
// specific (e.g. "ikorka_coo_assigned_page"), same convention as the
// existing PIN/role keys.
function usePagedList(items, storageKey) {
  const [page, setPage] = useState(() => {
    const saved = parseInt(localStorage.getItem(storageKey) || "1", 10);
    return Number.isFinite(saved) && saved > 0 ? saved : 1;
  });
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]);
  useEffect(() => {
    localStorage.setItem(storageKey, String(page));
  }, [page, storageKey]);
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { page, setPage, totalPages, pageItems };
}

function Pagination({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;
  // Windowed page numbers (first, last, current ± 1) so a long history
  // of "Завершено" tasks doesn't turn this into a wall of buttons.
  const nums = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) nums.push(n);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const btn = (active) => ({
    ...btnStyle(active ? T.accent : T.sub, !active),
    minWidth: 30,
    justifyContent: "center",
    padding: "5px 9px",
  });
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 14 }}>
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={btn(false)}>
        <ChevronLeft size={14} />
      </button>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} style={{ color: T.sub, padding: "0 2px" }}>…</span>
        ) : (
          <button key={n} onClick={() => setPage(n)} style={btn(n === page)}>{n}</button>
        )
      )}
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btn(false)}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function Pill({ color, children }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
        color, background: color + "1a", border: `1px solid ${color}40`,
        fontFamily: "ui-monospace, monospace", letterSpacing: 0.2,
      }}
    >
      <CircleDot size={10} />
      {children}
    </span>
  );
}

// ---------------- Login screen ----------------
function LoginScreen({ onLoggedIn }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const { role } = await api.login(value.trim());
      setStoredPin(value.trim());
      setStoredRole(role);
      onLoggedIn(role);
    } catch {
      setError("Невірний PIN");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "ui-sans-serif, system-ui",
    }}>
      <div style={{ ...panelStyle, padding: 28, width: 280, textAlign: "center" }}>
        <Lock size={22} color={T.sub} style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Панель СОО</div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="PIN"
          style={{ ...inputStyle, width: "100%", textAlign: "center", fontSize: 18, letterSpacing: 4, boxSizing: "border-box" }}
        />
        {error && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{error}</div>}
        <button onClick={submit} disabled={busy} style={{ ...btnStyle(T.accent), width: "100%", justifyContent: "center", marginTop: 14 }}>
          {busy ? "…" : "Увійти"}
        </button>
      </div>
    </div>
  );
}

function TopBar({ tab, setTab, onLogout, role }) {
  const tabs = [
    { id: "daily", label: "Задачі на день", icon: ListChecks },
    { id: "assigned", label: "Задачі", icon: CalendarClock },
    { id: "weekly", label: "Тижнева аналітика", icon: TrendingUp },
  ];
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, padding: "0 20px", justifyContent: "space-between" }}>
      <div style={{ display: "flex" }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 16px", background: "transparent", border: "none",
                cursor: "pointer", fontSize: 14, fontWeight: 600,
                color: active ? T.text : T.sub,
                borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
                fontFamily: "ui-sans-serif, system-ui",
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ color: T.sub, fontSize: 12.5 }}>
          Ви увійшли як: <span style={{ color: T.text, fontWeight: 600 }}>{ROLE_LABELS[role] || role}</span>
        </span>
        <button onClick={onLogout} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
          <LogOut size={14} /> Вийти
        </button>
      </div>
    </div>
  );
}

// ---------------- Daily tasks tab ----------------
function DailyTab({ items, reload }) {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  async function add() {
    if (!text.trim()) return;
    await api.addDaily(text.trim());
    setText("");
    reload();
  }
  async function toggle(item) {
    await api.toggleDaily(item.id, !item.done);
    reload();
  }
  async function remove(id) {
    await api.deleteDaily(id);
    reload();
  }
  function startEdit(item) {
    setEditingId(item.id);
    setEditValue(item.text);
  }
  async function saveEdit(id) {
    if (!editValue.trim()) return;
    await api.editDaily(id, editValue.trim());
    setEditingId(null);
    reload();
  }
  async function changeCompletedDate(id, dateStr) {
    if (!dateStr) return;
    await api.setDailyCompletedAt(id, `${dateStr}T12:00:00`);
    reload();
  }
  const doneCount = items.filter((i) => i.done).length;
  // Unfinished on top, done at the bottom — recomputed from `items` on
  // every render, so toggling a checkbox (which triggers reload()) moves
  // it immediately without any extra state to keep in sync. Pagination
  // slices AFTER this sort, so it never disturbs the ordering.
  const sortedItems = [...items].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  const { page, setPage, totalPages, pageItems } = usePagedList(sortedItems, "ikorka_coo_daily_page");
  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Нова задача на сьогодні..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={add} style={btnStyle(T.accent)}><Plus size={14} /> Додати</button>
      </div>
      <div style={{ color: T.sub, fontSize: 12, marginBottom: 10 }}>{doneCount} з {items.length} виконано</div>
      <div style={panelStyle}>
        {pageItems.map((item, idx) => (
          <div key={item.id} style={{ ...rowStyle, borderTop: idx > 0 ? `1px solid ${T.border}` : "none", gap: 10 }}>
            <input type="checkbox" checked={item.done} onChange={() => toggle(item)} />
            {editingId === item.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit(item.id)}
                onBlur={() => saveEdit(item.id)}
                style={{ ...inputStyle, flex: 1 }}
              />
            ) : (
              <div
                onDoubleClick={() => startEdit(item)}
                style={{ flex: 1, textDecoration: item.done ? "line-through" : "none", color: item.done ? T.sub : T.text }}
              >
                {item.text}
              </div>
            )}
            {item.done && (
              <input
                type="date"
                title="Дата виконання — можна поставити заднім числом"
                value={item.completed_at ? String(item.completed_at).slice(0, 10) : ""}
                onChange={(e) => changeCompletedDate(item.id, e.target.value)}
                style={{ ...inputStyle, padding: "4px 6px", fontSize: 11.5, colorScheme: "dark" }}
              />
            )}
            <button onClick={() => startEdit(item)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer" }}>
              <Pencil size={14} />
            </button>
            <button onClick={() => remove(item.id)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && <div style={{ padding: 16, color: T.sub, fontSize: 13 }}>Задач на сьогодні ще немає.</div>}
      </div>
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ---------------- Assigned tasks tab (time-tracked + report) ----------------
function LiveElapsed({ startedAt }) {
  useTicker(true);
  const secs = Math.floor((Date.now() - new Date(startedAt)) / 1000);
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return <span style={{ fontFamily: "ui-monospace, monospace", color: T.amber, fontWeight: 700 }}>{h}:{m}:{s}</span>;
}

function AssignedTab({ items, reload }) {
  const [title, setTitle] = useState("");
  const [fromUser, setFromUser] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  // Draft report text per task — uncontrolled from the DB value until
  // touched, so re-renders from reload() don't fight typing. Saved on
  // blur; stays editable regardless of status, including "Завершено".
  const [reportDrafts, setReportDrafts] = useState({});

  async function addTask() {
    if (!title.trim()) return;
    await api.addAssigned(title.trim(), fromUser.trim() || null);
    setTitle("");
    reload();
  }
  async function start(id) {
    await api.setAssignedStatus(id, "active");
    reload();
  }
  async function finish(id) {
    await api.setAssignedStatus(id, "done");
    reload();
  }
  function startEdit(task) {
    setEditingId(task.id);
    setEditValue(task.title);
  }
  async function saveEdit(id) {
    if (!editValue.trim()) return;
    await api.editAssigned(id, { title: editValue.trim() });
    setEditingId(null);
    reload();
  }
  async function remove(id) {
    await api.deleteAssigned(id);
    reload();
  }
  async function changeDate(id, field, dateStr) {
    if (!dateStr) return;
    await api.editAssigned(id, { [field]: `${dateStr}T12:00:00` });
    reload();
  }
  async function saveReport(task) {
    const draft = reportDrafts[task.id];
    if (draft === undefined || draft === (task.report || "")) return;
    await api.editAssigned(task.id, { report: draft });
    reload();
  }

  const statusMeta = {
    queued: { label: "Не почато", color: T.sub },
    active: { label: "В роботі", color: T.amber },
    done: { label: "Завершено", color: T.accent },
  };
  // Active work stays on top regardless of when it was created; done
  // tasks sink to the bottom. Pagination slices AFTER this sort.
  const STATUS_ORDER = ["active", "queued", "done"];
  const sortedItems = [...items].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const { page, setPage, totalPages, pageItems } = usePagedList(sortedItems, "ikorka_coo_assigned_page");

  return (
    <div style={{ padding: 20, maxWidth: 760 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Нова задача, напр. «Підготувати квартальний звіт»"
          style={{ ...inputStyle, flex: 2, minWidth: 220 }}
        />
        <input
          value={fromUser}
          onChange={(e) => setFromUser(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Хто поставив"
          style={{ ...inputStyle, flex: 1, minWidth: 160 }}
        />
        <button onClick={addTask} style={btnStyle(T.accent)}><Plus size={14} /> Поставити</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pageItems.map((task) => {
          const meta = statusMeta[task.status];
          const dur = fmtDuration(task.started_at, task.finished_at);
          return (
            <div key={task.id} style={{ ...panelStyle, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  {editingId === task.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(task.id)}
                      onBlur={() => saveEdit(task.id)}
                      style={{ ...inputStyle, width: "100%", marginBottom: 6, boxSizing: "border-box" }}
                    />
                  ) : (
                    <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      {task.title}
                      <button onClick={() => startEdit(task)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "inline-flex" }}>
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 14, fontSize: 12, color: T.sub, flexWrap: "wrap", alignItems: "center" }}>
                    {task.from_user && <span>Від: {task.from_user}</span>}
                    {task.started_at && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Взято:
                        <input
                          type="date"
                          title="Можна поставити заднім числом"
                          value={String(task.started_at).slice(0, 10)}
                          onChange={(e) => changeDate(task.id, "started_at", e.target.value)}
                          style={{ ...inputStyle, padding: "2px 4px", fontSize: 11, colorScheme: "dark" }}
                        />
                      </span>
                    )}
                    {task.finished_at && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Завершено:
                        <input
                          type="date"
                          title="Можна поставити заднім числом"
                          value={String(task.finished_at).slice(0, 10)}
                          onChange={(e) => changeDate(task.id, "finished_at", e.target.value)}
                          style={{ ...inputStyle, padding: "2px 4px", fontSize: 11, colorScheme: "dark" }}
                        />
                      </span>
                    )}
                    {dur && <span style={{ color: T.text, fontWeight: 600 }}><Clock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{dur}</span>}
                    {task.status === "active" && <LiveElapsed startedAt={task.started_at} />}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Pill color={meta.color}>{meta.label}</Pill>
                  {task.status === "queued" && (
                    <button onClick={() => start(task.id)} style={btnStyle(T.blue)}><Play size={13} /> Взяти в роботу</button>
                  )}
                  {task.status === "active" && (
                    <button onClick={() => finish(task.id)} style={btnStyle(T.accent)}><Check size={13} /> Завершити</button>
                  )}
                  <button onClick={() => remove(task.id)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                <label style={labelStyle}>Звіт / нотатки</label>
                <textarea
                  value={reportDrafts[task.id] !== undefined ? reportDrafts[task.id] : (task.report || "")}
                  onChange={(e) => setReportDrafts({ ...reportDrafts, [task.id]: e.target.value })}
                  onBlur={() => saveReport(task)}
                  placeholder="Що зроблено, які результати, що потребує уваги..."
                  rows={2}
                  style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div style={{ ...panelStyle, padding: 16, color: T.sub, fontSize: 13 }}>Задач ще немає.</div>}
      </div>
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ---------------- Weekly analytics tab ----------------
function WeeklyTab({ daily, assigned }) {
  const [offset, setOffset] = useState(0);
  const days = getWeekDays(offset);
  const monday = days[0], friday = days[4];
  const rangeLabel = `${monday.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })} – ${friday.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })}`;

  const dayData = days.map((d) => ({
    date: d,
    dailyDone: daily.filter((t) => t.completed_at && isSameDay(new Date(t.completed_at), d)),
    assignedDone: assigned.filter((t) => t.finished_at && isSameDay(new Date(t.finished_at), d)),
  }));

  const totals = {
    daily: dayData.reduce((s, d) => s + d.dailyDone.length, 0),
    assigned: dayData.reduce((s, d) => s + d.assignedDone.length, 0),
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setOffset(offset - 1)} style={btnStyle(T.sub, true)}><ChevronLeft size={14} /></button>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            Тиждень {rangeLabel} {offset === 0 && <span style={{ color: T.accent, fontWeight: 600, fontSize: 12 }}> · поточний</span>}
          </div>
          <button onClick={() => setOffset(offset + 1)} disabled={offset === 0} style={{ ...btnStyle(T.sub, true), opacity: offset === 0 ? 0.35 : 1, cursor: offset === 0 ? "default" : "pointer" }}>
            <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: T.sub }}>
          <span><b style={{ color: T.text }}>{totals.daily}</b> задач на день</span>
          <span><b style={{ color: T.text }}>{totals.assigned}</b> задач завершено</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {dayData.map((d, i) => {
          const total = d.dailyDone.length + d.assignedDone.length;
          const isToday = isSameDay(d.date, new Date());
          return (
            <div key={i} style={{ ...panelStyle, padding: 12, border: isToday ? `1px solid ${T.accent}60` : panelStyle.border, minHeight: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{DOW_LABELS[i]} <span style={{ color: T.sub, fontWeight: 400 }}>{d.date.getDate()}.{String(d.date.getMonth() + 1).padStart(2, "0")}</span></div>
                {total > 0 && <span style={{ fontSize: 11, color: T.accent, fontWeight: 700 }}>{total}</span>}
              </div>
              {total === 0 && <div style={{ fontSize: 12, color: T.sub, fontStyle: "italic" }}>Нічого не зафіксовано</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {d.assignedDone.map((t) => (
                  <div key={"a" + t.id} style={{ fontSize: 11.5, display: "flex", gap: 5, alignItems: "flex-start" }}>
                    <Check size={11} color={T.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{t.title} <span style={{ color: T.sub }}>({fmtDuration(t.started_at, t.finished_at)})</span></span>
                  </div>
                ))}
                {d.dailyDone.map((t) => (
                  <div key={"d" + t.id} style={{ fontSize: 11.5, display: "flex", gap: 5, alignItems: "flex-start" }}>
                    <Check size={11} color={T.blue} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- shared styles ----------------
const panelStyle = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 };
const rowStyle = { display: "flex", alignItems: "center", padding: "10px 14px", fontSize: 13.5 };
const inputStyle = { background: T.panelAlt, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", color: T.text, fontSize: 13, outline: "none" };
const labelStyle = { display: "block", fontSize: 11, color: T.sub, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 };
function btnStyle(color, ghost) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 13px", borderRadius: 7, fontSize: 12.5, fontWeight: 700,
    cursor: "pointer", border: `1px solid ${ghost ? T.border : color + "60"}`,
    background: ghost ? "transparent" : color + "1a", color: ghost ? T.sub : color,
  };
}

function Dashboard({ onLogout, role }) {
  const [tab, setTab] = useState("daily");
  const [daily, setDaily] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  async function reloadAll() {
    setLoadError(null);
    try {
      const [dl, asg] = await Promise.all([api.getDaily(), api.getAssigned()]);
      setDaily(dl);
      setAssigned(asg);
    } catch (e) {
      setLoadError(e.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reloadAll(); }, []);

  const activeCount = assigned.filter((a) => a.status === "active").length;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Панель СОО</div>
          <div style={{ fontSize: 12.5, color: T.sub, marginTop: 2 }}>
            {activeCount > 0 ? `${activeCount} задача в роботі` : "немає активних задач"}
          </div>
        </div>
      </div>
      <TopBar tab={tab} setTab={setTab} onLogout={onLogout} role={role} />
      {loading ? (
        <div style={{ padding: 40, color: T.sub, textAlign: "center" }}>Завантаження…</div>
      ) : loadError ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>
            Не вдалося завантажити дані: {loadError}
          </div>
          <button onClick={() => { setLoading(true); reloadAll(); }} style={btnStyle(T.accent)}>
            Повторити
          </button>
        </div>
      ) : (
        <>
          {tab === "daily" && <DailyTab items={daily} reload={reloadAll} />}
          {tab === "assigned" && <AssignedTab items={assigned} reload={reloadAll} />}
          {tab === "weekly" && <WeeklyTab daily={daily} assigned={assigned} />}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(getStoredRole());

  function handleLogout() {
    clearStoredPin();
    clearStoredRole();
    setRole(null);
  }

  if (!role) return <LoginScreen onLoggedIn={setRole} />;
  return <Dashboard onLogout={handleLogout} role={role} />;
}
