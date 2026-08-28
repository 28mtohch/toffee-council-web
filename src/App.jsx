import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Shield,
  Clock,
  User,
  Users,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  LogOut,
  Key,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  BarChart3,
  Activity,
  Award,
  Terminal,
  X,
  Radio,
  Sparkles,
  Lock,
  Unlock,
  RefreshCw,
  UserPlus,
  UserCheck,
  UserX,
  ChevronRight
} from 'lucide-react';

// ==========================================
// SUPABASE CLIENT INITIALIZATION
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const formatDuration = (totalSeconds) => {
  if (!totalSeconds || totalSeconds < 0) return '00:00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map(v => String(v).padStart(2, '0')).join(':');
};

const formatBangkokTime = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
};

const formatBangkokDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date).toUpperCase();
};

export default function App() {
  // ------------------------------------------
  // STATES
  // ------------------------------------------
  const [members, setMembers] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [historySessions, setHistorySessions] = useState([]);
  const [adminConfig, setAdminConfig] = useState({ password: 'council2026' });

  // App UI States
  const [activeTab, setActiveTab] = useState('duty'); // 'duty' | 'monitor' | 'history' | 'analytics' | 'admin'
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [focusModeSession, setFocusModeSession] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  // Selection & Forms
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPosition, setNewMemberPosition] = useState('สมาชิกสภา');
  const [newMemberPin, setNewMemberPin] = useState('');
  
  // System Health & Loading
  const [dbConnected, setDbConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Filters & Search
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterMember, setHistoryFilterMember] = useState('all');

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // ------------------------------------------
  // DIGITAL CLOCK TICKER
  // ------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ------------------------------------------
  // KEYBOARD SHORTCUT (CTRL + K)
  // ------------------------------------------
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

  // ------------------------------------------
  // DATA FETCHING & REALTIME SUBSCRIPTIONS
  // ------------------------------------------
  const fetchData = useCallback(async () => {
    if (!supabase) {
      setDbConnected(false);
      return;
    }

    try {
      // 1. Members
      const { data: membersData, error: mErr } = await supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true });
      if (mErr) throw mErr;
      setMembers(membersData || []);

      // 2. Active Sessions (clock_out is null)
      const { data: activeData, error: aErr } = await supabase
        .from('sessions')
        .select('*')
        .is('clock_out', null)
        .order('clock_in', { ascending: false });
      if (aErr) throw aErr;
      setActiveSessions(activeData || []);

      // 3. History Sessions (clock_out is not null)
      const { data: historyData, error: hErr } = await supabase
        .from('sessions')
        .select('*')
        .not('clock_out', 'is', null)
        .order('clock_in', { ascending: false })
        .limit(100);
      if (hErr) throw hErr;
      setHistorySessions(historyData || []);

      // 4. Admin Config
      const { data: adminData } = await supabase
        .from('admin_config')
        .select('*')
        .eq('id', 1)
        .single();
      if (adminData) setAdminConfig(adminData);

      setDbConnected(true);
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setDbConnected(false);
      addToast('ไม่สามารถเชื่อมต่อฐานข้อมูล Supabase ได้', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();

    if (!supabase) return;

    // Realtime channel
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // ------------------------------------------
  // DUTY LOGIC (CLOCK IN / CLOCK OUT)
  // ------------------------------------------
  const handleClockIn = async () => {
    if (!selectedMemberId) {
      addToast('กรุณาเลือกสมาชิกก่อนเข้าเวร', 'warning');
      return;
    }

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    if (member.status === 'inactive') {
      addToast('สมาชิกท่านนี้ถูกระงับสิทธิ์การปฏิบัติหน้าที่', 'error');
      return;
    }

    if (!pinInput) {
      addToast('กรุณากรอกรหัส PIN', 'warning');
      return;
    }

    if (member.pin !== pinInput) {
      addToast('รหัส PIN ไม่ถูกต้อง', 'error');
      return;
    }

    // Check if already active
    const alreadyActive = activeSessions.find(s => s.member_id === member.id);
    if (alreadyActive) {
      addToast('สมาชิกท่านนี้กำลังปฏิบัติหน้าที่อยู่แล้ว', 'warning');
      setPinModalOpen(false);
      setPinInput('');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([{
          member_id: member.id,
          member_name: member.name,
          clock_in: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      addToast(`● [ON DUTY] ${member.name} เริ่มปฏิบัติหน้าที่เรียบร้อย`, 'success');
      setPinModalOpen(false);
      setPinInput('');
      fetchData();
    } catch (err) {
      addToast('เกิดข้อผิดพลาดในการบันทึกเวลาเข้าเวร: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (sessionId, endedBy = 'member') => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) return;

    setLoading(true);
    try {
      const clockOutTime = new Date();
      const clockInTime = new Date(session.clock_in);
      const durationSeconds = Math.max(0, Math.floor((clockOutTime - clockInTime) / 1000));

      const { error } = await supabase
        .from('sessions')
        .update({
          clock_out: clockOutTime.toISOString(),
          duration_seconds: durationSeconds,
          ended_by: endedBy
        })
        .eq('id', sessionId);

      if (error) throw error;

      addToast(`OFF DUTY: ${session.member_name} ออกจากเวรแล้ว (${formatDuration(durationSeconds)})`, 'info');
      if (focusModeSession?.id === sessionId) setFocusModeSession(null);
      fetchData();
    } catch (err) {
      addToast('เกิดข้อผิดพลาดในการบันทึกเวลาออกเวร: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------
  // ADMIN & MEMBER MANAGEMENT LOGIC
  // ------------------------------------------
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasswordInput === adminConfig.password) {
      setIsAdminLoggedIn(true);
      addToast('เข้าสู่ระบบแอดมินสำเร็จ', 'success');
      setAdminPasswordInput('');
    } else {
      addToast('รหัสผ่านแอดมินไม่ถูกต้อง', 'error');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName || !newMemberPin) {
      addToast('กรุณากรอกข้อมูลสมาชิกให้ครบถ้วน', 'warning');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('members').insert([{
        name: newMemberName,
        position: newMemberPosition || 'สมาชิกสภา',
        pin: newMemberPin,
        status: 'active'
      }]);

      if (error) throw error;

      addToast(`เพิ่มสมาชิก ${newMemberName} สำเร็จ`, 'success');
      setNewMemberName('');
      setNewMemberPin('');
      fetchData();
    } catch (err) {
      addToast('ไม่สามารถเพิ่มสมาชิกได้: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberStatus = async (memberId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('members')
        .update({ status: newStatus })
        .eq('id', memberId);

      if (error) throw error;
      addToast(`อัปเดตสถานะเป็น ${newStatus.toUpperCase()} สำเร็จ`, 'info');
      fetchData();
    } catch (err) {
      addToast('ไม่สามารถเปลี่ยนสถานะได้: ' + err.message, 'error');
    }
  };

  // ------------------------------------------
  // COMPUTED STATS & ANALYTICS
  // ------------------------------------------
  const stats = useMemo(() => {
    const totalMembers = members.length;
    const activeDutyCount = activeSessions.length;
    
    // Calculate Today's Hours
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = historySessions.filter(s => s.clock_in?.startsWith(todayStr));
    const todayTotalSeconds = todaySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

    // Calculate Month's Hours
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthSessions = historySessions.filter(s => {
      const d = new Date(s.clock_in);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthTotalSeconds = monthSessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

    // Leaderboard
    const memberHoursMap = {};
    historySessions.forEach(s => {
      memberHoursMap[s.member_name] = (memberHoursMap[s.member_name] || 0) + (s.duration_seconds || 0);
    });
    const leaderboard = Object.entries(memberHoursMap)
      .map(([name, sec]) => ({ name, sec }))
      .sort((a, b) => b.sec - a.sec)
      .slice(0, 5);

    return {
      totalMembers,
      activeDutyCount,
      todayHoursFormatted: (todayTotalSeconds / 3600).toFixed(1) + ' ชม.',
      monthHoursFormatted: (monthTotalSeconds / 3600).toFixed(1) + ' ชม.',
      leaderboard
    };
  }, [members, activeSessions, historySessions]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historySessions.filter(s => {
      const matchesSearch = s.member_name.toLowerCase().includes(historySearch.toLowerCase());
      const matchesMember = historyFilterMember === 'all' || s.member_id === historyFilterMember;
      return matchesSearch && matchesMember;
    });
  }, [historySessions, historySearch, historyFilterMember]);

  // ==========================================
  // RENDER: FOCUS MODE (FIVEM OPTIMIZED)
  // ==========================================
  if (focusModeSession) {
    const clockInTime = new Date(focusModeSession.clock_in);
    const liveSecs = Math.max(0, Math.floor((currentTime - clockInTime) / 1000));

    return (
      <div className="fixed inset-0 bg-[#090a0f] text-white flex flex-col items-center justify-center p-6 z-50 select-none">
        <div className="absolute top-6 right-6">
          <button
            onClick={() => setFocusModeSession(null)}
            className="flex items-center gap-2 bg-[#1a1d2b] hover:bg-[#25293c] text-gray-400 hover:text-white px-4 py-2 rounded-lg border border-gray-800 transition"
          >
            <Minimize2 className="w-4 h-4" />
            <span>ออกจาก Focus Mode</span>
          </button>
        </div>

        <div className="text-center space-y-8 max-w-lg w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold tracking-widest uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            ON DUTY — FULL FOCUS MODE
          </div>

          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">{focusModeSession.member_name}</h1>
            <p className="text-amber-400/80 font-mono text-sm mt-1">ปฏิบัติหน้าที่ตั้งแต่ {formatBangkokTime(clockInTime)} น.</p>
          </div>

          {/* TIMER RING */}
          <div className="relative w-72 h-72 mx-auto flex items-center justify-center rounded-full bg-[#12141d] border-4 border-amber-500/30 shadow-[0_0_50px_rgba(212,175,55,0.15)]">
            <div className="text-center">
              <span className="block text-gray-500 text-xs tracking-widest uppercase font-mono mb-1">LIVE DURATION</span>
              <span className="text-5xl font-extrabold font-mono text-amber-400 tracking-wider">
                {formatDuration(liveSecs)}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleClockOut(focusModeSession.id)}
            disabled={loading}
            className="w-full py-4 bg-red-600/90 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-950/50 transition border border-red-500/30 text-lg flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span>บันทึกออกเวร (END DUTY)</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN COMMAND CENTER UI
  // ==========================================
  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-200 font-sans antialiased selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* TOAST NOTIFICATION CONTAINER */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-up ${
              toast.type === 'error' ? 'bg-red-950/90 border-red-500/40 text-red-200' :
              toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200' :
              toast.type === 'warning' ? 'bg-amber-950/90 border-amber-500/40 text-amber-200' :
              'bg-[#161925]/90 border-amber-500/30 text-gray-200'
            }`}
          >
            <Activity className="w-5 h-5 shrink-0 text-amber-400" />
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* HEADER COMMAND BAR */}
      <header className="sticky top-0 z-40 bg-[#0e1017]/90 backdrop-blur-md border-b border-amber-500/15 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* LOGO & TITLE */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <div className="w-full h-full bg-[#090a0f] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">TOFFEE COUNCIL</h1>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded">COMMAND CENTER</span>
              </div>
              <p className="text-xs text-gray-500 font-mono">DUTY & ATTENDANCE MANAGEMENT SYSTEM</p>
            </div>
          </div>

          {/* DIGITAL CLOCK & SYSTEM HEALTH */}
          <div className="flex items-center gap-4 text-xs font-mono">
            {/* Realtime Thailand Clock */}
            <div className="bg-[#141722] border border-gray-800 rounded-lg px-3 py-1.5 flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <span className="text-amber-400 font-bold tracking-wider">{formatBangkokTime(currentTime)}</span>
                <span className="text-gray-500 block text-[10px]">{formatBangkokDate(currentTime)}</span>
              </div>
            </div>

            {/* Database Connection Badge */}
            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
              dbConnected 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-950/40 border-red-500/30 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`} />
              <span className="font-semibold uppercase tracking-wider">{dbConnected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}</span>
            </div>

            {/* Command Palette Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 bg-[#141722] hover:bg-[#1e2233] border border-gray-800 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>CMD</span>
              <kbd className="bg-gray-900 border border-gray-700 px-1.5 py-0.5 text-[10px] rounded text-gray-400">Ctrl+K</kbd>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-gray-800/80 pb-3 overflow-x-auto scrollbar-none">
          {[
            { id: 'duty', label: 'เข้าเวร / ปฏิบัติหน้าที่', icon: Clock },
            { id: 'monitor', label: `คนเข้าเวรอยู่ (${activeSessions.length})`, icon: Radio },
            { id: 'history', label: 'ประวัติการเข้าเวร', icon: Activity },
            { id: 'analytics', label: 'รายงาน & สถิติ', icon: BarChart3 },
            { id: 'admin', label: 'ผู้ดูแลระบบ (Admin)', icon: Lock }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                    : 'bg-[#12141d]/60 hover:bg-[#181b28] border border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-gray-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================== */}
        {/* TAB 1: MEMBER DUTY CLOCK-IN                */}
        {/* ========================================== */}
        {activeTab === 'duty' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* MEMBER SELECTION CARD */}
            <div className="lg:col-span-2 bg-[#12141d] border border-amber-500/20 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-amber-400" />
                    ลงชื่อเข้าเวรปฏิบัติหน้าที่
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">เลือกรายชื่อของคุณและป้อนรหัส PIN เพื่อลงเวลาเข้าเวร</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
                  {members.filter(m => m.status === 'active').length} สมาชิกพร้อมใช้งาน
                </span>
              </div>

              {/* MEMBER DROPDOWN */}
              <div className="space-y-3">
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-400">เลือกรายชื่อสมาชิกสภา</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full bg-[#1a1d2b] border border-gray-700 focus:border-amber-400 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                >
                  <option value="">-- กรุณาเลือกรายชื่อสมาชิก --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id} disabled={m.status === 'inactive'}>
                      {m.name} ({m.position}) {m.status === 'inactive' ? '[ถูกระงับ]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* CLOCK IN BUTTON */}
              <button
                onClick={() => {
                  if (!selectedMemberId) {
                    addToast('กรุณาเลือกรายชื่อสมาชิกก่อน', 'warning');
                    return;
                  }
                  setPinModalOpen(true);
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-xl shadow-lg shadow-amber-500/10 transition transform active:scale-[0.99] flex items-center justify-center gap-2 text-base"
              >
                <Key className="w-5 h-5" />
                <span>ยืนยันรหัส PIN และเริ่มเข้าเวร (CLOCK IN)</span>
              </button>

              {/* CURRENT MEMBER ACTIVE STATUS IF ON DUTY */}
              {selectedMemberId && activeSessions.some(s => s.member_id === selectedMemberId) && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-sm text-amber-300 font-medium">คุณกำลังอยู่ระหว่างการปฏิบัติหน้าที่</span>
                  </div>
                  <button
                    onClick={() => {
                      const sess = activeSessions.find(s => s.member_id === selectedMemberId);
                      if (sess) setFocusModeSession(sess);
                    }}
                    className="px-3 py-1.5 bg-amber-400 text-black font-bold text-xs rounded-lg hover:bg-amber-300 transition"
                  >
                    เปิด Focus Mode
                  </button>
                </div>
              )}
            </div>

            {/* QUICK STATS SIDE PANEL */}
            <div className="space-y-4">
              <div className="bg-[#12141d] border border-gray-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  COMMAND SUMMARY
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#181b28] p-3.5 rounded-xl border border-gray-800">
                    <span className="text-gray-500 text-[10px] font-mono block">กำลังปฏิบัติหน้าที่</span>
                    <span className="text-2xl font-bold font-mono text-emerald-400">{stats.activeDutyCount}</span>
                  </div>
                  <div className="bg-[#181b28] p-3.5 rounded-xl border border-gray-800">
                    <span className="text-gray-500 text-[10px] font-mono block">สมาชิกทั้งหมด</span>
                    <span className="text-2xl font-bold font-mono text-white">{stats.totalMembers}</span>
                  </div>
                  <div className="bg-[#181b28] p-3.5 rounded-xl border border-gray-800">
                    <span className="text-gray-500 text-[10px] font-mono block">ชั่วโมงวันนี้</span>
                    <span className="text-xl font-bold font-mono text-amber-400">{stats.todayHoursFormatted}</span>
                  </div>
                  <div className="bg-[#181b28] p-3.5 rounded-xl border border-gray-800">
                    <span className="text-gray-500 text-[10px] font-mono block">ชั่วโมงเดือนนี้</span>
                    <span className="text-xl font-bold font-mono text-amber-400">{stats.monthHoursFormatted}</span>
                  </div>
                </div>
              </div>

              {/* LEADERBOARD BRIEF */}
              <div className="bg-[#12141d] border border-gray-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  TOP DUTY HOURS
                </h3>
                <div className="space-y-2">
                  {stats.leaderboard.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-2">ยังไม่มีข้อมูลประวัติการปฏิบัติหน้าที่</p>
                  ) : (
                    stats.leaderboard.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800/60 last:border-0">
                        <span className="text-gray-300 font-medium">{idx + 1}. {item.name}</span>
                        <span className="font-mono text-amber-400 font-bold">{formatDuration(item.sec)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: LIVE DUTY MONITOR                   */}
        {/* ========================================== */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                  LIVE DUTY MONITORING
                </h2>
                <p className="text-xs text-gray-400 mt-1">รายชื่อสมาชิกที่กำลังปฏิบัติหน้าที่อยู่ ณ ขณะนี้</p>
              </div>
              <button
                onClick={fetchData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141722] hover:bg-[#1c2030] border border-gray-800 rounded-lg text-xs text-gray-400 hover:text-white transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>รีเฟรชข้อมูล</span>
              </button>
            </div>

            {activeSessions.length === 0 ? (
              <div className="bg-[#12141d] border border-gray-800 rounded-2xl p-12 text-center space-y-3">
                <Shield className="w-12 h-12 text-gray-600 mx-auto opacity-50" />
                <h3 className="text-base font-semibold text-gray-400">NO ACTIVE DUTY</h3>
                <p className="text-xs text-gray-600">ขณะนี้ไม่มีสมาชิกปฏิบัติหน้าที่ในระบบ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSessions.map(session => {
                  const clockInTime = new Date(session.clock_in);
                  const liveSecs = Math.max(0, Math.floor((currentTime - clockInTime) / 1000));

                  return (
                    <div
                      key={session.id}
                      className="bg-[#12141d] border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-6 space-y-5 transition-all shadow-xl relative overflow-hidden group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                          <div>
                            <h3 className="text-lg font-bold text-white">{session.member_name}</h3>
                            <span className="text-xs text-gray-500 font-mono">เริ่มเมื่อ {formatBangkokTime(clockInTime)} น.</span>
                          </div>
                        </div>
                      </div>

                      {/* TIMER DISPLAY CARD */}
                      <div className="bg-[#090a0f] border border-gray-800 rounded-xl p-4 text-center">
                        <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase block mb-1">LIVE DURATION</span>
                        <span className="text-3xl font-extrabold font-mono text-amber-400 tracking-wider">
                          {formatDuration(liveSecs)}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setFocusModeSession(session)}
                          className="flex-1 py-2.5 bg-[#1a1d2b] hover:bg-[#24283b] text-amber-400 font-semibold text-xs rounded-xl border border-amber-500/20 transition flex items-center justify-center gap-1.5"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Focus Mode</span>
                        </button>

                        <button
                          onClick={() => handleClockOut(session.id)}
                          disabled={loading}
                          className="flex-1 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 font-semibold text-xs rounded-xl border border-red-500/30 transition flex items-center justify-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>ออกเวร</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: DUTY HISTORY TABLE                  */}
        {/* ========================================== */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  DUTY RECORDS & HISTORY
                </h2>
                <p className="text-xs text-gray-400 mt-1">ประวัติการปฏิบัติหน้าที่ทั้งหมดในระบบ</p>
              </div>

              {/* SEARCH & FILTERS */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อสมาชิก..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="bg-[#12141d] border border-gray-800 focus:border-amber-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none transition w-48"
                  />
                </div>

                <select
                  value={historyFilterMember}
                  onChange={(e) => setHistoryFilterMember(e.target.value)}
                  className="bg-[#12141d] border border-gray-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition"
                >
                  <option value="all">สมาชิกทั้งหมด</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* TABLE */}
            <div className="bg-[#12141d] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#181b28] text-gray-400 font-mono uppercase tracking-wider text-[10px] border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-4">สมาชิก</th>
                      <th className="px-6 py-4">เข้าเวร (Clock In)</th>
                      <th className="px-6 py-4">ออกเวร (Clock Out)</th>
                      <th className="px-6 py-4">รวมระยะเวลา</th>
                      <th className="px-6 py-4">ทำรายการโดย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-600">
                          ไม่พบประวัติการเข้าเวรตามเงื่อนไขที่เลือก
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map(session => (
                        <tr key={session.id} className="hover:bg-[#161925] transition">
                          <td className="px-6 py-4 font-sans font-semibold text-white">
                            {session.member_name}
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {new Date(session.clock_in).toLocaleString('th-TH')}
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {session.clock_out ? new Date(session.clock_out).toLocaleString('th-TH') : '-'}
                          </td>
                          <td className="px-6 py-4 text-amber-400 font-bold">
                            {formatDuration(session.duration_seconds || 0)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-sans ${
                              session.ended_by === 'admin' 
                                ? 'bg-purple-950/60 border border-purple-500/30 text-purple-300' 
                                : 'bg-gray-800 text-gray-400'
                            }`}>
                              {session.ended_by || 'member'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: ANALYTICS & REPORTS                 */}
        {/* ========================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                COMMAND ANALYTICS & PERFORMANCE
              </h2>
              <p className="text-xs text-gray-400 mt-1">สรุปภาพรวมสถิติชั่วโมงการทำงานและการปฏิบัติหน้าที่ของสภา</p>
            </div>

            {/* KPI OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#12141d] border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs text-gray-500 font-mono uppercase block">TOTAL SESSIONS</span>
                <span className="text-3xl font-extrabold text-white font-mono mt-2 block">{historySessions.length}</span>
                <span className="text-[10px] text-gray-500 mt-1 block">รายการปฏิบัติหน้าที่ทั้งหมด</span>
              </div>
              <div className="bg-[#12141d] border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs text-gray-500 font-mono uppercase block">ACTIVE MEMBERS</span>
                <span className="text-3xl font-extrabold text-emerald-400 font-mono mt-2 block">{stats.totalMembers}</span>
                <span className="text-[10px] text-gray-500 mt-1 block">สมาชิกในระบบปัจจุบัน</span>
              </div>
              <div className="bg-[#12141d] border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs text-gray-500 font-mono uppercase block">TODAY'S DUTY</span>
                <span className="text-3xl font-extrabold text-amber-400 font-mono mt-2 block">{stats.todayHoursFormatted}</span>
                <span className="text-[10px] text-gray-500 mt-1 block">ชั่วโมงการปฏิบัติหน้าที่วันนี้</span>
              </div>
              <div className="bg-[#12141d] border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs text-gray-500 font-mono uppercase block">MONTHLY DUTY</span>
                <span className="text-3xl font-extrabold text-amber-400 font-mono mt-2 block">{stats.monthHoursFormatted}</span>
                <span className="text-[10px] text-gray-500 mt-1 block">ชั่วโมงรวมประจำเดือนนี้</span>
              </div>
            </div>

            {/* PERFORMANCE LEADERBOARD TABLE */}
            <div className="bg-[#12141d] border border-gray-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                MEMBER PERFORMANCE RANKING (TOTAL HOURS)
              </h3>

              <div className="space-y-3">
                {stats.leaderboard.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-[#181b28] rounded-xl border border-gray-800/80">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm font-mono ${
                        index === 0 ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' :
                        index === 1 ? 'bg-gray-300 text-black' :
                        index === 2 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400'
                      }`}>
                        #{index + 1}
                      </span>
                      <div>
                        <span className="text-sm font-bold text-white block">{item.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">COUNCIL MEMBER</span>
                      </div>
                    </div>
                    <span className="text-base font-bold font-mono text-amber-400">
                      {formatDuration(item.sec)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 5: ADMIN MANAGEMENT                    */}
        {/* ========================================== */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {!isAdminLoggedIn ? (
              /* ADMIN LOGIN FORM */
              <div className="max-w-md mx-auto bg-[#12141d] border border-amber-500/20 rounded-2xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white">ADMIN COMMAND ACCESS</h2>
                  <p className="text-xs text-gray-400">กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบผู้ดูแลสภา</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      placeholder="กรอกรหัสผ่านแอดมิน..."
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      className="w-full bg-[#1a1d2b] border border-gray-700 focus:border-amber-400 rounded-xl px-4 py-3 text-white focus:outline-none transition text-center text-lg font-mono tracking-widest"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-xl shadow-lg transition"
                  >
                    เข้าสู่ระบบแอดมิน
                  </button>
                </form>
              </div>
            ) : (
              /* ADMIN MANAGEMENT DASHBOARD */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-400" />
                      ADMIN MEMBER MANAGEMENT
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">จัดการเพิ่ม แก้ไข และเปิด/ปิดสถานะสมาชิกสภา</p>
                  </div>
                  <button
                    onClick={() => setIsAdminLoggedIn(false)}
                    className="px-3 py-1.5 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-lg hover:bg-red-900/60 transition"
                  >
                    ออกจากระบบแอดมิน
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* ADD NEW MEMBER FORM */}
                  <div className="bg-[#12141d] border border-gray-800 rounded-2xl p-6 space-y-4 h-fit">
                    <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-amber-400" />
                      เพิ่มสมาชิกใหม่
                    </h3>
                    
                    <form onSubmit={handleAddMember} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">ชื่อสมาชิก</label>
                        <input
                          type="text"
                          placeholder="ชื่อ-นามสกุล หรือ ฉายา..."
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          className="w-full bg-[#1a1d2b] border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">ตำแหน่ง</label>
                        <select
                          value={newMemberPosition}
                          onChange={(e) => setNewMemberPosition(e.target.value)}
                          className="w-full bg-[#1a1d2b] border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition"
                        >
                          <option value="ประธานสภา">ประธานสภา</option>
                          <option value="รองประธานสภา">รองประธานสภา</option>
                          <option value="เลขาธิการ">เลขาธิการ</option>
                          <option value="สมาชิกสภา">สมาชิกสภา</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">รหัส PIN (4-6 หลัก)</label>
                        <input
                          type="password"
                          placeholder="กำหนด PIN..."
                          value={newMemberPin}
                          onChange={(e) => setNewMemberPin(e.target.value)}
                          className="w-full bg-[#1a1d2b] border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow transition"
                      >
                        เพิ่มสมาชิกเข้าสู่ระบบ
                      </button>
                    </form>
                  </div>

                  {/* MEMBER LIST & STATUS CONTROL */}
                  <div className="lg:col-span-2 bg-[#12141d] border border-gray-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-400" />
                      รายชื่อสมาชิกทั้งหมด ({members.length})
                    </h3>

                    <div className="divide-y divide-gray-800">
                      {members.map(member => (
                        <div key={member.id} className="py-3.5 flex items-center justify-between gap-4">
                          <div>
                            <span className="text-sm font-bold text-white block">{member.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              ตำแหน่ง: {member.position} | PIN: ****
                            </span>
                          </div>

                          <button
                            onClick={() => toggleMemberStatus(member.id, member.status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                              member.status === 'active'
                                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60'
                                : 'bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-900/60'
                            }`}
                          >
                            {member.status === 'active' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            <span>{member.status === 'active' ? 'ACTIVE' : 'INACTIVE'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ========================================== */}
      {/* MODAL: PIN VERIFICATION                    */}
      {/* ========================================== */}
      {pinModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141d] border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => { setPinModalOpen(false); setPinInput(''); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <Key className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-white">ยืนยันรหัส PIN เพื่อเข้าเวร</h3>
              <p className="text-xs text-gray-400">
                {members.find(m => m.id === selectedMemberId)?.name}
              </p>
            </div>

            <div>
              <input
                type="password"
                placeholder="กรอก PIN..."
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleClockIn()}
                className="w-full bg-[#1a1d2b] border border-gray-700 focus:border-amber-400 rounded-xl px-4 py-3 text-center text-xl text-white font-mono tracking-widest focus:outline-none transition"
              />
            </div>

            <button
              onClick={handleClockIn}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-sm rounded-xl shadow transition"
            >
              ยืนยันเข้าเวร
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: COMMAND PALETTE (CTRL + K)          */}
      {/* ========================================== */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4">
          <div className="bg-[#12141d] border border-amber-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono">
                <Terminal className="w-4 h-4" />
                <span>COMMAND PALETTE</span>
              </div>
              <kbd className="text-[10px] text-gray-500 font-mono">ESC เพื่อปิด</kbd>
            </div>

            <div className="p-2 space-y-1">
              {[
                { label: 'ไปยังหน้า ลงชื่อเข้าเวร', tab: 'duty' },
                { label: 'ไปยังหน้า คนเข้าเวรอยู่ (Live Monitor)', tab: 'monitor' },
                { label: 'ไปยังหน้า ประวัติการเข้าเวร (History)', tab: 'history' },
                { label: 'ไปยังหน้า รายงานสถิติ (Analytics)', tab: 'analytics' },
                { label: 'ไปยังหน้า ผู้ดูแลระบบ (Admin Management)', tab: 'admin' }
              ].map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveTab(cmd.tab);
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#1a1d2b] text-sm text-gray-300 hover:text-amber-300 transition flex items-center justify-between"
                >
                  <span>{cmd.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
