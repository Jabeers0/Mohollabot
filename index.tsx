
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Bomb, 
  Terminal, 
  Users, 
  Hash, 
  Zap, 
  Settings,
  Bell,
  RefreshCw,
  MessageSquare,
  Mic,
  Trophy,
  ClipboardList,
  Lock,
  Unlock,
  Skull,
  Activity,
  Ban,
  VolumeX,
  ShieldCheck,
  Eye,
  Globe,
  ChevronRight,
  Cpu,
  Key,
  Server as ServerIcon,
  Wifi,
  WifiOff,
  Radio,
  UserPlus,
  UserMinus
} from 'lucide-react';

// --- Types ---
type ViewType = 'dashboard' | 'mod-center' | 'nuke-ops' | 'logs' | 'leaderboard' | 'audit-log' | 'live-surveillance' | 'bot-settings';

interface UserActivity {
  id?: string;
  username: string;
  messages: number;
  vcMinutes: number;
  avatar: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  joinedDate: string;
  threatLevel: 'safe' | 'suspicious' | 'danger';
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

interface LiveEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  channel: string;
  iconType: 'msg' | 'vc' | 'join' | 'leave';
}

// --- Gemini AI Service ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const getThreatAssessment = async (members: UserActivity[]) => {
  const memberList = members.slice(0, 10).map(m => `${m.username} (Joined: ${m.joinedDate})`).join(', ');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze these members for potential raid patterns or suspicious bot-like names: ${memberList}. 
               Identify top 2 threats and explain why. Keep it concise in Bengali language.`,
  });
  return response.text;
};

const simulateNukeAction = async (target: string, config: any) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `The user has triggered a simulated 'Nuke' purge on server '${target}'. 
               Provide a sequence of 10 terminal-style log lines showing structural destruction. 
               Return as a JSON array of strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};

// --- Constants ---
const CHANNELS = ['#general', '#lobby', '#gaming', '#voice-hangout', '#dev-logs'];
const ACTIONS = [
  { text: 'sent a message', icon: 'msg' },
  { text: 'joined voice', icon: 'vc' },
  { text: 'started streaming', icon: 'vc' },
  { text: 'joined the server', icon: 'join' },
  { text: 'left the server', icon: 'leave' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('bot-settings');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [members, setMembers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string>('');
  
  // Bot Settings
  const [botToken, setBotToken] = useState(localStorage.getItem('nx_bot_token') || '');
  const [guildId, setGuildId] = useState(localStorage.getItem('nx_guild_id') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [serverInfo, setServerInfo] = useState<{name: string, icon: string, memberCount: number} | null>(null);

  // Nuke Operation
  const [nukeArmed, setNukeArmed] = useState(false);
  const [nukeProgress, setNukeProgress] = useState(0);
  const [nukeTerminal, setNukeTerminal] = useState<string[]>([]);

  // Simulation Logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isConnected || members.length === 0) return;
      
      const randomMember = members[Math.floor(Math.random() * members.length)];
      const randomAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      
      const newEvent: LiveEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        user: randomMember.username,
        action: randomAction.text,
        channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
        iconType: randomAction.icon as any
      };

      setLiveEvents(prev => [newEvent, ...prev].slice(0, 15));

      // Handle real-time member count updates based on events
      if (randomAction.icon === 'join') {
        setServerInfo(prev => prev ? { ...prev, memberCount: prev.memberCount + 1 } : null);
      } else if (randomAction.icon === 'leave') {
        setServerInfo(prev => prev ? { ...prev, memberCount: Math.max(0, prev.memberCount - 1) } : null);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [members, isConnected]);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const connectToDiscord = async () => {
    if (!botToken || !guildId) {
      addLog("Bot Token and Server ID missing!", "error");
      return;
    }
    setLoading(true);
    addLog(`Initiating connection to Guild ${guildId}...`, "info");

    try {
      const proxy = "https://cors-anywhere.herokuapp.com/";
      const baseApi = `${proxy}https://discord.com/api/v10`;
      const headers = { 'Authorization': `Bot ${botToken}` };

      // Fetch Guild with approximate counts
      const guildRes = await fetch(`${baseApi}/guilds/${guildId}?with_counts=true`, { headers });
      if (!guildRes.ok) throw new Error("Connection Failed. Check Token/ID.");
      const guildData = await guildRes.json();
      
      setServerInfo({
        name: guildData.name,
        icon: guildData.icon ? `https://cdn.discordapp.com/icons/${guildId}/${guildData.icon}.png` : '',
        memberCount: guildData.approximate_member_count || 0
      });

      const membersRes = await fetch(`${baseApi}/guilds/${guildId}/members?limit=20`, { headers });
      const membersData = await membersRes.json();
      
      const mapped = membersData.map((m: any) => ({
        id: m.user.id,
        username: m.user.username,
        messages: Math.floor(Math.random() * 500),
        vcMinutes: Math.floor(Math.random() * 100),
        avatar: m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png` : `https://ui-avatars.com/api/?name=${m.user.username}`,
        status: 'online',
        joinedDate: new Date(m.joined_at).toISOString().split('T')[0],
        threatLevel: 'safe'
      }));

      setMembers(mapped);
      setIsConnected(true);
      localStorage.setItem('nx_bot_token', botToken);
      localStorage.setItem('nx_guild_id', guildId);
      addLog(`Synchronized with ${guildData.name}`, "success");
      setCurrentView('dashboard');
    } catch (err: any) {
      addLog(err.message, "error");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const runNuke = async () => {
    if (!nukeArmed) return;
    setLoading(true);
    setNukeTerminal(["[BOOT] SECURE KERNEL INITIALIZED..."]);
    try {
      const steps = await simulateNukeAction(serverInfo?.name || 'Target', {});
      for (let i = 0; i < steps.length; i++) {
        setNukeTerminal(prev => [...prev, `[PURGE] ${steps[i]}`]);
        setNukeProgress(Math.floor(((i + 1) / steps.length) * 100));
        await new Promise(r => setTimeout(r, 700));
      }
      addLog("Operation Re-birth Successful", "success");
      setNukeArmed(false);
    } catch (e) {
      addLog("Nuke Protocol Failure", "error");
    } finally {
      setLoading(false);
    }
  };

  const performThreatScan = async () => {
    if (!isConnected) return;
    setLoading(true);
    setAiOutput("AI is analyzing member patterns...");
    try {
      const result = await getThreatAssessment(members);
      setAiOutput(result);
    } catch (e) {
      setAiOutput("AI Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1f22]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2b2d31] flex flex-col border-r border-[#1e1f22]">
        <div className="p-4 border-b border-[#1e1f22] flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5865f2] rounded-2xl flex items-center justify-center text-white font-black shadow-xl rotate-3">NX</div>
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-tighter">Nexus Bot</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
               <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
               <span className="text-[9px] font-black text-[#949ba4] uppercase tracking-widest">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarBtn icon={LayoutDashboard} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <SidebarBtn icon={Radio} label="Live Feed" active={currentView === 'live-surveillance'} onClick={() => setCurrentView('live-surveillance')} />
          <SidebarBtn icon={ShieldAlert} label="Mod Center" active={currentView === 'mod-center'} onClick={() => setCurrentView('mod-center')} />
          <SidebarBtn icon={Bomb} label="Nuke Ops" active={currentView === 'nuke-ops'} onClick={() => setCurrentView('nuke-ops')} />
          <SidebarBtn icon={Cpu} label="Bot Settings" active={currentView === 'bot-settings'} onClick={() => setCurrentView('bot-settings')} />
          <SidebarBtn icon={Terminal} label="Console" active={currentView === 'logs'} onClick={() => setCurrentView('logs')} />
        </nav>

        <div className="p-4 bg-[#232428] mt-auto">
          <div className="flex items-center gap-3 p-2 bg-[#1e1f22] rounded-lg">
             <img src={serverInfo?.icon || "https://ui-avatars.com/api/?name=NX&background=5865f2&color=fff"} className="w-8 h-8 rounded-full" />
             <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{serverInfo?.name || 'Not Connected'}</p>
                <p className="text-[10px] text-[#949ba4]">{isConnected ? 'Sync Active' : 'Setup Required'}</p>
             </div>
             <Settings size={14} className="text-[#949ba4] hover:text-white cursor-pointer" onClick={() => setCurrentView('bot-settings')} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#313338] overflow-hidden">
        <header className="h-12 bg-[#313338] border-b border-[#1e1f22] flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest">
            <ChevronRight size={14} className="text-[#5865f2]" />
            <span>{currentView.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-4">
             {isConnected && (
               <div className="flex items-center gap-2 px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-black rounded border border-green-500/20">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                 LIVE SYNC: {serverInfo?.memberCount?.toLocaleString() || 0}
               </div>
             )}
             <Bell size={18} className="text-[#949ba4] hover:text-white" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {currentView === 'bot-settings' && (
            <div className="max-w-xl mx-auto space-y-8 py-10">
               <div className="text-center">
                  <div className="w-20 h-20 bg-[#5865f2]/10 text-[#5865f2] rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Cpu size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-white">Bot Integration</h2>
                  <p className="text-[#949ba4] text-sm mt-2 leading-relaxed">Enter your Discord Bot Token and Guild ID to initialize real-time monitoring.</p>
               </div>

               <div className="bg-[#2b2d31] p-8 rounded-3xl border border-[#383a40] space-y-6 shadow-2xl">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-[#949ba4] uppercase tracking-widest flex items-center gap-2"><Key size={12}/> Bot Token</label>
                     <input type="password" value={botToken} onChange={e => setBotToken(e.target.value)} placeholder="MTA2..." className="w-full bg-[#1e1f22] border border-[#383a40] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#5865f2] transition-all" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-[#949ba4] uppercase tracking-widest flex items-center gap-2"><ServerIcon size={12}/> Server ID (Guild)</label>
                     <input type="text" value={guildId} onChange={e => setGuildId(e.target.value)} placeholder="102..." className="w-full bg-[#1e1f22] border border-[#383a40] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#5865f2] transition-all" />
                  </div>
                  <button onClick={connectToDiscord} disabled={loading} className="w-full py-4 bg-[#5865f2] hover:bg-[#4752c4] text-white font-black rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50">
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
                    INITIATE LINK
                  </button>
               </div>
            </div>
          )}

          {currentView === 'dashboard' && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard 
                    icon={Users} 
                    label="Live Member Count" 
                    value={serverInfo?.memberCount?.toLocaleString() || "0"} 
                    color="text-[#5865f2]" 
                    subValue={`${members.length} synced locally`}
                  />
                  <StatCard 
                    icon={MessageSquare} 
                    label="System Status" 
                    value={isConnected ? "OPERATIONAL" : "OFFLINE"} 
                    color={isConnected ? "text-green-400" : "text-red-500"} 
                  />
                  <StatCard 
                    icon={ShieldCheck} 
                    label="Protection Level" 
                    value="MAXIMUM" 
                    color="text-yellow-400" 
                  />
               </div>
               
               <div className="bg-[#2b2d31] p-6 rounded-2xl border border-[#383a40]">
                  <h3 className="text-white font-black text-xs uppercase mb-4 tracking-widest flex items-center gap-2">
                    <Radio size={16} className="text-red-500 animate-pulse" /> Activity Feed
                  </h3>
                  <div className="space-y-3">
                     {liveEvents.length > 0 ? liveEvents.map(ev => (
                        <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#1e1f22]/50 border border-[#383a40]/30 animate-in slide-in-from-right duration-300">
                           <div className={`p-1.5 rounded-lg bg-[#313338] ${ev.iconType === 'join' ? 'text-green-500' : ev.iconType === 'leave' ? 'text-red-500' : 'text-[#949ba4]'}`}>
                              {ev.iconType === 'msg' ? <MessageSquare size={14} /> : ev.iconType === 'vc' ? <Mic size={14} /> : ev.iconType === 'join' ? <UserPlus size={14} /> : <UserMinus size={14} />}
                           </div>
                           <p className="text-xs text-[#dbdee1]">
                              <span className="font-bold text-white">{ev.user}</span> {ev.action} {ev.iconType !== 'join' && ev.iconType !== 'leave' && <>in <span className="text-[#5865f2] font-bold">{ev.channel}</span></>}
                           </p>
                           <span className="ml-auto text-[10px] font-mono text-[#4e5058]">{ev.timestamp}</span>
                        </div>
                     )) : (
                        <div className="p-10 text-center text-[#4e5058] italic text-xs uppercase tracking-widest">
                          Awaiting server sync...
                        </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {currentView === 'nuke-ops' && (
            <div className="max-w-4xl mx-auto space-y-6">
               <div className="bg-red-500/5 border-2 border-red-500/20 p-8 rounded-3xl flex items-center justify-between">
                  <div>
                     <h2 className="text-2xl font-black text-white">Purification Engine</h2>
                     <p className="text-red-400 text-sm opacity-70">Extreme structural restructuring protocols. irreversible actions.</p>
                  </div>
                  <button onClick={() => setNukeArmed(!nukeArmed)} className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all ${nukeArmed ? 'bg-red-600 nuke-pulse' : 'bg-[#2b2d31] grayscale'}`}>
                     {nukeArmed ? <Unlock className="text-white" /> : <Lock className="text-red-500" />}
                     <span className="text-[9px] font-black text-white mt-1">{nukeArmed ? 'ARMED' : 'SAFE'}</span>
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#2b2d31] p-6 rounded-2xl border border-[#383a40] flex flex-col justify-center gap-4">
                     <p className="text-xs text-[#949ba4] leading-relaxed">When triggered, the AI will simulate a complete server purge, removing channels, roles, and re-initializing the core hierarchy.</p>
                     <button onClick={runNuke} disabled={!nukeArmed || loading} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl flex items-center justify-center gap-3 disabled:opacity-20">
                        {loading ? <RefreshCw className="animate-spin" /> : <Skull />} INITIATE RE-BIRTH
                     </button>
                  </div>
                  <div className="bg-black rounded-2xl border border-[#383a40] p-6 h-[250px] flex flex-col overflow-hidden font-mono text-[10px]">
                     <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                        {nukeTerminal.map((line, i) => (
                           <div key={i} className="flex gap-2">
                              <span className="text-red-500 opacity-50">[{i}]</span>
                              <span className={line.includes('OK') ? 'text-green-400' : 'text-blue-400'}>{line}</span>
                           </div>
                        ))}
                     </div>
                     {nukeProgress > 0 && (
                        <div className="mt-4 bg-[#1e1f22] h-1.5 rounded-full overflow-hidden">
                           <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${nukeProgress}%` }} />
                        </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {currentView === 'mod-center' && (
             <div className="space-y-6">
                <div className="bg-[#2b2d31] p-6 rounded-2xl border border-[#383a40] space-y-4">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-black text-xs uppercase flex items-center gap-2"><Eye size={16} /> AI Threat Scanner</h3>
                      <button onClick={performThreatScan} disabled={loading} className="px-3 py-1 bg-[#5865f2] text-white text-[10px] font-black rounded hover:bg-[#4752c4]">RUN AI SCAN</button>
                   </div>
                   <div className="p-4 bg-black/30 rounded-xl border border-[#383a40] min-h-[100px] text-sm leading-relaxed italic">
                      {aiOutput || "Ready for analysis."}
                   </div>
                </div>

                <div className="bg-[#2b2d31] rounded-2xl border border-[#383a40] overflow-hidden">
                   <table className="w-full text-left text-xs">
                      <thead className="bg-[#1e1f22] text-[#949ba4] font-black uppercase text-[10px]">
                         <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Control</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-[#383a40]">
                         {members.map(m => (
                            <tr key={m.id} className="hover:bg-white/5 transition-colors">
                               <td className="px-6 py-4 flex items-center gap-3 font-bold text-white">
                                  <img src={m.avatar} className="w-6 h-6 rounded-full" /> {m.username}
                               </td>
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                     <div className={`w-2 h-2 rounded-full status-${m.status}`} />
                                     <span className="capitalize">{m.status}</span>
                                  </div>
                               </td>
                               <td className="px-6 py-4 text-right">
                                  <button className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"><Ban size={14} /></button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {currentView === 'logs' && (
            <div className="bg-black rounded-xl border border-[#383a40] h-full overflow-hidden flex flex-col p-4 font-mono text-[11px]">
               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                  {logs.map(log => (
                    <div key={log.id} className="flex gap-4">
                       <span className="text-[#4e5058]">{log.timestamp}</span>
                       <span className={`font-bold uppercase ${log.level === 'error' ? 'text-red-500' : log.level === 'success' ? 'text-green-500' : 'text-blue-400'}`}>[{log.level}]</span>
                       <span className="text-[#dbdee1]">{log.message}</span>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 bg-[#1e1f22]/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
             <RefreshCw className="animate-spin text-[#5865f2] mb-4" size={32} />
             <p className="text-white font-black text-xs uppercase tracking-[0.2em] animate-pulse">Synchronizing Data Streams</p>
          </div>
        )}
      </main>
    </div>
  );
};

const SidebarBtn = ({ icon: Icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${active ? 'bg-[#5865f2] text-white shadow-lg' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}>
    <Icon size={18} />
    <span className="font-medium text-xs">{label}</span>
  </button>
);

const StatCard = ({ icon: Icon, label, value, color, subValue }: any) => (
  <div className="bg-[#2b2d31] p-5 rounded-2xl border border-[#383a40] hover:border-[#5865f2]/30 transition-all flex flex-col">
    <div className="p-2 w-fit bg-[#1e1f22] rounded-lg text-[#5865f2] mb-3"><Icon size={18} /></div>
    <p className="text-[10px] font-black text-[#4e5058] uppercase tracking-widest">{label}</p>
    <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
    {subValue && <p className="text-[9px] text-[#949ba4] font-bold mt-1 uppercase">{subValue}</p>}
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
