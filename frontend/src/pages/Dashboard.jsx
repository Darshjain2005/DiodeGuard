import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity, AlertTriangle, Zap, Radio, Eye } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';

const CyberBackground = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    let animId, t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;
      ctx.fillStyle = 'rgba(0, 243, 255, 0.03)';
      for (let i = 0; i < canvas.width; i += 40) {
        for (let j = 0; j < canvas.height; j += 40) {
          ctx.fillRect(i, j, 1, 1);
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full pointer-events-none" />;
};

const MetricCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden rounded-xl bg-black/30 backdrop-blur-md border border-white/10 p-5"
  >
    <div className="flex justify-between items-start mb-2">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">{subtitle}</span>
    </div>
    <div className="mt-4">
      <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-3xl font-bold font-mono tracking-wider" style={{ color }}>{value}</div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({ flows: 0, alerts: 0, score: 100, engines: 3 });
  const [chartData, setChartData] = useState(Array(15).fill({ time: '', 'DDoS': 0, 'Port Scan': 0, 'C2': 0, 'DNS': 0, 'Anomaly': 0 }));
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    // 1. Fetch real metrics from Python API every second
    const fetchTimer = setInterval(() => {
      fetch('http://localhost:8000/metrics')
        .then(res => res.json())
        .then(data => {
          setStats({
            flows: data.total_flows,
            alerts: data.total_alerts,
            score: Math.max(0, 100 - (data.total_alerts * 2)),
            engines: data.engines_active
          });
          
          setChartData(prev => {
            const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return [...prev.slice(1), {
              time: now,
              'DDoS': data.threat_distribution?.DDoS || 0,
              'Port Scan': data.threat_distribution?.['Port Scan'] || 0,
              'C2': data.threat_distribution?.C2 || 0,
              'DNS': data.threat_distribution?.DNS || 0,
              'Anomaly': data.threat_distribution?.Anomaly || 0
            }];
          });
        })
        .catch(err => console.error("Metrics fetch error:", err));
    }, 1000);

    // 2. Connect to Socket.IO for real-time feed
    const socket = io('http://127.0.0.1:5000', { transports: ['websocket', 'polling'] });
    
    socket.on('new_activity', (data) => {
      setFeed(prev => [data, ...prev].slice(0, 50));
    });

    return () => {
      clearInterval(fetchTimer);
      socket.disconnect();
    };
  }, []);

  const getBadgeColor = (type) => {
    if (type === 'CRITICAL') return 'bg-[#ff003c]/20 text-[#ff003c] border-[#ff003c]/30';
    if (type === 'HIGH') return 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30';
    if (type === 'MEDIUM') return 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30';
    return 'bg-[#00f3ff]/20 text-[#00f3ff] border-[#00f3ff]/30';
  };

  return (
    <div className="w-full min-h-full bg-[#050510] text-gray-200 relative font-sans">
      <CyberBackground />
      <div className="relative z-10 w-full h-full flex flex-col space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-display font-black tracking-wider text-white">SOC <span className="text-[#00f3ff]">OVERVIEW</span></h1>
            <p className="text-[#8eb4d4] font-mono text-xs uppercase tracking-widest mt-1">Real-time Passive Telemetry</p>
          </div>
          <div className="flex items-center gap-2 bg-[#39ff14]/10 border border-[#39ff14]/30 px-3 py-1.5 rounded-full">
            <Radio size={14} className="text-[#39ff14] animate-pulse" />
            <span className="text-[#39ff14] font-mono text-xs font-bold tracking-wider">LIVE</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Flows Analyzed" value={stats.flows.toLocaleString()} icon={Activity} color="#00f3ff" subtitle="Total Processed" />
          <MetricCard title="Active Alerts" value={stats.alerts.toLocaleString()} icon={AlertTriangle} color="#ff003c" subtitle="Unresolved Threats" />
          <MetricCard title="Threat Score" value={`${stats.score}/100`} icon={Shield} color={stats.score < 50 ? '#ff003c' : '#39ff14'} subtitle="System Health" />
          <MetricCard title="Detection Engines" value={`${stats.engines}/3`} icon={Zap} color="#b000ff" subtitle="Active Modules" />
        </div>

        {/* Chart */}
        <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-5 h-80">
          <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest mb-4">Threat Distribution Volumetrics</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDDoS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff003c" stopOpacity={0.5}/><stop offset="95%" stopColor="#ff003c" stopOpacity={0}/></linearGradient>
                <linearGradient id="colorPortScan" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.5}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#b000ff" stopOpacity={0.5}/><stop offset="95%" stopColor="#b000ff" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(0,243,255,0.3)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="DDoS" stroke="#ff003c" fillOpacity={1} fill="url(#colorDDoS)" />
              <Area type="monotone" dataKey="Port Scan" stroke="#f97316" fillOpacity={1} fill="url(#colorPortScan)" />
              <Area type="monotone" dataKey="Anomaly" stroke="#b000ff" fillOpacity={1} fill="url(#colorAnomaly)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Feed */}
        <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-5 flex-1 min-h-[300px] flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <Eye size={16} className="text-[#00f3ff]" />
            <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest">Live Activity Stream</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {feed.length === 0 ? (
              <div className="text-center text-gray-500 font-mono text-sm mt-10 opacity-50">Waiting for live events... (Go to Live Detection and start replay)</div>
            ) : (
              feed.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getBadgeColor(item.type)} mt-0.5 min-w-[70px] text-center`}>
                    {item.type}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300 font-mono leading-tight">{item.text}</p>
                    {item.raw_alert?.timestamp && (
                      <p className="text-[10px] text-gray-500 font-mono mt-1.5">{item.raw_alert.timestamp}</p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
