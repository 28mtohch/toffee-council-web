import { useState, useEffect, useRef, useCallback } from "react";

/* ---------------------------------------------------------
   TOFFEE COUNCIL — ระบบเข้าเวรสภา
   Theme: black / gold / neon yellow
   Storage: shared persistent storage (window.storage)
--------------------------------------------------------- */

const DEFAULT_ADMIN_PASSWORD = "council2026";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function formatThaiDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}ชม. ${pad(m)}น.`;
}

function dateKeyBangkok(isoString) {
  const d = new Date(isoString);
  // Asia/Bangkok = UTC+7, no DST
  const bkk = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${bkk.getUTCFullYear()}-${pad(bkk.getUTCMonth() + 1)}-${pad(bkk.getUTCDate())}`;
}

function timeLabelBangkok(isoString) {
  const d = new Date(isoString);
  const bkk = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${pad(bkk.getUTCHours())}:${pad(bkk.getUTCMinutes())} น.`;
}

function dateLabelBangkok(dateKey) {
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y + 543}`;
}

function todayKeyBangkok() {
  return dateKeyBangkok(new Date().toISOString());
}

/* ---------------- storage helpers ---------------- */

async function storageGet(key, fallback) {
  try {
    const res = await window.storage.get(key, true);
    if (!res || res.value === undefined || res.value === null) return fallback;
    return JSON.parse(res.value);
  } catch (e) {
    return fallback;
  }
}

async function storageSet(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), true);
  } catch (e) {
    console.error("storage set failed", key, e);
  }
}

/* ---------------- shared style bits ---------------- */

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&family=Orbitron:wght@500;700;900&display=swap');

    .tc-root {
      --gold: #d4af37;
      --gold-bright: #f4d160;
      --neon: #ffe600;
      --neon-soft: rgba(255,230,0,0.35);
      --bg: #050403;
      --bg-panel: #0d0a06;
      --bg-panel2: #14100a;
      --line: rgba(212,175,55,0.28);
      --text: #f3e8c8;
      --text-dim: #9c8f66;
      --danger: #e3543f;
      --ok: #7cff6b;
      font-family: 'Kanit', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100%;
      position: relative;
    }
    .tc-mono { font-family: 'Orbitron', 'Kanit', sans-serif; }

    .tc-bgfx {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(ellipse 60% 40% at 50% -10%, rgba(255,230,0,0.10), transparent 60%),
        radial-gradient(ellipse 50% 30% at 100% 100%, rgba(212,175,55,0.08), transparent 60%),
        repeating-linear-gradient(0deg, rgba(212,175,55,0.025) 0px, rgba(212,175,55,0.025) 1px, transparent 1px, transparent 3px);
      z-index: 0;
    }

    .tc-glow-text {
      text-shadow: 0 0 6px var(--neon-soft), 0 0 22px rgba(255,230,0,0.25);
    }
    .tc-panel {
      background: linear-gradient(180deg, var(--bg-panel), var(--bg-panel2));
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.4) inset, 0 10px 40px rgba(0,0,0,0.5);
      position: relative;
    }
    .tc-panel::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 15px;
      padding: 1px;
      background: linear-gradient(135deg, var(--gold), transparent 30%, transparent 70%, var(--gold));
      opacity: 0.4;
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }

    .tc-btn {
      font-family: 'Kanit', sans-serif;
      font-weight: 600;
      letter-spacing: 0.03em;
      border-radius: 10px;
      border: 1px solid var(--gold);
      background: linear-gradient(180deg, rgba(212,175,55,0.18), rgba(212,175,55,0.04));
      color: var(--gold-bright);
      padding: 12px 20px;
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .tc-btn:hover:not(:disabled) {
      background: linear-gradient(180deg, rgba(255,230,0,0.28), rgba(255,230,0,0.06));
      box-shadow: 0 0 18px var(--neon-soft), 0 0 2px var(--neon);
      color: #fff8d6;
      transform: translateY(-1px);
    }
    .tc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .tc-btn-primary {
      background: linear-gradient(180deg, var(--neon), #c9a900);
      color: #1a1400;
      border: 1px solid var(--neon);
      box-shadow: 0 0 24px var(--neon-soft);
      font-weight: 700;
    }
    .tc-btn-primary:hover:not(:disabled) {
      box-shadow: 0 0 34px var(--neon), 0 0 10px #fff6b0;
      transform: translateY(-1px);
    }
    .tc-btn-danger {
      border-color: var(--danger);
      color: #ffb3a3;
    }
    .tc-btn-danger:hover:not(:disabled) {
      box-shadow: 0 0 18px rgba(227,84,63,0.45);
      color: #fff;
    }
    .tc-btn-sm { padding: 6px 12px; font-size: 0.8rem; border-radius: 8px; }

    .tc-input, .tc-select {
      font-family: 'Kanit', sans-serif;
      background: #0a0806;
      border: 1px solid var(--line);
      color: var(--text);
      border-radius: 9px;
      padding: 11px 14px;
      outline: none;
      width: 100%;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .tc-input:focus, .tc-select:focus {
      border-color: var(--neon);
      box-shadow: 0 0 0 3px rgba(255,230,0,0.15);
    }
    .tc-input::placeholder { color: var(--text-dim); }
    .tc-label {
      font-size: 0.78rem;
      color: var(--text-dim);
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      display: block;
    }

    .tc-dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: var(--ok);
      box-shadow: 0 0 8px var(--ok), 0 0 2px var(--ok);
      display: inline-block;
      animation: tc-pulse 1.6s ease-in-out infinite;
    }
    @keyframes tc-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.55; transform: scale(0.85); }
    }

    .tc-seal {
      width: 108px; height: 108px;
      border-radius: 50%;
      border: 2px solid var(--gold);
      display: flex; align-items: center; justify-content: center;
      position: relative;
      background: radial-gradient(circle at 50% 40%, rgba(255,230,0,0.12), transparent 70%);
      box-shadow: 0 0 30px rgba(255,230,0,0.25), inset 0 0 20px rgba(212,175,55,0.15);
    }
    .tc-seal::before, .tc-seal::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(212,175,55,0.5);
    }
    .tc-seal::before { inset: 8px; }
    .tc-seal::after {
      inset: -6px;
      border-color: rgba(255,230,0,0.18);
      animation: tc-spin 12s linear infinite;
      border-style: dashed;
    }
    @keyframes tc-spin { to { transform: rotate(360deg); } }

    .tc-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .tc-table th {
      text-align: left;
      color: var(--text-dim);
      font-weight: 500;
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      padding: 8px 10px;
      border-bottom: 1px solid var(--line);
    }
    .tc-table td {
      padding: 10px 10px;
      border-bottom: 1px solid rgba(212,175,55,0.10);
    }
    .tc-table tr:hover td { background: rgba(255,230,0,0.03); }

    .tc-tab {
      padding: 9px 18px;
      border-radius: 999px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.88rem;
      color: var(--text-dim);
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .tc-tab.active {
      color: #1a1400;
      background: var(--neon);
      box-shadow: 0 0 16px var(--neon-soft);
      font-weight: 700;
    }
    .tc-tab:not(.active):hover { color: var(--gold-bright); border-color: var(--line); }

    .tc-badge {
      font-size: 0.72rem;
      padding: 3px 9px;
      border-radius: 999px;
      border: 1px solid var(--line);
      color: var(--text-dim);
      letter-spacing: 0.04em;
    }
    .tc-badge.on { color: var(--ok); border-color: rgba(124,255,107,0.35); background: rgba(124,255,107,0.06); }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }
  `}</style>
);

/* ---------------- main app ---------------- */

export default function ToffeeCouncil() {
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [adminPassword, setAdminPassword] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("home"); // home | admin
  const [now, setNow] = useState(Date.now());
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    const [m, s, a] = await Promise.all([
      storageGet("members", []),
      storageGet("sessions", []),
      storageGet("admin-config", { password: DEFAULT_ADMIN_PASSWORD }),
    ]);
    setMembers(m);
    setSessions(s);
    setAdminPassword(a.password || DEFAULT_ADMIN_PASSWORD);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 6000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [refresh]);

  const persistMembers = async (next) => {
    setMembers(next);
    await storageSet("members", next);
  };
  const persistSessions = async (next) => {
    setSessions(next);
    await storageSet("sessions", next);
  };
  const persistAdminPassword = async (pw) => {
    setAdminPassword(pw);
    await storageSet("admin-config", { password: pw });
  };

  const activeSessions = sessions.filter((s) => !s.clockOut);

  const todaysSeconds = sessions.reduce((sum, s) => {
    if (dateKeyBangkok(s.clockIn) !== todayKeyBangkok()) return sum;
    if (s.clockOut) return sum + s.durationSeconds;
    return sum + (now - new Date(s.clockIn).getTime()) / 1000;
  }, 0);

  if (!loaded) {
    return (
      <div className="tc-root" style={{ padding: 60, textAlign: "center", color: "#9c8f66" }}>
        <GlobalStyle />
        กำลังโหลดข้อมูลสภา…
      </div>
    );
  }

  return (
    <div className="tc-root" style={{ padding: "28px 16px 60px" }}>
      <GlobalStyle />
      <div className="tc-bgfx" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 920, margin: "0 auto" }}>
        <Header
          view={view}
          setView={setView}
          onDutyCount={activeSessions.length}
          todaysSeconds={todaysSeconds}
        />

        {view === "home" ? (
          <HomeView
            members={members}
            sessions={sessions}
            activeSessions={activeSessions}
            now={now}
            persistSessions={persistSessions}
          />
        ) : (
          <AdminView
            members={members}
            sessions={sessions}
            adminPassword={adminPassword}
            persistMembers={persistMembers}
            persistSessions={persistSessions}
            persistAdminPassword={persistAdminPassword}
            now={now}
          />
        )}

        <footer style={{ textAlign: "center", marginTop: 40, color: "#5c5335", fontSize: 12, letterSpacing: "0.05em" }}>
          TOFFEE COUNCIL DUTY SYSTEM · Asia/Bangkok
        </footer>
      </div>
    </div>
  );
}

/* ---------------- header ---------------- */

function Header({ view, setView, onDutyCount, todaysSeconds }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div className="tc-seal">
          <span className="tc-mono" style={{ fontSize: 26, fontWeight: 900, color: "#f4d160" }}>TC</span>
        </div>
      </div>
      <h1
        className="tc-mono tc-glow-text"
        style={{
          fontSize: "clamp(28px, 6vw, 42px)",
          fontWeight: 900,
          letterSpacing: "0.08em",
          color: "#ffe600",
          margin: "0 0 4px",
        }}
      >
        TOFFEE COUNCIL
      </h1>
      <p style={{ color: "#b7a35f", fontSize: 14, letterSpacing: "0.08em", margin: "0 0 18px" }}>
        ระบบปฏิบัติหน้าที่สภา · DUTY CHECK-IN SYSTEM
      </p>

      <div
        className="tc-panel"
        style={{
          display: "inline-flex",
          gap: 22,
          alignItems: "center",
          padding: "10px 24px",
          borderRadius: 999,
          fontSize: 13.5,
          marginBottom: 18,
        }}
      >
        <span>
          <span className="tc-dot" style={{ marginRight: 7 }} />
          <b style={{ color: "#7cff6b" }}>{onDutyCount}</b> กำลังปฏิบัติหน้าที่
        </span>
        <span style={{ color: "#3a3320" }}>│</span>
        <span>
          วันนี้รวม <b className="tc-mono" style={{ color: "#f4d160" }}>{formatThaiDuration(todaysSeconds)}</b>
        </span>
      </div>

      <div>
        <span className={`tc-tab ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>
          👤 หน้าสมาชิก
        </span>
        <span style={{ display: "inline-block", width: 10 }} />
        <span className={`tc-tab ${view === "admin" ? "active" : ""}`} onClick={() => setView("admin")}>
          🔐 Admin
        </span>
      </div>
    </div>
  );
}

/* ---------------- home / member view ---------------- */

function HomeView({ members, sessions, activeSessions, now, persistSessions }) {
  const activeMembers = members.filter((m) => m.status === "active");
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError("");
  }, [selectedId]);

  const selectedMember = activeMembers.find((m) => m.id === selectedId);
  const mySession = selectedMember ? activeSessions.find((s) => s.memberId === selectedMember.id) : null;

  const handleClockIn = async () => {
    setError("");
    if (!selectedMember) { setError("กรุณาเลือกชื่อของคุณ"); return; }
    if (!pin) { setError("กรุณากรอกรหัสสมาชิก"); return; }
    if (selectedMember.pin !== pin) { setError("รหัสสมาชิกไม่ถูกต้อง"); return; }
    if (activeSessions.some((s) => s.memberId === selectedMember.id)) {
      setError("คุณกำลังเข้าเวรอยู่แล้ว");
      return;
    }
    setBusy(true);
    const session = {
      id: uid(),
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      clockIn: new Date().toISOString(),
      clockOut: null,
      durationSeconds: null,
      endedBy: null,
    };
    await persistSessions([session, ...sessions]);
    setPin("");
    setBusy(false);
  };

  const handleClockOut = async () => {
    setError("");
    if (!mySession) return;
    if (!pin) { setError("กรุณากรอกรหัสสมาชิกเพื่อออกเวร"); return; }
    if (selectedMember.pin !== pin) { setError("รหัสสมาชิกไม่ถูกต้อง"); return; }
    setBusy(true);
    const clockOut = new Date().toISOString();
    const durationSeconds = Math.floor((new Date(clockOut) - new Date(mySession.clockIn)) / 1000);
    const next = sessions.map((s) =>
      s.id === mySession.id ? { ...s, clockOut, durationSeconds, endedBy: "member" } : s
    );
    await persistSessions(next);
    setPin("");
    setBusy(false);
  };

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {/* check-in card */}
      <div className="tc-panel" style={{ padding: 28 }}>
        {mySession ? (
          <div style={{ textAlign: "center" }}>
            <div className="tc-badge on" style={{ marginBottom: 14, display: "inline-block" }}>
              <span className="tc-dot" style={{ marginRight: 6 }} />กำลังเข้าเวร
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 26, color: "#fff8d6" }}>{selectedMember.name}</h2>
            <p style={{ color: "#9c8f66", margin: "0 0 18px", fontSize: 13.5 }}>
              เริ่มเวลา {timeLabelBangkok(mySession.clockIn)}
            </p>
            <div
              className="tc-mono tc-glow-text"
              style={{ fontSize: "clamp(38px, 9vw, 58px)", fontWeight: 700, color: "#ffe600", letterSpacing: "0.04em" }}
            >
              {formatClock((now - new Date(mySession.clockIn).getTime()) / 1000)}
            </div>
            <p style={{ color: "#6b6142", fontSize: 11.5, letterSpacing: "0.08em", margin: "2px 0 22px" }}>
              ชั่วโมง : นาที : วินาที
            </p>

            <div style={{ maxWidth: 260, margin: "0 auto 14px" }}>
              <label className="tc-label">กรอกรหัสสมาชิกเพื่อออกเวร</label>
              <input
                className="tc-input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                style={{ textAlign: "center", letterSpacing: "0.3em" }}
              />
            </div>
            {error && <p style={{ color: "#ff8a73", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button className="tc-btn tc-btn-danger" disabled={busy} onClick={handleClockOut} style={{ minWidth: 180 }}>
              ออกเวร
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: 340, margin: "0 auto", textAlign: "center" }}>
            <div style={{ marginBottom: 6, color: "#7cff6b", fontSize: 14 }}>🟢 พร้อมปฏิบัติหน้าที่</div>
            <p style={{ color: "#9c8f66", fontSize: 13, margin: "0 0 20px" }}>เลือกชื่อและกรอกรหัสเพื่อเข้าเวร</p>

            <div style={{ textAlign: "left", marginBottom: 14 }}>
              <label className="tc-label">ชื่อสมาชิก</label>
              <select className="tc-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">— เลือกชื่อของคุณ —</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.position ? ` · ${m.position}` : ""}
                  </option>
                ))}
              </select>
              {activeMembers.length === 0 && (
                <p style={{ color: "#6b6142", fontSize: 12, marginTop: 8 }}>
                  ยังไม่มีรายชื่อสมาชิก — ให้ Admin เพิ่มชื่อในหลังบ้านก่อน
                </p>
              )}
            </div>

            <div style={{ textAlign: "left", marginBottom: 18 }}>
              <label className="tc-label">รหัสสมาชิก (PIN)</label>
              <input
                className="tc-input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                style={{ textAlign: "center", letterSpacing: "0.3em" }}
              />
            </div>

            {error && <p style={{ color: "#ff8a73", fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <button
              className="tc-btn tc-btn-primary"
              disabled={busy || !selectedId}
              onClick={handleClockIn}
              style={{ width: "100%", fontSize: 16 }}
            >
              เข้าเวร
            </button>
          </div>
        )}
      </div>

      {/* live public board */}
      <div className="tc-panel" style={{ padding: "20px 24px" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#f4d160", letterSpacing: "0.04em" }}>
          🟢 สมาชิกที่กำลังปฏิบัติหน้าที่
        </h3>
        {activeSessions.length === 0 ? (
          <p style={{ color: "#6b6142", fontSize: 13.5 }}>ยังไม่มีใครเข้าเวรในขณะนี้</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tc-table">
              <thead>
                <tr>
                  <th>สมาชิก</th>
                  <th>เข้าเวลา</th>
                  <th style={{ textAlign: "right" }}>ปฏิบัติมาแล้ว</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.memberName}</td>
                    <td>{timeLabelBangkok(s.clockIn)}</td>
                    <td className="tc-mono" style={{ textAlign: "right", color: "#f4d160" }}>
                      {formatThaiDuration((now - new Date(s.clockIn).getTime()) / 1000)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- admin view ---------------- */

function AdminView(props) {
  const { members, sessions, adminPassword, persistMembers, persistSessions, persistAdminPassword, now } = props;
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [loginError, setLoginError] = useState("");

  if (!authed) {
    return (
      <div className="tc-panel" style={{ padding: 32, maxWidth: 340, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#f4d160", textAlign: "center" }}>COUNCIL ADMIN</h2>
        <p style={{ color: "#6b6142", fontSize: 12.5, textAlign: "center", margin: "0 0 20px" }}>
          เข้าสู่ระบบหลังบ้าน
        </p>
        <label className="tc-label">รหัสผ่านผู้ดูแล</label>
        <input
          className="tc-input"
          type="password"
          value={pwInput}
          onChange={(e) => setPwInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (pwInput === adminPassword) { setAuthed(true); setLoginError(""); }
              else setLoginError("รหัสผ่านไม่ถูกต้อง");
            }
          }}
          style={{ marginBottom: 14 }}
        />
        {loginError && <p style={{ color: "#ff8a73", fontSize: 12.5, marginBottom: 12 }}>{loginError}</p>}
        <button
          className="tc-btn tc-btn-primary"
          style={{ width: "100%" }}
          onClick={() => {
            if (pwInput === adminPassword) { setAuthed(true); setLoginError(""); }
            else setLoginError("รหัสผ่านไม่ถูกต้อง");
          }}
        >
          เข้าสู่ระบบ
        </button>
        <p style={{ color: "#4a4327", fontSize: 11, textAlign: "center", marginTop: 14 }}>
          รหัสเริ่มต้น: council2026
        </p>
      </div>
    );
  }

  return (
    <AdminDashboard
      members={members}
      sessions={sessions}
      persistMembers={persistMembers}
      persistSessions={persistSessions}
      persistAdminPassword={persistAdminPassword}
      now={now}
      onLogout={() => { setAuthed(false); setPwInput(""); }}
    />
  );
}

function AdminDashboard({ members, sessions, persistMembers, persistSessions, persistAdminPassword, now, onLogout }) {
  const [tab, setTab] = useState("dashboard"); // dashboard | members | history | settings
  const activeSessions = sessions.filter((s) => !s.clockOut);
  const todaysSeconds = sessions.reduce((sum, s) => {
    if (dateKeyBangkok(s.clockIn) !== todayKeyBangkok()) return sum;
    if (s.clockOut) return sum + s.durationSeconds;
    return sum + (now - new Date(s.clockIn).getTime()) / 1000;
  }, 0);

  const forceClockOut = async (sessionId) => {
    const clockOut = new Date().toISOString();
    const next = sessions.map((s) => {
      if (s.id !== sessionId) return s;
      const durationSeconds = Math.floor((new Date(clockOut) - new Date(s.clockIn)) / 1000);
      return { ...s, clockOut, durationSeconds, endedBy: "admin" };
    });
    await persistSessions(next);
  };

  const tabs = [
    ["dashboard", "📊 Dashboard"],
    ["members", "👥 สมาชิก"],
    ["history", "📜 ประวัติ"],
    ["settings", "⚙️ ตั้งค่า"],
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map(([key, label]) => (
            <span key={key} className={`tc-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
            </span>
          ))}
        </div>
        <button className="tc-btn tc-btn-sm" onClick={onLogout}>ออกจากระบบ</button>
      </div>

      {tab === "dashboard" && (
        <DashboardTab
          members={members}
          activeSessions={activeSessions}
          todaysSeconds={todaysSeconds}
          now={now}
          forceClockOut={forceClockOut}
        />
      )}
      {tab === "members" && <MembersTab members={members} persistMembers={persistMembers} />}
      {tab === "history" && <HistoryTab members={members} sessions={sessions} />}
      {tab === "settings" && <SettingsTab persistAdminPassword={persistAdminPassword} />}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="tc-panel" style={{ padding: "18px 20px", flex: "1 1 140px" }}>
      <div style={{ fontSize: 12, color: "#9c8f66", marginBottom: 6 }}>{label}</div>
      <div className="tc-mono" style={{ fontSize: 26, fontWeight: 700, color: accent || "#f4d160" }}>{value}</div>
    </div>
  );
}

function DashboardTab({ members, activeSessions, todaysSeconds, now, forceClockOut }) {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="👥 สมาชิกทั้งหมด" value={members.filter((m) => m.status === "active").length} />
        <StatCard label="🟢 กำลังเข้าเวร" value={activeSessions.length} accent="#7cff6b" />
        <StatCard label="⏱️ วันนี้รวม" value={formatThaiDuration(todaysSeconds)} />
      </div>

      <div className="tc-panel" style={{ padding: "20px 24px" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#f4d160" }}>ผู้ที่กำลังเข้าเวร</h3>
        {activeSessions.length === 0 ? (
          <p style={{ color: "#6b6142", fontSize: 13.5 }}>ไม่มีสมาชิกเข้าเวรในขณะนี้</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tc-table">
              <thead>
                <tr><th>สมาชิก</th><th>เข้าเวลา</th><th>ปฏิบัติมาแล้ว</th><th></th></tr>
              </thead>
              <tbody>
                {activeSessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.memberName}</td>
                    <td>{timeLabelBangkok(s.clockIn)}</td>
                    <td className="tc-mono" style={{ color: "#f4d160" }}>
                      {formatThaiDuration((now - new Date(s.clockIn).getTime()) / 1000)}
                    </td>
                    <td>
                      <button className="tc-btn tc-btn-sm tc-btn-danger" onClick={() => forceClockOut(s.id)}>
                        บังคับออกเวร
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MembersTab({ members, persistMembers }) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("สมาชิกสภา");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const addMember = async () => {
    setError("");
    if (!name.trim()) { setError("กรุณากรอกชื่อ"); return; }
    if (!/^\d{4,6}$/.test(pin)) { setError("รหัส PIN ต้องเป็นตัวเลข 4-6 หลัก"); return; }
    const member = {
      id: uid(),
      name: name.trim(),
      position: position.trim() || "สมาชิกสภา",
      pin,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    await persistMembers([member, ...members]);
    setName(""); setPin("");
  };

  const toggleStatus = async (id) => {
    const next = members.map((m) => m.id === id ? { ...m, status: m.status === "active" ? "inactive" : "active" } : m);
    await persistMembers(next);
  };

  const updatePin = async (id, newPin) => {
    if (!/^\d{4,6}$/.test(newPin)) return;
    const next = members.map((m) => m.id === id ? { ...m, pin: newPin } : m);
    await persistMembers(next);
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="tc-panel" style={{ padding: "20px 24px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#f4d160" }}>เพิ่มสมาชิกใหม่</h3>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label className="tc-label">ชื่อ</label>
            <input className="tc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น นาย A" />
          </div>
          <div>
            <label className="tc-label">ตำแหน่ง</label>
            <select className="tc-select" value={position} onChange={(e) => setPosition(e.target.value)}>
              <option>สมาชิกสภา</option>
              <option>เลขานุการ</option>
              <option>ประธานสภา</option>
              <option>รองประธานสภา</option>
            </select>
          </div>
          <div>
            <label className="tc-label">PIN</label>
            <input className="tc-input" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="4-6 หลัก" />
          </div>
          <button className="tc-btn tc-btn-primary" onClick={addMember}>เพิ่มสมาชิก</button>
        </div>
        {error && <p style={{ color: "#ff8a73", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
      </div>

      <div className="tc-panel" style={{ padding: "20px 24px" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#f4d160" }}>รายชื่อสมาชิกทั้งหมด ({members.length})</h3>
        {members.length === 0 ? (
          <p style={{ color: "#6b6142", fontSize: 13.5 }}>ยังไม่มีสมาชิก</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tc-table">
              <thead>
                <tr><th>ชื่อ</th><th>ตำแหน่ง</th><th>PIN</th><th>สถานะ</th><th></th></tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td style={{ color: "#9c8f66" }}>{m.position}</td>
                    <td>
                      <input
                        className="tc-input"
                        style={{ width: 90, padding: "6px 10px" }}
                        defaultValue={m.pin}
                        onBlur={(e) => updatePin(m.id, e.target.value)}
                      />
                    </td>
                    <td>
                      <span className={`tc-badge ${m.status === "active" ? "on" : ""}`}>
                        {m.status === "active" ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td>
                      <button className="tc-btn tc-btn-sm" onClick={() => toggleStatus(m.id)}>
                        {m.status === "active" ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTab({ members, sessions }) {
  const [memberFilter, setMemberFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const filtered = sessions
    .filter((s) => Boolean(s.clockOut)) // only completed sessions
    .filter((s) => (memberFilter ? s.memberId === memberFilter : true))
    .filter((s) => (dateFilter ? dateKeyBangkok(s.clockIn) === dateFilter : true))
    .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));

  // group by date for a readable report
  const grouped = {};
  filtered.forEach((s) => {
    const key = dateKeyBangkok(s.clockIn);
    grouped[key] = grouped[key] || [];
    grouped[key].push(s);
  });
  const dateKeys = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="tc-panel" style={{ padding: "18px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label className="tc-label">ค้นหาสมาชิก</label>
            <select className="tc-select" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
              <option value="">ทุกคน</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="tc-label">วันที่</label>
            <input
              className="tc-input"
              type="date"
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <button className="tc-btn tc-btn-sm" onClick={() => { setMemberFilter(""); setDateFilter(""); }}>ล้างตัวกรอง</button>
        </div>
      </div>

      {dateKeys.length === 0 ? (
        <p style={{ color: "#6b6142", fontSize: 13.5, textAlign: "center" }}>ไม่พบประวัติการเข้าเวร</p>
      ) : (
        dateKeys.map((key) => {
          const daySessions = grouped[key];
          const dayTotal = daySessions.reduce((sum, s) => sum + s.durationSeconds, 0);
          return (
            <div key={key} className="tc-panel" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: 14.5, color: "#f4d160" }}>{dateLabelBangkok(key)}</h4>
                <span className="tc-mono" style={{ fontSize: 13, color: "#9c8f66" }}>รวม {formatThaiDuration(dayTotal)}</span>
              </div>
              <table className="tc-table">
                <thead>
                  <tr><th>สมาชิก</th><th>เข้า</th><th>ออก</th><th style={{ textAlign: "right" }}>รวม</th></tr>
                </thead>
                <tbody>
                  {daySessions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.memberName}</td>
                      <td>{timeLabelBangkok(s.clockIn)}</td>
                      <td>{timeLabelBangkok(s.clockOut)}{s.endedBy === "admin" ? " (admin)" : ""}</td>
                      <td className="tc-mono" style={{ textAlign: "right", color: "#f4d160" }}>{formatThaiDuration(s.durationSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}

function SettingsTab({ persistAdminPassword }) {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [msg, setMsg] = useState("");

  const save = async () => {
    setMsg("");
    if (newPw.length < 4) { setMsg("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"); return; }
    if (newPw !== confirmPw) { setMsg("รหัสผ่านไม่ตรงกัน"); return; }
    await persistAdminPassword(newPw);
    setMsg("เปลี่ยนรหัสผ่านสำเร็จ");
    setNewPw(""); setConfirmPw("");
  };

  return (
    <div className="tc-panel" style={{ padding: "20px 24px", maxWidth: 380 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#f4d160" }}>เปลี่ยนรหัสผ่าน Admin</h3>
      <label className="tc-label">รหัสผ่านใหม่</label>
      <input className="tc-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={{ marginBottom: 12 }} />
      <label className="tc-label">ยืนยันรหัสผ่าน</label>
      <input className="tc-input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} style={{ marginBottom: 14 }} />
      {msg && <p style={{ color: msg.includes("สำเร็จ") ? "#7cff6b" : "#ff8a73", fontSize: 12.5, marginBottom: 12 }}>{msg}</p>}
      <button className="tc-btn tc-btn-primary" onClick={save} style={{ width: "100%" }}>บันทึก</button>
    </div>
  );
}
