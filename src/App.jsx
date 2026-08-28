import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Shield, Clock, Users, Activity, BarChart3, Lock, 
  Terminal, Search, Radio, Maximize2, Minimize2, 
  LogOut, Key, UserPlus, UserCheck, UserX, ChevronRight, AlertCircle
} from 'lucide-react';

// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// ==========================================
// 2. UTILITY FUNCTIONS
// ==========================================
const formatDuration = (totalSeconds) => {
  if (!totalSeconds || totalSeconds < 0) return '00:00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map(v => String(v).padStart(2, '0')).join(':');
};

const getBangkokTime = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
};

const formatTimeBKK = (date) => {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// ==========================================
// 3. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  // --- States ---
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState('duty');
  const [currentTime, setCurrentTime] = useState(getBangkokTime());
  const [dbConnected, setDbConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // UI States
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [focusModeSession, setFocusModeSession] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  
  // Forms
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  // --- Clock Ticker (Asia/Bangkok) ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getBangkokTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Keyboard Shortcuts (Ctrl+K) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Toast Notification System ---
  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!supabase) return;
    try {
      // อ่านจาก View ที่ Claude สร้างไว้ (members_public) แทนตาราง members ตรงๆ
      const { data: membersData, error: mErr } = await supabase.from('members_public').select('*');
      if (mErr) throw mErr;
      setMembers(membersData || []);

      const { data: sessionsData, error: sErr } = await supabase.from('sessions').select('*').order('clock_in', { ascending: false });
      if (sErr) throw sErr;
      setSessions(sessionsData || []);

      setDbConnected(true);
    } catch (err) {
      console.error(err);
      setDbConnected(false);
      addToast('DATABASE CONNECTION FAILED', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
    if (!supabase) return;
    const channel = supabase.channel('council-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchData]);

  // --- Derived Data ---
  const activeSessions = useMemo(() => sessions.filter(s => !s.clock_out), [sessions]);
  const historySessions = useMemo(() => sessions.filter(s => s.clock_out), [sessions]);

  // --- Actions ---
  const handleClockIn = async () => {
    if (!selectedMemberId || !pinInput) return addToast('กรุณากรอกข้อมูลให้ครบ', 'warning');
    setLoading(true);
    try {
      // เรียกใช้ RPC function ที่คาดว่า Claude สร้างไว้สำหรับการเข้าเวร
      const { error } = await supabase.rpc('start_duty_session', {
        p_member_id: selectedMemberId,
        p_pin: pinInput
      });
      if (error) throw error;
      
      addToast('DUTY STARTED', 'success');
      setShowPinModal(false);
      setPinInput('');
      fetchData();
    } catch (err) {
      addToast('รหัส PIN ไม่ถูกต้อง หรือเกิดข้อผิดพลาด', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (sessionId, endedBy = 'member') => {
    setLoading(true);
    try {
      // เรียกใช้ RPC function สำหรับการออกเวร
      const { error } = await supabase.rpc('end_duty_session', {
        p_session_id: sessionId,
        p_ended_by: endedBy
      });
      if (error) throw error;
      
      addToast('DUTY COMPLETED', 'info');
      if (focusModeSession?.id === sessionId) setFocusModeSession(null);
      fetchData();
    } catch (err) {
      addToast('เกิดข้อผิดพลาดในการออกเวร', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // RENDER: FOCUS MODE (FIVEM OPTIMIZED)
  // ==========================================
  if (focusModeSession) {
    const clockInTime = new Date(focusModeSession.clock_in);
    const liveSecs = Math.max(0, Math.floor((currentTime - clockInTime) / 1000));

    return (
      <div className="fixed inset-0 bg-[#090a0f] flex flex-col items-center justify-center p-6 z-50 select-none">
        <button 
          onClick={() => setFocusModeSession(null)}
          className="absolute top-8 right-8 flex items-center gap-2 text-gray-500 hover:text-white transition"
        >
          <Minimize2 className="w-5 h-5" /> EXit FOCUS
        </button>
        <div className="text-center space-y-12 max-w-xl w-full">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white tracking-widest uppercase">TOFFEE COUNCIL</h1>
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#141722] border border-amber-500/30 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
              <span className="text-amber-400 text-sm font-bold tracking-widest">ON DUTY</span>
            </div>
          </div>
          
          <div className="relative w-80 h-80 mx-auto flex flex-col items-center justify-center rounded-full border border-amber-500/20 bg-[#0e1017] shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] before:absolute before:inset-[-2px] before:rounded-full before:border before:border-amber-500/40 before:opacity-50">
            <h2 className="text-2xl font-bold text-white mb-2">{focusModeSession.member_name}</h2>
            <span className="text-6xl font-mono font-bold text-amber-400 tracking-wider mb-2">
              {formatDuration(liveSecs)}
            </span>
            <span className="text-xs text-gray-500 font-mono tracking-widest">SINCE {formatTimeBKK(clockInTime)}</span>
          </div>

          <button
            onClick={() => handleClockOut(focusModeSession.id)}
            disabled={loading}
            className="w-full max-w-sm mx-auto py-4 bg-transparent hover:bg-red-950/40 border border-red-500/50 text-red-500 hover:text-red-400 font-bold tracking-widest rounded-none transition flex justify-center items-center gap-2"
          >
            <LogOut className="w-5 h-5" /> [ END DUTY ]
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN COMMAND CENTER UI
  // ==========================================
  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-200 font-sans selection:bg-amber-500/30">
      
      {/* TOASTS */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`p-4 border backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-bottom-5 ${
            t.type === 'error' ? 'bg-red-950/80 border-red-500/50 text-red-200' : 
            t.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' : 
            'bg-[#141722]/90 border-amber-500/50 text-amber-200'
          }`}>
            <Activity className="w-4 h-4" />
            <span className="text-sm font-mono uppercase tracking-wider">{t.msg}</span>
          </div>
        ))}
      </div>

      {/* HEADER */}
      <header className="border-b border-gray-800/80 bg-[#090a0f]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-sm font-bold text-white tracking-widest">TOFFEE COUNCIL</h1>
              <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Command Center</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-gray-400 tracking-wider">SYSTEM {dbConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <div className="text-right">
              <div className="text-amber-400 font-mono font-bold text-sm tracking-wider">{formatTimeBKK(currentTime)}</div>
              <div className="text-[10px] text-gray-500 font-mono">THAILAND (GMT+7)</div>
            </div>
            <button onClick={() => setCommandPaletteOpen(true)} className="flex items-center gap-2 bg-[#141722] border border-gray-800 px-3 py-1.5 hover:border-amber-500/50 transition group">
              <Terminal className="w-4 h-4 text-gray-400 group-hover:text-amber-400" />
              <kbd className="text-[10px] text-gray-500 font-mono">Ctrl+K</kbd>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* TABS */}
        <nav className="flex gap-1 border-b border-gray-800 mb-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'duty', icon: Clock, label: 'MEMBER PORTAL' },
            { id: 'monitor', icon: Radio, label: 'LIVE DUTY' },
            { id: 'history', icon: Activity, label: 'HISTORY' },
            { id: 'admin', icon: Lock, label: 'ADMINISTRATION' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-mono tracking-widest uppercase transition-all border-b-2 ${
                activeTab === tab.id 
                  ? 'border-amber-400 text-amber-400 bg-amber-500/5' 
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>

        {/* TAB 1: MEMBER PORTAL */}
        {activeTab === 'duty' && (
          <div className="max-w-md mx-auto mt-16">
            <div className="bg-[#0e1017] border border-gray-800 p-8 relative overflow-hidden shadow-2xl before:absolute before:inset-0 before:border-t before:border-amber-500/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
              
              <div className="text-center mb-8 relative z-10">
                <h2 className="text-xl font-bold text-white tracking-widest mb-2">COUNCIL IDENTIFICATION</h2>
                <p className="text-xs text-gray-500 font-mono">โปรดเลือกรายชื่อเพื่อเข้าสู่ระบบปฏิบัติหน้าที่</p>
              </div>

              <div className="space-y-6 relative z-10">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full bg-[#141722] border-b border-gray-700 px-4 py-4 text-white focus:outline-none focus:border-amber-400 transition font-mono text-sm appearance-none"
                >
                  <option value="">[ SELECT IDENTIFICATION ]</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} - {m.position}</option>
                  ))}
                </select>

                <button
                  onClick={() => selectedMemberId ? setShowPinModal(true) : addToast('SELECT MEMBER FIRST', 'error')}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-widest text-sm transition relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Key className="w-4 h-4" /> AUTHORIZE & CLOCK IN
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                </button>
              </div>

              {/* Active Duty Status for selected member */}
              {selectedMemberId && activeSessions.some(s => s.member_id === selectedMemberId) && (
                <div className="mt-6 p-4 border border-emerald-500/30 bg-emerald-950/20 text-center">
                  <p className="text-xs text-emerald-400 font-mono mb-3">STATUS: ALREADY ON DUTY</p>
                  <button
                    onClick={() => setFocusModeSession(activeSessions.find(s => s.member_id === selectedMemberId))}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 text-xs font-mono transition"
                  >
                    ENTER FOCUS MODE
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE DUTY MONITOR */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <h2 className="text-lg font-bold text-white tracking-widest flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-400 animate-pulse" /> LIVE SURVEILLANCE
              </h2>
              <span className="text-xs text-gray-500 font-mono">ACTIVE SESSIONS: {activeSessions.length}</span>
            </div>

            {activeSessions.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-gray-800">
                <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-mono tracking-widest">NO ACTIVE DUTY SESSIONS</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSessions.map(session => {
                  const clockIn = new Date(session.clock_in);
                  const secs = Math.max(0, Math.floor((currentTime - clockIn) / 1000));
                  return (
                    <div key={session.id} className="bg-[#0e1017] border border-gray-800 hover:border-amber-500/40 p-5 transition group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                      <div className="flex justify-between items-start mb-4 pl-3">
                        <div>
                          <h3 className="text-white font-bold">{session.member_name}</h3>
                          <p className="text-[10px] text-gray-500 font-mono">ID: {session.member_id.slice(0,8)}</p>
                        </div>
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> ON DUTY
                        </span>
                      </div>
                      
                      <div className="bg-[#090a0f] p-4 text-center border border-gray-800 mb-4 ml-3">
                        <span className="text-3xl font-bold font-mono text-white tracking-wider">{formatDuration(secs)}</span>
                      </div>

                      <div className="flex gap-2 ml-3">
                        <button onClick={() => setFocusModeSession(session)} className="flex-1 py-2 text-xs font-mono text-gray-400 bg-[#141722] hover:text-amber-400 transition">FOCUS</button>
                        <button onClick={() => handleClockOut(session.id, 'admin')} className="flex-1 py-2 text-xs font-mono text-red-400 bg-[#141722] hover:bg-red-950/40 transition">FORCE OUT</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* PIN MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1017] border border-amber-500/30 p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(212,175,55,0.1)]">
            <Lock className="w-8 h-8 text-amber-400 mx-auto mb-4" />
            <h3 className="text-white font-bold tracking-widest mb-1">AUTHORIZATION REQUIRED</h3>
            <p className="text-xs text-gray-500 font-mono mb-6">ENTER 4-DIGIT PIN</p>
            
            <input
              type="password"
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleClockIn()}
              className="w-full bg-[#090a0f] border-b-2 border-gray-700 focus:border-amber-400 text-center text-2xl text-white font-mono py-3 mb-6 focus:outline-none transition tracking-[1em]"
              maxLength={6}
            />
            
            <div className="flex gap-3">
              <button onClick={() => { setShowPinModal(false); setPinInput(''); }} className="flex-1 py-3 text-xs font-mono text-gray-400 hover:text-white border border-gray-800 transition">CANCEL</button>
              <button onClick={handleClockIn} disabled={loading} className="flex-1 py-3 text-xs font-mono text-black font-bold bg-amber-500 hover:bg-amber-400 transition">VERIFY</button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND PALETTE (CTRL+K) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-32">
          <div className="bg-[#0e1017] border border-gray-800 w-full max-w-lg shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex items-center gap-3">
              <Terminal className="w-5 h-5 text-amber-400" />
              <input 
                autoFocus 
                placeholder="Type a command or search..." 
                className="w-full bg-transparent text-white font-mono focus:outline-none text-sm placeholder-gray-600"
              />
            </div>
            <div className="p-2 text-xs font-mono">
              <p className="px-3 py-2 text-gray-600 mb-1">NAVIGATION</p>
              {[
                { label: 'OPEN PORTAL', tab: 'duty' },
                { label: 'VIEW LIVE SURVEILLANCE', tab: 'monitor' },
                { label: 'ACCESS HISTORY RECORDS', tab: 'history' },
              ].map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveTab(cmd.tab); setCommandPaletteOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-gray-400 hover:text-amber-400 hover:bg-[#141722] transition flex justify-between"
                >
                  {cmd.label} <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
