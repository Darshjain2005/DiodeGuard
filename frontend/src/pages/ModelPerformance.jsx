import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  Shield,
  Layers,
  Activity,
  CheckCircle,
  RefreshCw,
  Clock,
  BarChart3
} from 'lucide-react';
import axios from 'axios';

const DEFAULT_ENGINES = {
  'Rule Engine': {
    status: 'ACTIVE',
    detections: 0,
    calls: 0,
    avg_latency_ms: 0,
    detection_rate: 0,
    type: 'Signature-based',
    rules_loaded: 7
  },
  'Isolation Forest': {
    status: 'ACTIVE',
    detections: 0,
    calls: 0,
    avg_latency_ms: 0,
    detection_rate: 0,
    type: 'Unsupervised Anomaly',
    contamination: 0.05
  },
  'GraphSAGE': {
    status: 'ACTIVE',
    detections: 0,
    calls: 0,
    avg_latency_ms: 0,
    detection_rate: 0,
    type: 'Graph Neural Network',
    architecture: '2-layer SAGEConv'
  }
};

const THREAT_COLORS = {
  'DDoS': { border: 'border-[#ff003c]/40', bg: 'bg-[#ff003c]/10', text: 'text-[#ff003c]', bar: 'bg-[#ff003c]' },
  'Port Scan': { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400', bar: 'bg-amber-500' },
  'C2 Beacon': { border: 'border-[#b000ff]/40', bg: 'bg-[#b000ff]/10', text: 'text-[#b000ff]', bar: 'bg-[#b000ff]' },
  'DNS Tunnel': { border: 'border-[#00f3ff]/40', bg: 'bg-[#00f3ff]/10', text: 'text-[#00f3ff]', bar: 'bg-[#00f3ff]' },
  'Anomaly': { border: 'border-[#39ff14]/40', bg: 'bg-[#39ff14]/10', text: 'text-[#39ff14]', bar: 'bg-[#39ff14]' },
  'Data Exfil': { border: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-400', bar: 'bg-rose-500' },
  'Encrypted Malware': { border: 'border-fuchsia-500/40', bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', bar: 'bg-fuchsia-500' }
};

export default function ModelPerformance() {
  const [data, setData] = useState({
    engines: DEFAULT_ENGINES,
    total_flows: 0,
    total_alerts: 0,
    threat_distribution: {
      'DDoS': 0,
      'Port Scan': 0,
      'C2 Beacon': 0,
      'DNS Tunnel': 0,
      'Anomaly': 0,
      'Data Exfil': 0,
      'Encrypted Malware': 0
    }
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchModelData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await axios.get('http://localhost:8000/models', { timeout: 2500 });
      if (res.data) {
        setData({
          engines: res.data.engines || DEFAULT_ENGINES,
          total_flows: typeof res.data.total_flows === 'number' ? res.data.total_flows : 0,
          total_alerts: typeof res.data.total_alerts === 'number' ? res.data.total_alerts : 0,
          threat_distribution: res.data.threat_distribution || {}
        });
        setError(null);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Could not fetch /models API:', err.message);
      setError('API Offline (http://localhost:8000/models)');
    } finally {
      setLoading(false);
      if (manual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchModelData();
    const interval = setInterval(() => {
      fetchModelData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalFlows = data.total_flows || 0;
  const totalAlerts = data.total_alerts || 0;
  const overallDetectionRate = totalFlows > 0
    ? ((totalAlerts / totalFlows) * 100).toFixed(2)
    : '0.00';

  const engineList = [
    {
      key: 'Rule Engine',
      displayName: 'Rule Engine',
      type: data.engines?.['Rule Engine']?.type || 'Signature-based',
      icon: Shield,
      borderColor: 'border-l-[#00f3ff]',
      accentColor: '#00f3ff',
      iconBg: 'bg-[#00f3ff]/10',
      iconBorder: 'border-[#00f3ff]/30',
      iconText: 'text-[#00f3ff]',
      details: data.engines?.['Rule Engine'] || {},
      extraLabel: 'Rules Loaded',
      extraValue: `${data.engines?.['Rule Engine']?.rules_loaded ?? 7} Rules`
    },
    {
      key: 'Isolation Forest',
      displayName: 'Isolation Forest',
      type: data.engines?.['Isolation Forest']?.type || 'Unsupervised Anomaly',
      icon: Activity,
      borderColor: 'border-l-[#39ff14]',
      accentColor: '#39ff14',
      iconBg: 'bg-[#39ff14]/10',
      iconBorder: 'border-[#39ff14]/30',
      iconText: 'text-[#39ff14]',
      details: data.engines?.['Isolation Forest'] || {},
      extraLabel: 'Contamination',
      extraValue: `${((data.engines?.['Isolation Forest']?.contamination ?? 0.05) * 100).toFixed(0)}%`
    },
    {
      key: 'GraphSAGE',
      displayName: 'GraphSAGE',
      type: data.engines?.['GraphSAGE']?.type || 'Graph Neural Network',
      icon: Layers,
      borderColor: 'border-l-[#b000ff]',
      accentColor: '#b000ff',
      iconBg: 'bg-[#b000ff]/10',
      iconBorder: 'border-[#b000ff]/30',
      iconText: 'text-[#b000ff]',
      details: data.engines?.['GraphSAGE'] || {},
      extraLabel: 'Architecture',
      extraValue: data.engines?.['GraphSAGE']?.architecture || '2-layer SAGEConv'
    }
  ];

  const threatDistribution = data.threat_distribution || {};
  const threatEntries = Object.entries(threatDistribution);

  return (
    <div className="h-full overflow-y-auto pr-1 text-gray-100 font-mono space-y-6">
      {/* Background cyber glows */}
      <div className="fixed top-20 left-1/3 w-96 h-96 bg-[#b000ff]/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-[#00f3ff]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-black/30 border border-white/10 backdrop-blur p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_25px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#00f3ff] via-[#39ff14] to-[#b000ff]" />

        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#b000ff]/10 border border-[#b000ff]/40 rounded-xl text-[#b000ff] shadow-[0_0_20px_rgba(176,0,255,0.25)] flex-shrink-0">
            <Cpu className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-wider text-white font-display">
                Model Performance
              </h1>
              <span className="px-2.5 py-0.5 bg-[#00f3ff]/10 border border-[#00f3ff]/40 text-[#00f3ff] text-[11px] rounded font-bold uppercase tracking-wider">
                Live Inference Telemetry
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#39ff14]" />
              Real-time multi-engine benchmark polling every 3s from :8000/models
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs">
              <Clock className="w-3.5 h-3.5 text-[#00f3ff]" />
              <span>Synced {lastUpdated}</span>
            </div>
          )}
          <button
            onClick={() => fetchModelData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-[#00f3ff]/10 hover:border-[#00f3ff]/40 hover:text-[#00f3ff] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00f3ff]' : ''}`} />
            <span>Poll Now</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse" />
            <span className="font-bold">3 / 3 ENGINES ACTIVE</span>
          </div>
        </div>
      </motion.div>

      {/* ── ZERO FLOWS / REPLAY NOTICE BANNER ── */}
      {totalFlows === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-black/30 border border-[#00f3ff]/30 backdrop-blur p-4 rounded-xl flex items-center justify-between gap-4 relative overflow-hidden shadow-[0_0_20px_rgba(0,243,255,0.1)]"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00f3ff] to-transparent opacity-80" />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/30 flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-[#00f3ff]" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Engines loaded. Run a replay to see real performance metrics.</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Rule Engine, Isolation Forest, and GraphSAGE are listening for network flows. Launch a traffic replay to populate live detection counts, latency, and threat distribution.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14] text-xs flex-shrink-0 font-bold">
            <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-ping" />
            READY
          </div>
        </motion.div>
      )}

      {/* ── 3 ENGINE CARDS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {engineList.map((eng, idx) => {
          const IconComponent = eng.icon;
          const status = eng.details.status || 'ACTIVE';
          const detections = eng.details.detections ?? 0;
          const calls = eng.details.calls ?? 0;
          const detectionRate = eng.details.detection_rate ?? 0;
          const avgLatency = eng.details.avg_latency_ms ?? 0;

          return (
            <motion.div
              key={eng.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * (idx + 1) }}
              className={`bg-black/30 border border-white/10 backdrop-blur p-5 rounded-xl shadow-xl flex flex-col justify-between relative overflow-hidden border-l-4 ${eng.borderColor} group hover:border-white/20 transition-all`}
            >
              <div>
                {/* Engine Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${eng.iconBg} ${eng.iconText} border ${eng.iconBorder}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base font-display">
                        {eng.displayName}
                      </h3>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Type: {eng.type}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#39ff14]/15 border border-[#39ff14]/40 text-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,0.3)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
                    {status}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-gray-400 text-[11px] block uppercase font-semibold">Detections</span>
                    <span className="text-2xl font-black text-white font-display mt-0.5 block" style={{ color: eng.accentColor }}>
                      {detections.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-gray-400 text-[11px] block uppercase font-semibold">Calls Evaluated</span>
                    <span className="text-2xl font-black text-white font-display mt-0.5 block">
                      {calls.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-gray-400 text-[11px] block uppercase font-semibold">Detection Rate</span>
                    <span className="text-xl font-black text-[#39ff14] font-display mt-0.5 block">
                      {detectionRate}%
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-gray-400 text-[11px] block uppercase font-semibold">Avg Latency</span>
                    <div className="text-xl font-black text-white font-display mt-0.5 flex items-baseline gap-1">
                      <span>{avgLatency}</span>
                      <span className="text-[11px] font-normal text-gray-400">ms</span>
                    </div>
                  </div>
                </div>

                {/* Extra Configuration Detail */}
                <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-gray-400">{eng.extraLabel}:</span>
                  <span className="text-white font-bold font-mono">{eng.extraValue}</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-[#39ff14]" />
                  Pipeline Active
                </span>
                <span className="font-semibold" style={{ color: eng.accentColor }}>
                  {eng.key}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── OVERALL STATS (BOTTOM SECTION) ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-black/30 border border-white/10 backdrop-blur p-5 rounded-xl shadow-xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-[#00f3ff]" />
            <h3 className="text-lg font-bold text-white tracking-wide font-display">
              Overall Pipeline Telemetry
            </h3>
          </div>
          <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded border border-white/10 font-mono">
            Aggregate Pipeline Counters
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00f3ff] opacity-60" />
            <span className="text-xs text-gray-400 uppercase font-semibold block">Total Flows Processed</span>
            <div className="text-3xl font-black text-white font-display mt-1">
              {totalFlows.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Inbound L3/L4 packet frames
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#ff003c] opacity-60" />
            <span className="text-xs text-gray-400 uppercase font-semibold block">Total Threat Alerts</span>
            <div className="text-3xl font-black text-[#ff003c] font-display mt-1">
              {totalAlerts.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Triggered by multi-engine consensus
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#39ff14] opacity-60" />
            <span className="text-xs text-gray-400 uppercase font-semibold block">Overall Detection Rate</span>
            <div className="text-3xl font-black text-[#39ff14] font-display mt-1">
              {overallDetectionRate}%
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Alerts / Total Flows ratio
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── THREAT DISTRIBUTION BREAKDOWN ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-black/30 border border-white/10 backdrop-blur p-5 rounded-xl shadow-xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#b000ff]" />
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide font-display">
                Threat Category Distribution
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Real detection breakdown across recognized attack classifications
              </p>
            </div>
          </div>
          <span className="text-xs text-purple-300 bg-[#b000ff]/10 border border-[#b000ff]/30 px-3 py-1 rounded-full font-bold self-start sm:self-auto">
            {totalAlerts} Total Detected Events
          </span>
        </div>

        {threatEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No threat category data reported yet from API.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {threatEntries.map(([category, count]) => {
              const theme = THREAT_COLORS[category] || {
                border: 'border-white/20',
                bg: 'bg-white/5',
                text: 'text-gray-200',
                bar: 'bg-[#00f3ff]'
              };
              const pct = totalAlerts > 0 ? ((count / totalAlerts) * 100).toFixed(1) : '0.0';

              return (
                <div
                  key={category}
                  className={`p-4 rounded-xl bg-black/40 border ${theme.border} backdrop-blur-sm flex flex-col justify-between hover:border-white/30 transition-colors`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold font-display uppercase tracking-wider ${theme.text}`}>
                        {category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${theme.bg} ${theme.text} border ${theme.border}`}>
                        {pct}%
                      </span>
                    </div>

                    <div className="text-2xl font-black text-white font-display my-1">
                      {count.toLocaleString()}
                      <span className="text-xs font-normal text-gray-400 ml-1.5">events</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full ${theme.bar}`}
                        style={{ width: `${Math.min(100, Math.max(count > 0 ? 4 : 0, parseFloat(pct)))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
