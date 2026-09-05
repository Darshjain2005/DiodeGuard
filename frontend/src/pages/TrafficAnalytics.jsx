import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Network,
  Globe,
  ArrowUpDown,
  Activity,
  Radio,
  Search,
  RefreshCw,
  Layers,
  ShieldAlert,
  Server,
  AlertTriangle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

/* ─────────────────────────────────────────────────────────────
   PROTOCOL & SERVICE DEFINITIONS
───────────────────────────────────────────────────────────── */
const PROTOCOL_COLORS = {
  TCP: '#00f3ff',
  UDP: '#39ff14',
  ICMP: '#f97316',
  Other: '#b000ff'
};

const PORT_SERVICES = {
  20: 'FTP-DATA',
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  123: 'NTP',
  143: 'IMAP',
  161: 'SNMP',
  443: 'HTTPS',
  445: 'SMB',
  993: 'IMAPS',
  995: 'POP3S',
  1433: 'MSSQL',
  1521: 'Oracle',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  6379: 'Redis',
  8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt',
  27017: 'MongoDB'
};

/* ─────────────────────────────────────────────────────────────
   FORMATTING UTILITIES
───────────────────────────────────────────────────────────── */
const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i] || 'B'}`;
};

const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString();
};

/* ─────────────────────────────────────────────────────────────
   CUSTOM RECHARTS TOOLTIPS
───────────────────────────────────────────────────────────── */
const CyberPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0c1120]/95 border border-[#00f3ff]/40 backdrop-blur-xl p-3 rounded-lg shadow-[0_0_20px_rgba(0,243,255,0.25)] text-xs font-mono">
        <div className="text-white font-bold mb-1 flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          {data.name} Protocol
        </div>
        <div className="text-gray-300">
          Share: <span className="text-[#00f3ff] font-bold">{data.value}%</span>
        </div>
        <div className="text-gray-400 text-[11px] mt-0.5">
          Flow Count: {formatNumber(data.count)}
        </div>
      </div>
    );
  }
  return null;
};

const CyberBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0c1120]/95 border border-[#00f3ff]/40 backdrop-blur-xl p-3 rounded-lg shadow-[0_0_20px_rgba(0,243,255,0.25)] text-xs font-mono">
        <div className="text-white font-bold flex items-center gap-2">
          <span className="text-[#00f3ff]">Port {data.rawPort}</span>
          <span className="text-gray-400">({data.service})</span>
        </div>
        <div className="text-gray-300 mt-1">
          Flow Count: <span className="text-[#39ff14] font-bold">{formatNumber(data.count)}</span>
        </div>
      </div>
    );
  }
  return null;
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function TrafficAnalytics() {
  const [trafficData, setTrafficData] = useState({
    total_flows: 0,
    total_packets: 0,
    total_bytes: 0,
    avg_bytes_per_flow: 0,
    avg_packets_per_flow: 0,
    protocols: {},
    top_talkers: [],
    top_ports: []
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Fetch from http://localhost:8000/traffic on mount & poll every 3 seconds
  const fetchTrafficData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000'}/traffic`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      setTrafficData({
        total_flows: data.total_flows ?? 0,
        total_packets: data.total_packets ?? 0,
        total_bytes: data.total_bytes ?? 0,
        avg_bytes_per_flow: data.avg_bytes_per_flow ?? 0,
        avg_packets_per_flow: data.avg_packets_per_flow ?? 0,
        protocols: data.protocols ?? {},
        top_talkers: Array.isArray(data.top_talkers) ? data.top_talkers : [],
        top_ports: Array.isArray(data.top_ports) ? data.top_ports : []
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch traffic analytics:', err);
      setError('Unable to connect to ML Telemetry Engine (http://localhost:8000/traffic)');
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchTrafficData();
    const interval = setInterval(() => {
      fetchTrafficData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Compute protocol distribution for PieChart
  const protocolChartData = useMemo(() => {
    if (!trafficData.protocols) return [];
    const entries = Object.entries(trafficData.protocols);
    if (entries.length === 0) return [];

    const list = entries.map(([name, info]) => {
      const pct = typeof info === 'object' && info !== null ? (info.pct ?? 0) : 0;
      const count = typeof info === 'object' && info !== null ? (info.count ?? 0) : Number(info) || 0;
      return {
        name,
        value: Number(pct),
        count: Number(count),
        color: PROTOCOL_COLORS[name] || '#b000ff'
      };
    });

    const active = list.filter((p) => p.count > 0 || p.value > 0);
    return active.length > 0 ? active : list;
  }, [trafficData.protocols]);

  // Compute number of unique protocols
  const uniqueProtocolsCount = useMemo(() => {
    if (!trafficData.protocols) return 0;
    const active = Object.values(trafficData.protocols).filter((p) => {
      if (typeof p === 'object' && p !== null) return (p.count || 0) > 0;
      return Number(p) > 0;
    });
    return active.length > 0 ? active.length : Object.keys(trafficData.protocols).length;
  }, [trafficData.protocols]);

  // Compute top ports data for BarChart
  const portChartData = useMemo(() => {
    if (!trafficData.top_ports || !Array.isArray(trafficData.top_ports)) return [];
    return trafficData.top_ports.map((p) => {
      const portNum = p.port;
      const serviceName = PORT_SERVICES[portNum] || 'App';
      return {
        port: `${portNum}`,
        rawPort: portNum,
        label: `${portNum} (${serviceName})`,
        service: serviceName,
        count: p.count ?? 0
      };
    });
  }, [trafficData.top_ports]);

  // Filter top talkers by search query
  const filteredTalkers = useMemo(() => {
    if (!trafficData.top_talkers || !Array.isArray(trafficData.top_talkers)) return [];
    if (!searchTerm.trim()) return trafficData.top_talkers;
    const term = searchTerm.toLowerCase();
    return trafficData.top_talkers.filter((item) => {
      const ip = (item.ip || '').toLowerCase();
      return ip.includes(term);
    });
  }, [trafficData.top_talkers, searchTerm]);

  // Threat badge renderer
  const renderThreatBadge = (alerts, flows) => {
    const score = flows > 0 ? (alerts / flows) * 100 : 0;
    const formatted = score.toFixed(1);

    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#ff003c]/15 border border-[#ff003c]/40 text-[#ff003c] shadow-[0_0_8px_rgba(255,0,60,0.3)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff003c] animate-ping" />
          {formatted}% (CRITICAL)
        </span>
      );
    }
    if (score >= 20) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#f97316]/15 border border-[#f97316]/40 text-[#f97316]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
          {formatted}% (HIGH)
        </span>
      );
    }
    if (score > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {formatted}% (SUSPICIOUS)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#39ff14]/15 border border-[#39ff14]/40 text-[#39ff14]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14]" />
        0.0% (BENIGN)
      </span>
    );
  };

  return (
    <div className="h-full overflow-y-auto pr-1 text-gray-100 font-mono space-y-6">
      {/* Background ambient lighting */}
      <div className="fixed top-20 right-1/4 w-96 h-96 bg-[#00f3ff]/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-20 left-1/4 w-96 h-96 bg-[#b000ff]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-black/40 border border-white/10 backdrop-blur-xl p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_25px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#00f3ff] via-[#b000ff] to-[#39ff14]" />

        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#00f3ff]/10 border border-[#00f3ff]/40 rounded-xl text-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.25)] flex-shrink-0">
            <Network className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-wider text-white font-display">
                Traffic Analytics
              </h1>
              <span className="px-2.5 py-0.5 bg-[#00f3ff]/10 border border-[#00f3ff]/40 text-[#00f3ff] text-[11px] rounded font-bold uppercase tracking-wider">
                L3 / L4 / L7 Telemetry
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#00f3ff]" />
              Continuous flow aggregation, protocol fingerprinting & real-time top-talker telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-[#39ff14]/30 text-[#39ff14] text-xs">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#39ff14]" />
            <span className="font-semibold">POLLING: 3s</span>
          </div>

          <button
            onClick={() => fetchTrafficData(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#00f3ff]/40 text-gray-300 hover:text-white transition-all text-xs cursor-pointer"
            title="Manual Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00f3ff]' : ''}`} />
            <span>{lastUpdated ? lastUpdated.toLocaleTimeString() : 'Syncing'}</span>
          </button>
        </div>
      </motion.div>

      {/* ── ERROR ALERT ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#ff003c]/10 border border-[#ff003c]/40 rounded-xl p-4 flex items-center gap-3 text-[#ff003c] text-xs backdrop-blur-md"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* ── WAITING FOR TRAFFIC BANNER (Requirement 10) ── */}
      {trafficData.total_flows === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/40 border border-[#00f3ff]/40 rounded-xl p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(0,243,255,0.15)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f3ff] to-transparent animate-pulse" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="p-3.5 bg-[#00f3ff]/10 border border-[#00f3ff]/40 rounded-xl text-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.25)] animate-pulse flex-shrink-0">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display tracking-wide flex items-center gap-2 justify-center sm:justify-start">
                  Waiting for traffic data... Start a replay to begin analysis.
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  The ML ingestion pipeline is active. Start a replay from the Replay Controller or stream network flows to populate metrics.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-xs text-[#00f3ff] font-mono whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#00f3ff] animate-ping" />
              <span>Awaiting Flows</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TOP STAT CARDS (4 CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Flows */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl relative overflow-hidden group hover:border-[#00f3ff]/40 transition-all duration-300"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00f3ff] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Total Flows</span>
            <div className="p-2 rounded-lg bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white font-display tracking-tight">
            {formatNumber(trafficData.total_flows)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-gray-400">Total Ingested</span>
            <span className="text-[#00f3ff] font-mono">Active Pipeline</span>
          </div>
        </motion.div>

        {/* Card 2: Avg Packets / Flow */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl relative overflow-hidden group hover:border-[#39ff14]/40 transition-all duration-300"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#39ff14] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Avg Packets / Flow</span>
            <div className="p-2 rounded-lg bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/20">
              <ArrowUpDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-[#39ff14] font-display tracking-tight">
            {trafficData.avg_packets_per_flow}{' '}
            <span className="text-sm font-normal text-gray-400">pkts</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-gray-400">Packets: {formatNumber(trafficData.total_packets)}</span>
            <span className="text-emerald-400 font-mono">L4 Density</span>
          </div>
        </motion.div>

        {/* Card 3: Avg Bytes / Flow */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl relative overflow-hidden group hover:border-[#b000ff]/40 transition-all duration-300"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#b000ff] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Avg Bytes / Flow</span>
            <div className="p-2 rounded-lg bg-[#b000ff]/10 text-[#b000ff] border border-[#b000ff]/20">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-[#c084fc] font-display tracking-tight">
            {formatBytes(trafficData.avg_bytes_per_flow)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-gray-400">Total: {formatBytes(trafficData.total_bytes)}</span>
            <span className="text-purple-400 font-mono">Payload Ratio</span>
          </div>
        </motion.div>

        {/* Card 4: Unique Protocols */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl relative overflow-hidden group hover:border-[#f97316]/40 transition-all duration-300"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#f97316] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Unique Protocols</span>
            <div className="p-2 rounded-lg bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-[#f97316] font-display tracking-tight">
            {uniqueProtocolsCount}{' '}
            <span className="text-sm font-normal text-gray-400">Active</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-orange-400">Transport Fingerprint</span>
            <span className="text-gray-500">IANA Mapped</span>
          </div>
        </motion.div>
      </div>

      {/* ── CHARTS SECTION: PROTOCOL PIE CHART + TOP PORTS BAR CHART ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protocol Distribution Pie Chart (1 Col on lg) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl flex flex-col justify-between"
        >
          <div className="border-b border-white/5 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00f3ff]" />
              <h3 className="text-base font-bold text-white tracking-wide font-display">
                Protocol Distribution
              </h3>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Transport layer breakdown computed directly from API telemetry
            </p>
          </div>

          <div className="h-[220px] w-full relative flex items-center justify-center">
            {protocolChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={protocolChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {protocolChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#050510"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CyberPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 text-xs">
                No protocol telemetry available yet.
              </div>
            )}

            {protocolChartData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Top Share</span>
                <span className="text-base font-black text-[#00f3ff] font-display">
                  {protocolChartData[0]?.name || 'N/A'}: {protocolChartData[0]?.value || 0}%
                </span>
              </div>
            )}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-xs">
            {protocolChartData.length > 0 ? (
              protocolChartData.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}` }}
                    />
                    <span className="text-gray-300 font-semibold">{p.name}</span>
                  </div>
                  <span className="font-bold text-white">{p.value}%</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center text-gray-500 text-xs py-2">
                Awaiting active protocols...
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Ports Bar Chart (2 Cols on lg) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-black/30 border border-white/10 backdrop-blur-xl p-5 rounded-xl shadow-xl flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-white/5 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#39ff14]" />
                <h3 className="text-base font-bold text-white tracking-wide font-display">
                  Top Destination Ports
                </h3>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Service ingress and egress flow volume by destination port from API
              </p>
            </div>
            <span className="text-xs text-[#00f3ff] bg-[#00f3ff]/10 border border-[#00f3ff]/30 px-3 py-1 rounded-full self-start sm:self-auto font-mono">
              {portChartData.length} Ports Active
            </span>
          </div>

          <div className="h-[250px] w-full">
            {portChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={portChartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="port"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `Port ${val}`}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  />
                  <Tooltip content={<CyberBarTooltip />} />
                  <Bar dataKey="count" name="Flows" fill="#00f3ff" radius={[4, 4, 0, 0]}>
                    {portChartData.map((_, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={index % 2 === 0 ? '#00f3ff' : '#39ff14'}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                No destination port data recorded yet.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-xs text-gray-400">
            <span>Aggregated port flow distribution</span>
            <span className="text-emerald-400 font-mono">Real-Time Sensor Feed</span>
          </div>
        </motion.div>
      </div>

      {/* ── TOP TALKERS TABLE (Requirement 5) ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-black/30 border border-white/10 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden"
      >
        {/* Table Header & Search Filter */}
        <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-[#00f3ff]" />
              <h3 className="text-lg font-bold text-white tracking-wide font-display">
                Top Talkers & Suspicious Endpoints
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Bandwidth endpoints evaluated against threat scoring (Alerts / Flows × 100)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by IP address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/40 border border-white/10 text-xs rounded-lg pl-9 pr-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#00f3ff]/50 w-56 sm:w-64 font-mono transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/[0.03] border-b border-white/10 text-gray-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold w-16">Rank</th>
                <th className="py-3.5 px-4 font-semibold">IP Address</th>
                <th className="py-3.5 px-4 font-semibold text-right">Flows</th>
                <th className="py-3.5 px-4 font-semibold text-right">Bytes</th>
                <th className="py-3.5 px-4 font-semibold text-right">Alerts</th>
                <th className="py-3.5 px-4 font-semibold text-center">Threat Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-200">
              {filteredTalkers.map((row, index) => {
                const rank = index + 1;
                return (
                  <tr
                    key={row.ip || index}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-gray-400">
                      <span className="w-6 h-6 rounded bg-white/5 border border-white/10 inline-flex items-center justify-center text-xs group-hover:border-[#00f3ff]/40 group-hover:text-[#00f3ff] transition-colors">
                        #{rank}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-[#00f3ff]" />
                        <span>{row.ip}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-gray-100">
                      {formatNumber(row.flows)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-cyan-300 font-semibold">
                      {formatBytes(row.bytes)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {row.alerts > 0 ? (
                        <span className="font-bold text-[#ff003c] flex items-center justify-end gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-[#ff003c]" />
                          {formatNumber(row.alerts)}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {renderThreatBadge(row.alerts, row.flows)}
                    </td>
                  </tr>
                );
              })}

              {filteredTalkers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">
                    {trafficData.total_flows === 0
                      ? 'Waiting for traffic data... Start a replay to begin analysis.'
                      : 'No endpoints matching filter criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
