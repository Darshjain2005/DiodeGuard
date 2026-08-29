import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  Activity, 
  Shield, 
  Zap, 
  Play, 
  Square,
  Cpu,
  Clock,
  Terminal,
  RotateCcw
} from 'lucide-react';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = 'http://127.0.0.1:5000';
const BACKEND_BASE_URL = 'http://localhost:8000';

export default function LiveDetection() {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReplayRunning, setIsReplayRunning] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    total_flows: 0,
    total_alerts: 0,
    detection_rate: '0.0%'
  });

  // 1. Connect to Socket.IO at http://127.0.0.1:5000
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    // 2. Listen for 'new_activity' events
    socket.on('new_activity', (data) => {
      if (!data) return;
      const raw = data.raw_alert || data;

      const newAlert = {
        id: raw.id || raw.flow_id || `ALERT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: raw.timestamp || new Date().toISOString(),
        threat_class: raw.threat_class || raw.threatClass || data.text || 'Threat Detected',
        category: raw.category || 'Anomaly',
        severity: (raw.severity || data.type || 'MEDIUM').toUpperCase(),
        source_ip: raw.source_ip || raw.sourceIp || raw.src_ip || 'N/A',
        dest_ip: raw.dest_ip || raw.destIp || raw.dst_ip || 'N/A',
        confidence: typeof raw.confidence === 'number' 
          ? raw.confidence 
          : (parseFloat(raw.confidence) || 0),
        engine: raw.engine || 'Engine',
        evidence: raw.evidence || '',
        flow_id: raw.flow_id || ''
      };

      setAlerts((prev) => [newAlert, ...prev].slice(0, 100));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 3 & 4. Fetch metrics and replay status every 2 seconds
  useEffect(() => {
    const fetchMetricsAndStatus = async () => {
      try {
        const [metricsRes, statusRes] = await Promise.allSettled([
          axios.get(`${BACKEND_BASE_URL}/metrics`, { timeout: 1800 }),
          axios.get(`${BACKEND_BASE_URL}/replay/status`, { timeout: 1800 })
        ]);

        if (metricsRes.status === 'fulfilled' && metricsRes.value.data) {
          setMetrics(metricsRes.value.data);
        }
        if (statusRes.status === 'fulfilled' && statusRes.value.data) {
          setIsReplayRunning(Boolean(statusRes.value.data.running));
        }
      } catch (err) {
        console.error('Error fetching metrics or replay status:', err);
      }
    };

    fetchMetricsAndStatus();
    const interval = setInterval(fetchMetricsAndStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handle Replay Actions
  const handleStartReplay = async () => {
    setIsActionLoading(true);
    try {
      await axios.post(
        `${BACKEND_BASE_URL}/replay`, 
        { count: 500, delay: 0.2 },
        { headers: { 'Content-Type': 'application/json' }, timeout: 4000 }
      );
      setIsReplayRunning(true);
    } catch (err) {
      console.error('Failed to start replay:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStopReplay = async () => {
    setIsActionLoading(true);
    try {
      await axios.post(`${BACKEND_BASE_URL}/replay/stop`, {}, { timeout: 4000 });
      setIsReplayRunning(false);
    } catch (err) {
      console.error('Failed to stop replay:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Severity Badge Styling
  const getSeverityBadgeClass = (severity) => {
    const s = String(severity || '').toUpperCase();
    switch (s) {
      case 'CRITICAL':
        return 'bg-[#ff003c]/15 text-[#ff003c] border-[#ff003c]/40 shadow-[0_0_12px_rgba(255,0,60,0.3)]';
      case 'HIGH':
        return 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/40 shadow-[0_0_12px_rgba(249,115,22,0.3)]';
      case 'MEDIUM':
        return 'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/40 shadow-[0_0_12px_rgba(234,179,8,0.25)]';
      case 'LOW':
      default:
        return 'bg-[#39ff14]/15 text-[#39ff14] border-[#39ff14]/40 shadow-[0_0_12px_rgba(57,255,20,0.25)]';
    }
  };

  // Timestamp Formatter
  const formatTime = (ts) => {
    if (!ts) return '--:--:--';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      const ms = String(d.getMilliseconds()).padStart(3, '0');
      return `${hours}:${mins}:${secs}.${ms}`;
    } catch {
      return String(ts);
    }
  };

  // Confidence color bar
  const getConfidenceBarColor = (conf) => {
    const val = parseFloat(conf) || 0;
    if (val >= 90) return 'from-[#f97316] to-[#ff003c]';
    if (val >= 75) return 'from-[#eab308] to-[#f97316]';
    if (val >= 50) return 'from-[#00f3ff] to-[#39ff14]';
    return 'from-emerald-500 to-[#39ff14]';
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  return (
    <div className="min-h-screen bg-[#050510] text-gray-100 p-6 lg:p-8 space-y-6 font-mono relative overflow-hidden">
      {/* Background cyber ambient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00f3ff]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-[#b000ff]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/40 border border-white/10 backdrop-blur-md p-5 rounded-xl relative overflow-hidden shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#00f3ff]/10 border border-[#00f3ff]/30 rounded-lg text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.25)]">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              {/* Title with Pulsing Green Dot */}
              <h1 className="text-2xl font-bold tracking-wider text-white flex items-center gap-3">
                <span>Live Detection Engine</span>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#39ff14]"></span>
                </span>
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-[#39ff14]' : 'bg-[#ff003c]'}`} />
              Socket.IO Status: <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{isConnected ? 'Connected (127.0.0.1:5000)' : 'Disconnected'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls: Start / Stop Replay */}
        <div className="flex items-center gap-3">
          {alerts.length > 0 && (
            <button
              onClick={clearAlerts}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
              title="Clear table feed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          {isReplayRunning ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStopReplay}
              disabled={isActionLoading}
              className="relative px-5 py-2.5 rounded-lg bg-[#ff003c]/20 border border-[#ff003c] text-[#ff003c] font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(255,0,60,0.4)] hover:bg-[#ff003c]/30 transition disabled:opacity-50"
            >
              <Square className="w-4 h-4 fill-[#ff003c]" />
              {isActionLoading ? 'Stopping...' : 'Stop Replay'}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartReplay}
              disabled={isActionLoading}
              className="relative px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00f3ff] to-[#b000ff] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:shadow-[0_0_25px_rgba(176,0,255,0.6)] transition disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-black" />
              {isActionLoading ? 'Starting...' : 'Start Replay'}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* 3 Stat Cards (Total Flows, Alerts Generated, Detection Rate) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: Total Flows */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/40 border border-white/10 backdrop-blur-md p-4 rounded-xl relative overflow-hidden group hover:border-[#00f3ff]/40 transition shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-gray-400 tracking-wider">Total Flows</span>
            <div className="p-2 bg-[#00f3ff]/10 rounded-lg text-[#00f3ff]">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-2 tracking-tight">
            {(metrics.total_flows ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="text-[#00f3ff]">●</span> Live flow reader stream
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f3ff]/60 to-transparent" />
        </motion.div>

        {/* Stat 2: Alerts Generated */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black/40 border border-white/10 backdrop-blur-md p-4 rounded-xl relative overflow-hidden group hover:border-[#ff003c]/40 transition shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-gray-400 tracking-wider">Alerts Generated</span>
            <div className="p-2 bg-[#ff003c]/10 rounded-lg text-[#ff003c]">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#ff003c] mt-2 tracking-tight">
            {(metrics.total_alerts ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="text-[#ff003c]">●</span> Flagged malicious signatures
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff003c]/60 to-transparent" />
        </motion.div>

        {/* Stat 3: Detection Rate */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-black/40 border border-white/10 backdrop-blur-md p-4 rounded-xl relative overflow-hidden group hover:border-[#39ff14]/40 transition shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-gray-400 tracking-wider">Detection Rate</span>
            <div className="p-2 bg-[#39ff14]/10 rounded-lg text-[#39ff14]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#39ff14] mt-2 tracking-tight">
            {typeof metrics.detection_rate === 'string' 
              ? metrics.detection_rate 
              : `${(metrics.detection_rate ?? 0)}%`}
          </div>
          <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="text-[#39ff14]">●</span> Multi-engine inference ratio
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#39ff14]/60 to-transparent" />
        </motion.div>
      </div>

      {/* Live Alert Table Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-black/40 border border-white/10 backdrop-blur-md rounded-xl p-5 shadow-2xl relative"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#00f3ff]" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
              Live Ingest Stream ({alerts.length} events buffered)
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Socket.IO Ingest
            </span>
          </div>
        </div>

        {/* Table / Empty State Container */}
        <div className="overflow-x-auto rounded-lg border border-white/5">
          {alerts.length === 0 ? (
            <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-[#00f3ff]/10 border border-[#00f3ff]/30 flex items-center justify-center text-[#00f3ff] animate-pulse">
                  <Radio className="w-8 h-8" />
                </div>
                <div className="absolute inset-0 rounded-full border border-[#00f3ff]/20 animate-ping" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-sm text-gray-300 font-semibold tracking-wide">
                  Waiting for detections... Click Start Replay to begin processing flows.
                </p>
                <p className="text-xs text-gray-500">
                  Listening on WebSocket event <span className="text-[#00f3ff]">new_activity</span> for real-time alerts.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0c1120]/90 sticky top-0 z-10 text-gray-400 uppercase tracking-wider text-[11px] border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Time</th>
                    <th className="py-3.5 px-4 font-semibold">Threat Class</th>
                    <th className="py-3.5 px-4 font-semibold">Severity</th>
                    <th className="py-3.5 px-4 font-semibold">Source IP</th>
                    <th className="py-3.5 px-4 font-semibold">Dest IP</th>
                    <th className="py-3.5 px-4 font-semibold">Confidence %</th>
                    <th className="py-3.5 px-4 font-semibold">Engine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  <AnimatePresence initial={false}>
                    {alerts.map((alert) => {
                      const badgeClass = getSeverityBadgeClass(alert.severity);
                      const confValue = Math.min(100, Math.max(0, alert.confidence));

                      return (
                        <motion.tr
                          key={alert.id}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 30 }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          className="hover:bg-white/[0.04] transition-colors"
                        >
                          {/* Time */}
                          <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                            {formatTime(alert.timestamp)}
                          </td>

                          {/* Threat Class */}
                          <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                            <span className="text-gray-100">{alert.threat_class}</span>
                          </td>

                          {/* Severity Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${badgeClass}`}>
                              {alert.severity}
                            </span>
                          </td>

                          {/* Source IP */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-cyan-300/90">{alert.source_ip}</span>
                          </td>

                          {/* Dest IP */}
                          <td className="py-3 px-4 whitespace-nowrap text-gray-300">
                            {alert.dest_ip}
                          </td>

                          {/* Confidence % */}
                          <td className="py-3 px-4 whitespace-nowrap min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-800 rounded-full h-1.5 overflow-hidden border border-white/10">
                                <div
                                  className={`h-full bg-gradient-to-r ${getConfidenceBarColor(confValue)}`}
                                  style={{ width: `${confValue}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-gray-200">
                                {confValue.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Engine */}
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-xs text-purple-300/90 bg-purple-950/40 border border-purple-500/20 px-2 py-0.5 rounded">
                              <Cpu className="w-3 h-3 text-[#b000ff]" />
                              {alert.engine}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
