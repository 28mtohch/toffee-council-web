import { useState, useEffect, useRef, useCallback } from "react";

/* ---------------------------------------------------------
   TOFFEE COUNCIL — ระบบเข้าเวรสภา (Optimized & Focus Mode)
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
      min-height: 100vh;
      position: relative;
    }
    .tc-mono { font-family: 'Orbitron', 'Kanit', sans-serif; }

    .tc-bgfx {
      position: fixed;
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
    .tc-btn-danger { border-color: var(--danger); color: #ffb3a3; }
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
    .tc-input:focus { border-color: var(--neon); box-shadow: 0 0 0 3px rgba(255,230,0,0.15); }
    
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
    
    .tc-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .tc-table th { text-align: left; color: var(--text-dim); padding: 8px 10px; border-bottom: 1px solid var(--line); }
    .tc-table td { padding: 10px 10px; border-bottom: 1px solid rgba(212,175,55,0.10); }
    
    .tc-tab { padding: 9px 18px; border-radius: 999px; cursor: pointer; font-weight: 500; color: var(--text-dim); }
    .tc-tab.active { color: #1a1400; background: var(--neon); font-weight: 700; box-shadow: 0 0 16px var(--neon-soft); }
    .tc-badge.on { color: var(--ok); border-color: rgba(124,255,107,0.35); background: rgba(124,255,107,0.06); }
    
    /* Focus Mode Modal */
    .tc-focus-overlay {
      position: fixed; inset: 0; background: rgba(5,4,3,0.95);
      z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center;
      backdrop-filter: blur(8px);
    }
  `}</style>
);

/* ---------------- Optimized Timer Component ---------------- */
// แยกออกมาเพื่อไม่ให้ Component หลัก Re-render ทุกวินาที
function LiveTimer({ startTime, className, style }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const tick = () => {
      setSeconds((Date.now() - new Date(startTime).getTime()) / 1000);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className={className} style={style}>{formatClock(seconds)}</span>;
}

/* ---------------- main app ---------------- */

export default function ToffeeCouncil() {
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [adminPassword, setAdminPassword] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("home"); 
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
    return () => clearInterval(poll);
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
  
  // คำนวณเวลาเริ่มต้นของวันนี้ (ใช้เวลาคร่าวๆ ไม่ต้อง re-render ทุกวิ)
  const todaysStaticSeconds = sessions.reduce((sum, s) => {
    if (dateKeyBangkok(s.clockIn) !== todayKeyBangkok()) return sum;
    if (s.clockOut) return sum + s.durationSeconds;
    return sum + (Date.now() - new Date(s.clockIn).getTime()) / 1000;
  }, 0);

  if (!loaded) return <div className="tc-root" style={{ padding: 60, textAlign: "center" }}><GlobalStyle />กำลังโหลด...</div>;

  return (
    <div className="tc-root" style={{ padding: "28px 16px 60px" }}>
      <GlobalStyle />
      <div className="tc-bgfx" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 920, margin: "0 auto" }}>
        <Header
          view={view}
          setView={setView}
          onDutyCount={activeSessions.length}
          todaysSeconds={todaysStaticSeconds}
        />

        {view === "home" ? (
          <HomeView
            members={members}
            sessions={sessions}
            activeSessions={activeSessions}
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
          />
        )}
      </div>
    </div>
  );
}

/* ---------------- header ---------------- */

function Header({ view, setView, onDutyCount, todaysSeconds }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div className="tc-seal"><span className="tc-mono" style={{ fontSize: 26, fontWeight: 900, color: "#f4d160" }}>TC</span></div>
      </div>
      <h1 className="tc-mono tc-glow-text" style={{ fontSize: "clamp(28px, 6vw, 42px)", fontWeight: 900, color: "#ffe600", margin: "0 0 4px" }}>
        TOFFEE COUNCIL
      </h1>
      
      <div className="tc-panel" style={{ display: "inline-flex", gap: 22, alignItems: "center", padding: "10px 24px", borderRadius: 999, fontSize: 13.5, margin: "18px 0" }}>
        <span><span className="tc-dot" style={{ marginRight: 7 }} /><b style={{ color: "#7cff6b" }}>{onDutyCount}</b> กำลังปฏิบัติหน้าที่</span>
      </div>

      <div>
        <span className={`tc-tab ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>👤 หน้าสมาชิก</span>
        <span style={{ display: "inline-block", width: 10 }} />
        <span className={`tc-tab ${view === "admin" ? "active" : ""}`} onClick={() => setView("admin")}>🔐 Admin</span>
      </div>
    </div>
  );
}

/* ---------------- home / member view ---------------- */

function HomeView({ members, sessions, activeSessions, persistSessions }) {
  const activeMembers = members.filter((m) => m.status === "active");
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => { setError(""); }, [selectedId]);

  const selectedMember = activeMembers.find((m) => m.id === selectedId);
  const mySession = selectedMember ? activeSessions.find((s) => s.memberId === selectedMember.id) : null;

  const handleClockIn = async () => {
    setError("");
    if (!selectedMember) { setError("กรุณาเลือกชื่อของคุณ"); return; }
    if (!pin) { setError("กรุณากรอกรหัสสมาชิก"); return; }
    if (selectedMember.pin !== pin) { setError("รหัสสมาชิกไม่ถูกต้อง"); return; }
    
    setBusy(true);
    const session = {
      id: uid(),
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      clockIn: new Date().toISOString(),
      clockOut: null,
      durationSeconds: null,
    };
    await persistSessions([session, ...sessions]);
    setPin("");
    setBusy(false);
  };

  const handleClockOut = async () => {
    setError("");
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
    setSelectedId(""); // Clear selection after clock out
    setIsFocusMode(false);
    setBusy(false);
  };

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {/* Focus Mode Overlay */}
      {isFocusMode && mySession && (
        <div className="tc-focus-overlay">
           <div className="tc-badge on" style={{ marginBottom: 20 }}><span className="tc-dot" /> ปฏิบัติหน้าที่</div>
           <h2 style={{ fontSize: 36, color: "#fff8d6", margin: "0 0 10px" }}>{selectedMember.name}</h2>
           <LiveTimer 
             startTime={mySession.clockIn} 
             className="tc-mono tc-glow-text" 
             style={{ fontSize: "clamp(60px, 15vw, 120px)", fontWeight: 900, color: "#ffe600" }} 
           />
           <button className="tc-btn tc-btn-primary" style={{ marginTop: 40 }} onClick={() => setIsFocusMode(false)}>
             ย่อหน้าจอ
           </button>
        </div>
      )}

      {/* check-in card */}
      <div className="tc-panel" style={{ padding: 28 }}>
        {mySession ? (
          <div style={{ textAlign: "center" }}>
            <div className="tc-badge on" style={{ marginBottom: 14, display: "inline-block" }}>
              <span className="tc-dot" style={{ marginRight: 6 }} />กำลังเข้าเวร
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 26, color: "#fff8d6" }}>{selectedMember.name}</h2>
            <p style={{ color: "#9c8f66", margin: "0 0 18px", fontSize: 13.5 }}>เริ่มเวลา {timeLabelBangkok(mySession.clockIn)}</p>
            
            <LiveTimer 
              startTime={mySession.clockIn} 
              className="tc-mono tc-glow-text" 
              style={{ fontSize: "clamp(38px, 9vw, 58px)", fontWeight: 700, color: "#ffe600", display: "block" }} 
            />
            <p style={{ color: "#6b6142", fontSize: 11.5, letterSpacing: "0.08em", margin: "2px 0 22px" }}>ชั่วโมง : นาที : วินาที</p>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
              <button className="tc-btn" onClick={() => setIsFocusMode(true)}>🔍 Focus Mode</button>
            </div>

            <div style={{ maxWidth: 260, margin: "0 auto 14px", paddingTop: 20, borderTop: "1px solid var(--line)" }}>
              <label className="tc-label">กรอกรหัสสมาชิกเพื่อออกเวร</label>
              <input
                className="tc-input" type="password" inputMode="numeric" maxLength={6}
                value={pin} onChange={(e) => setPin(e.target.value)}
                style={{ textAlign: "center", letterSpacing: "0.3em" }}
              />
            </div>
            {error && <p style={{ color: "#ff8a73", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button className="tc-btn tc-btn-danger" disabled={busy} onClick={handleClockOut} style={{ minWidth: 180 }}>
              ออกเวร
            </button>
          </div>
        ) : (
          /* Clock In Form */
          <div style={{ maxWidth: 340, margin: "0 auto", textAlign: "center" }}>
            <div style={{ marginBottom: 6, color: "#7cff6b", fontSize: 14 }}>🟢 พร้อมปฏิบัติหน้าที่</div>
            
            <div style={{ textAlign: "left", marginBottom: 14, marginTop: 20 }}>
              <label className="tc-label">ชื่อสมาชิก</label>
              <select className="tc-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">— เลือกชื่อของคุณ —</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} {m.position ? `· ${m.position}` : ""}</option>
                ))}
              </select>
            </div>

            <div style={{ textAlign: "left", marginBottom: 18 }}>
              <label className="tc-label">รหัสสมาชิก (PIN)</label>
              <input
                className="tc-input" type="password" inputMode="numeric" maxLength={6}
                value={pin} onChange={(e) => setPin(e.target.value)}
                style={{ textAlign: "center", letterSpacing: "0.3em" }}
              />
            </div>
            {error && <p style={{ color: "#ff8a73", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button className="tc-btn tc-btn-primary" disabled={busy || !selectedId} onClick={handleClockIn} style={{ width: "100%", fontSize: 16 }}>
              เข้าเวร
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- admin view (ย่อส่วนที่ไม่ได้แก้ไข) ---------------- */
function AdminView(props) {
  /* โค้ดเดิมของฝั่ง Admin ที่คุณให้มา สามารถใช้งานต่อได้เลยครับ โดยประสิทธิภาพจะดีขึ้นจากการแยก LiveTimer ไปแล้ว */
  // ... (ใส่เนื้อหา AdminDashboard และ Component ย่อยของ Admin ตามต้นฉบับได้เลยครับ)
  return <div style={{textAlign: "center", padding: 40}}>หน้า Admin พร้อมใช้งานร่วมกับระบบ Optimized Timer แล้ว</div>;
}
