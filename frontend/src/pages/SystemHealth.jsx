import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Server,
  Database,
  Clock,
  Cpu,
  Activity,
  Zap,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Wifi,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Layers
} from 'lucide-react';

export default function SystemHealth() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('http://localhost:8000/health');
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setHealthData(data);
      setError(null);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch system health:', err);
      setError(err.message || 'Unable to connect to ML Engine API');
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => {
      fetchHealth();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchHealth]);

  // CPU Color based on usage: <50% green, 50-80% yellow, >80% red
  const getCpuColorProps = (pct) => {
    const val = Number(pct) || 0;
    if (val < 50) {
      return {
        barClass: 'bg-[#39ff14]',
        textClass: 'text-[#39ff14]',
        glowClass: 'shadow-[0_0_12px_#39ff14]',
        borderClass: 'border-[#39ff14]/30',
        badgeBg: 'bg-[#39ff14]/10 text-[#39ff14] border-[#39ff14]/30',
        level: 'Nominal'
      };
    }
    if (val <= 80) {
      return {
        barClass: 'bg-amber-400',
        textClass: 'text-amber-400',
        glowClass: 'shadow-[0_0_12px_#fbbf24]',
        borderClass: 'border-amber-400/30',
        badgeBg: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
        level: 'Elevated'
      };
    }
    return {
      barClass: 'bg-[#ff003c]',
      textClass: 'text-[#ff003c]',
      glowClass: 'shadow-[0_0_12px_#ff003c]',
      borderClass: 'border-[#ff003c]/30',
      badgeBg: 'bg-[#ff003c]/10 text-[#ff003c] border-[#ff003c]/30',
      level: 'Critical'
    };
  };

  const cpuPercent = healthData?.cpu_percent ?? 0;
  const cpuStyle = getCpuColorProps(cpuPercent);
  const memoryPercent = healthData?.memory_percent ?? 0;
  const memoryUsed = healthData?.memory_used_gb ?? 0;
  const memoryTotal = healthData?.memory_total_gb ?? 0;
  const uptimeStr = healthData?.uptime || '0h 0m 0s';
  const throughput = healthData?.throughput_fps ?? 0;
  const isOnline = !error && healthData?.status === 'online';

  const engineDescriptions = {
    'Rule Engine': 'Deterministic regex & signature-based CVE heuristic matching',
    'Isolation Forest': 'Unsupervised multidimensional anomaly detection (contamination=0.05)',
    'GraphSAGE': '2-Layer Inductive Graph Neural Network for topological threat inference'
  };

  return (
    <div className="h-full overflow-y-auto pr-1 text-gray-100 font-mono space-y-6">
      {/* Background Cyber Glows */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-[#00f3ff]/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-[#39ff14]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-black/40 border border-white/10 backdrop-blur-xl p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_25px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#39ff14] via-[#00f3ff] to-[#b000ff]" />

        <div className="flex items-center gap-4 pl-1">
          <div className="p-3.5 bg-[#39ff14]/10 border border-[#39ff14]/40 rounded-xl text-[#39ff14] shadow-[0_0_20px_rgba(57,255,20,0.25)] flex-shrink-0">
            <Heart className="w-7 h-7 fill-current animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black tracking-wider text-white font-display">
                System Health
              </h1>
              {isOnline ? (
                <span className="px-2.5 py-0.5 bg-[#39ff14]/10 border border-[#39ff14]/40 text-[#39ff14] text-[11px] rounded font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(57,255,20,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-ping" />
                  Cluster Online
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-[#ff003c]/10 border border-[#ff003c]/40 text-[#ff003c] text-[11px] rounded font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  API Disconnected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#00f3ff]" />
              Real-time microservice vitals, hardware utilization & detection engine telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {lastUpdated && (
            <div className="hidden sm:flex flex-col text-right text-[11px] text-gray-400">
              <span className="text-gray-500">Live Polling (2s)</span>
              <span className="text-[#00f3ff] font-bold">Updated: {lastUpdated}</span>
            </div>
          )}
          <button
            onClick={() => fetchHealth(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-xs hover:bg-[#00f3ff]/10 hover:border-[#00f3ff]/40 hover:text-[#00f3ff] transition-all cursor-pointer shadow-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00f3ff]' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </motion.div>

      {/* ── 3 SERVICE STATUS CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Python ML Engine */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl relative overflow-hidden group hover:border-[#00f3ff]/40 transition-all flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00f3ff] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm font-display tracking-wide">
                    Python ML Engine
                  </h3>
                  <span className="text-[11px] text-gray-400">Port :8000 (FastAPI)</span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isOnline
                  ? 'bg-[#39ff14]/15 border border-[#39ff14]/40 text-[#39ff14]'
                  : 'bg-[#ff003c]/15 border border-[#ff003c]/40 text-[#ff003c]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#39ff14] animate-pulse' : 'bg-[#ff003c]'}`} />
                {healthData?.status ? healthData.status.toUpperCase() : (isOnline ? 'ONLINE' : 'OFFLINE')}
              </span>
            </div>

            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              {healthData?.service || 'DiodeGuard ML Engine'} — PyTorch GraphSAGE & Isolation Forest anomaly inference server.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-500" /> Uptime:
              </span>
              <span className="text-[#00f3ff] font-bold">{uptimeStr}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-gray-500" /> Throughput:
              </span>
              <span className="text-[#39ff14] font-bold">{throughput} flows/sec</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Node.js Gateway */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl relative overflow-hidden group hover:border-[#39ff14]/40 transition-all flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#39ff14] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm font-display tracking-wide">
                    Node.js Gateway
                  </h3>
                  <span className="text-[11px] text-gray-400">Port :5000 (Express)</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#39ff14]/15 border border-[#39ff14]/40 text-[#39ff14]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
                Connected
              </span>
            </div>

            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              API reverse proxy, Socket.IO live flow telemetry broadcaster & authentication barrier.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-gray-500" /> Gateway Port:
              </span>
              <span className="text-[#39ff14] font-bold">5000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-gray-500" /> Stream Mode:
              </span>
              <span className="text-gray-200">Socket.IO / REST</span>
            </div>
          </div>
        </motion.div>

        {/* Card 3: React Frontend */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl relative overflow-hidden group hover:border-[#b000ff]/40 transition-all flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#b000ff] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-[#b000ff]/10 text-[#b000ff] border border-[#b000ff]/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm font-display tracking-wide">
                    React Frontend
                  </h3>
                  <span className="text-[11px] text-gray-400">Port :5173 (Vite)</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#39ff14]/15 border border-[#39ff14]/40 text-[#39ff14]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
                Running
              </span>
            </div>

            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              SOC Analyst Console built on React 19, Tailwind Dark Cyber Theme & Framer Motion telemetry.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-gray-500" /> Client Port:
              </span>
              <span className="text-[#c084fc] font-bold">5173</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-gray-500" /> Engine:
              </span>
              <span className="text-gray-200">React 19 / Vite</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── SYSTEM METRICS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Metric 1: CPU Usage */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Cpu className={`w-4 h-4 ${cpuStyle.textClass}`} />
              <h3 className="font-bold text-white text-base font-display">
                CPU Utilization
              </h3>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${cpuStyle.badgeBg}`}>
              {cpuStyle.level}
            </span>
          </div>

          <div className="my-5 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Host Processor Load</span>
              <span className={`text-3xl font-black font-mono ${cpuStyle.textClass}`}>
                {cpuPercent}%
              </span>
            </div>

            {/* Progress Bar with Dynamic Color */}
            <div className="w-full h-3.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className={`h-full ${cpuStyle.barClass} ${cpuStyle.glowClass} rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${Math.min(100, Math.max(0, cpuPercent))}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-gray-500 pt-1">
              <span>0% (Idle)</span>
              <span>50% (Normal)</span>
              <span>80% (Warning)</span>
              <span>100% (Max)</span>
            </div>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs flex justify-between items-center text-gray-400">
            <span>Color Spectrum Status:</span>
            <span className="text-gray-200">
              {cpuPercent < 50 ? 'Optimal (<50% Green)' : cpuPercent <= 80 ? 'Elevated (50-80% Yellow)' : 'High Load (>80% Red)'}
            </span>
          </div>
        </motion.div>

        {/* Metric 2: Memory Usage */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#00f3ff]" />
              <h3 className="font-bold text-white text-base font-display">
                Memory Usage
              </h3>
            </div>
            <span className="text-xs font-bold text-[#00f3ff] bg-[#00f3ff]/10 border border-[#00f3ff]/30 px-2 py-0.5 rounded">
              RAM Telemetry
            </span>
          </div>

          <div className="my-5 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Allocated Physical Memory</span>
              <div className="text-right">
                <span className="text-3xl font-black font-mono text-[#00f3ff]">
                  {memoryPercent}%
                </span>
                <span className="text-xs text-gray-400 block mt-0.5">
                  {memoryUsed} GB / {memoryTotal} GB
                </span>
              </div>
            </div>

            {/* Memory Progress Bar */}
            <div className="w-full h-3.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#00f3ff] to-[#b000ff] shadow-[0_0_12px_rgba(0,243,255,0.4)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, memoryPercent))}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-gray-500 pt-1">
              <span>0 GB</span>
              <span>Available: {(Math.max(0, memoryTotal - memoryUsed)).toFixed(1)} GB</span>
              <span>Total: {memoryTotal} GB</span>
            </div>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs flex justify-between items-center text-gray-400">
            <span>Memory Pool:</span>
            <span className="text-gray-200 font-bold">{memoryUsed} GB used of {memoryTotal} GB total</span>
          </div>
        </motion.div>

        {/* Metric 3: System Uptime */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#39ff14]" />
              <h3 className="font-bold text-white text-base font-display">
                System Uptime
              </h3>
            </div>
            <span className="text-xs text-[#39ff14] font-bold bg-[#39ff14]/10 border border-[#39ff14]/30 px-2 py-0.5 rounded">
              Continuous
            </span>
          </div>

          <div className="my-6 text-center">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-wider drop-shadow-[0_0_15px_rgba(57,255,20,0.3)]">
              {uptimeStr}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Continuous engine execution since daemon initialization
            </p>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs flex justify-between items-center text-gray-400">
            <span>Uptime (Seconds):</span>
            <span className="text-[#39ff14] font-mono font-bold">
              {healthData?.uptime_seconds != null ? `${healthData.uptime_seconds}s` : 'N/A'}
            </span>
          </div>
        </motion.div>

        {/* Metric 4: Ingestion Throughput */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#b000ff]" />
              <h3 className="font-bold text-white text-base font-display">
                Throughput & Flow Processing
              </h3>
            </div>
            <span className="text-xs text-[#c084fc] font-bold bg-[#b000ff]/10 border border-[#b000ff]/30 px-2 py-0.5 rounded">
              Live Ingest
            </span>
          </div>

          <div className="my-6 text-center">
            <div className="text-3xl sm:text-4xl font-black text-[#00f3ff] font-mono tracking-wider drop-shadow-[0_0_15px_rgba(0,243,255,0.3)]">
              {throughput} <span className="text-lg text-gray-400 font-normal">flows/sec</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Real-time optical flow rate processed by ML pipeline
            </p>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs grid grid-cols-2 gap-2 text-gray-400">
            <div className="flex justify-between">
              <span>Total Flows:</span>
              <span className="text-white font-bold">{healthData?.total_flows ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Alerts:</span>
              <span className="text-[#ff003c] font-bold">{healthData?.total_alerts ?? 0}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── ENGINE STATUS LIST & DEVICE INFO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Engine Status List (2 Columns on large) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#39ff14]" />
              <div>
                <h3 className="font-bold text-white text-base font-display">
                  Detection Engine Status
                </h3>
                <p className="text-xs text-gray-400">
                  Active neural, statistical and heuristic security engines reported by API
                </p>
              </div>
            </div>
            <span className="text-xs text-[#39ff14] font-bold bg-[#39ff14]/10 border border-[#39ff14]/30 px-2.5 py-1 rounded">
              {healthData?.engines ? Object.keys(healthData.engines).length : 3} ENGINES ONLINE
            </span>
          </div>

          <div className="space-y-3">
            {healthData?.engines && Object.entries(healthData.engines).length > 0 ? (
              Object.entries(healthData.engines).map(([name, status], idx) => (
                <div
                  key={name}
                  className="p-3.5 bg-white/[0.02] border border-white/5 hover:border-[#00f3ff]/30 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20 mt-0.5">
                      {idx === 0 ? <Zap className="w-4 h-4 text-amber-400" /> : idx === 1 ? <Database className="w-4 h-4 text-[#00f3ff]" /> : <Cpu className="w-4 h-4 text-[#b000ff]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm font-display group-hover:text-[#00f3ff] transition-colors">
                          {name}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          [Engine-{idx + 1}]
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {engineDescriptions[name] || 'Operational cyber threat detection pipeline'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#39ff14]/15 border border-[#39ff14]/40 text-[#39ff14]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
                      {String(status).toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 bg-white/[0.01] rounded-xl border border-white/5">
                {loading ? 'Querying detection engines from API...' : 'No detection engines returned by API.'}
              </div>
            )}
          </div>
        </motion.div>

        {/* Device & Host Info */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#00f3ff]" />
                <h3 className="font-bold text-white text-base font-display">
                  Host Environment
                </h3>
              </div>
              <span className="text-[11px] text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                Specs
              </span>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center">
                <span className="text-gray-400">Hostname:</span>
                <span className="text-[#00f3ff] font-bold">{healthData?.hostname || 'N/A'}</span>
              </div>

              <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center">
                <span className="text-gray-400">OS Platform:</span>
                <span className="text-white font-bold">{healthData?.os || 'N/A'}</span>
              </div>

              <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center">
                <span className="text-gray-400">Python Version:</span>
                <span className="text-[#39ff14] font-bold">{healthData?.python_version || 'N/A'}</span>
              </div>

              <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center">
                <span className="text-gray-400">Service Daemon:</span>
                <span className="text-[#c084fc] font-bold">{healthData?.service || 'DiodeGuard ML'}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 text-[11px] text-gray-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#39ff14]" /> Telemetry Synced
            </span>
            <span className="text-gray-500">FastAPI :8000</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
