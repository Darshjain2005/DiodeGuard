import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  Shield, 
  Activity, 
  RefreshCw, 
  Clock, 
  Terminal, 
  Layers, 
  Radio, 
  Check, 
  X,
  FileCode,
  Network,
  Copy,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const SEVERITIES = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'];

const CATEGORIES = [
  'ALL',
  'Port Scan',
  'DDoS',
  'C2 Beacon',
  'DNS Tunnel',
  'Anomaly',
  'Data Exfil',
  'Encrypted Malware'
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [localStatusMap, setLocalStatusMap] = useState({});

  // Fetch alerts from API with query params
  const fetchAlerts = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.append('severity', selectedSeverity);
      params.append('category', selectedCategory);

      const response = await axios.get(`${API_BASE_URL}/alerts?${params.toString()}`, {
        timeout: 4000
      });

      if (Array.isArray(response.data)) {
        setAlerts(response.data);
        setApiError(null);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setApiError(err.message || 'Unable to connect to ML backend at http://localhost:8000');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setLastUpdated(new Date());
    }
  }, [selectedSeverity, selectedCategory]);

  // Poll every 2 seconds and fetch on mount/filter change
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Client-side text filter on threat_class, source_ip, dest_ip, engine
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const threatClass = String(alert.threat_class || '').toLowerCase();
      const sourceIp = String(alert.source_ip || '').toLowerCase();
      const destIp = String(alert.dest_ip || '').toLowerCase();
      const engine = String(alert.engine || '').toLowerCase();
      const id = String(alert.id || '').toLowerCase();
      const category = String(alert.category || '').toLowerCase();

      return (
        threatClass.includes(q) ||
        sourceIp.includes(q) ||
        destIp.includes(q) ||
        engine.includes(q) ||
        id.includes(q) ||
        category.includes(q)
      );
    });
  }, [alerts, searchQuery]);

  // Severity color badges
  const getSeverityBadge = (severity) => {
    const s = String(severity || '').toUpperCase();
    switch (s) {
      case 'CRITICAL':
        return 'bg-[#ff003c]/20 text-[#ff003c] border-[#ff003c]/50 shadow-[0_0_10px_rgba(255,0,60,0.35)]';
      case 'HIGH':
        return 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]';
      case 'MEDIUM':
        return 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]';
      default:
        return 'bg-[#39ff14]/20 text-[#39ff14] border-[#39ff14]/50 shadow-[0_0_10px_rgba(57,255,20,0.3)]';
    }
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const st = String(status || '').toUpperCase();
    switch (st) {
      case 'NEW':
        return 'bg-[#00f3ff]/15 text-[#00f3ff] border-[#00f3ff]/40 shadow-[0_0_8px_rgba(0,243,255,0.25)]';
      case 'INVESTIGATING':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40 shadow-[0_0_8px_rgba(234,179,8,0.25)]';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-[#39ff14] border-emerald-500/40 shadow-[0_0_8px_rgba(57,255,20,0.25)]';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getEffectiveStatus = (alert) => {
    return localStatusMap[alert.id] || alert.status || 'NEW';
  };

  const handleStatusChange = (e, alertId, newStatus) => {
    e.stopPropagation();
    setLocalStatusMap((prev) => ({
      ...prev,
      [alertId]: newStatus
    }));
  };

  const toggleExpand = (id) => {
    setExpandedAlertId(expandedAlertId === id ? null : id);
  };

  const copyToClipboard = (e, text, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '--:--:--';
    try {
      if (ts.includes('T')) {
        const parts = ts.split('T');
        const timePart = parts[1].slice(0, 8);
        return `${parts[0]} ${timePart}`;
      }
      return ts.slice(0, 19);
    } catch {
      return ts;
    }
  };

  const truncateId = (id) => {
    if (!id) return 'ALT-UNKNOWN';
    if (id.length > 14) {
      return `${id.slice(0, 13)}…`;
    }
    return id;
  };

  // Severity metrics calculation
  const criticalCount = alerts.filter((a) => String(a.severity).toUpperCase() === 'CRITICAL').length;
  const highCount = alerts.filter((a) => String(a.severity).toUpperCase() === 'HIGH').length;
  const mediumCount = alerts.filter((a) => String(a.severity).toUpperCase() === 'MEDIUM').length;

  return (
    <div className="min-h-screen bg-[#050510] text-gray-100 p-6 lg:p-8 space-y-6 font-mono relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#ff003c]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#00f3ff]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Metrics Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/30 border border-white/10 backdrop-blur-md p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 border border-[#ff003c]/30 rounded-lg text-[#ff003c] shadow-[0_0_15px_rgba(255,0,60,0.25)]">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-wider text-white">
                Live Alert Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff]">
                {alerts.length} Total Alerts
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#00f3ff]" />
              Real-time threat triage and anomaly correlation from DiodeGuard ML backend
            </p>
          </div>
        </div>

        {/* Live polling status badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#39ff14]"></span>
            </span>
            <span className="text-gray-300 text-[11px]">
              Poll 2s {lastUpdated && `(${lastUpdated.toLocaleTimeString()})`}
            </span>
          </div>

          <button
            onClick={() => fetchAlerts(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition disabled:opacity-50"
            title="Refresh now"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00f3ff]' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Top Stat Summary Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <div className="bg-black/30 border border-white/10 backdrop-blur-md p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase">Total Detected</span>
            <Activity className="w-4 h-4 text-[#00f3ff]" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{alerts.length}</div>
          <div className="text-[10px] text-gray-500 mt-1">Live from backend stream</div>
        </div>

        <div className="bg-black/30 border border-[#ff003c]/20 backdrop-blur-md p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-400 font-semibold uppercase">Critical</span>
            <AlertTriangle className="w-4 h-4 text-[#ff003c]" />
          </div>
          <div className="text-2xl font-bold text-[#ff003c] mt-1">{criticalCount}</div>
          <div className="text-[10px] text-red-400/60 mt-1">Immediate action required</div>
        </div>

        <div className="bg-black/30 border border-[#f97316]/20 backdrop-blur-md p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-orange-400 font-semibold uppercase">High Severity</span>
            <Zap className="w-4 h-4 text-[#f97316]" />
          </div>
          <div className="text-2xl font-bold text-[#f97316] mt-1">{highCount}</div>
          <div className="text-[10px] text-orange-400/60 mt-1">Active threat anomalies</div>
        </div>

        <div className="bg-black/30 border border-[#eab308]/20 backdrop-blur-md p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-yellow-400 font-semibold uppercase">Medium Severity</span>
            <Shield className="w-4 h-4 text-[#eab308]" />
          </div>
          <div className="text-2xl font-bold text-[#eab308] mt-1">{mediumCount}</div>
          <div className="text-[10px] text-yellow-400/60 mt-1">Under SOC observation</div>
        </div>
      </motion.div>

      {/* Backend Connection Warning if any */}
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/40 p-3.5 rounded-xl flex items-center gap-3 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-[#ff003c] shrink-0" />
          <div className="flex-1">
            <span className="font-bold text-[#ff003c]">API Connection Notice: </span>
            {apiError}. Make sure the DiodeGuard backend is running on port 8000.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-black/30 border border-white/10 backdrop-blur-md p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4"
      >
        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Threat, IP, Engine, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-black/50 border border-white/10 focus:border-[#00f3ff]/50 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00f3ff]/50 transition"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Severity Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#00f3ff]" />
              Severity:
            </span>
            <div className="relative">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="appearance-none bg-black/60 border border-white/10 hover:border-white/25 px-3 py-1.5 pr-8 rounded-lg text-xs text-white focus:outline-none focus:border-[#00f3ff]/50 cursor-pointer"
              >
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev} className="bg-[#0c1120] text-gray-200">
                    {sev}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#00f3ff]" />
              Category:
            </span>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-black/60 border border-white/10 hover:border-white/25 px-3 py-1.5 pr-8 rounded-lg text-xs text-white focus:outline-none focus:border-[#00f3ff]/50 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0c1120] text-gray-200">
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Reset Filters Button */}
          {(selectedSeverity !== 'ALL' || selectedCategory !== 'ALL' || searchQuery !== '') && (
            <button
              onClick={() => {
                setSelectedSeverity('ALL');
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs border border-white/10 transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Alerts Table */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-black/30 border border-white/10 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-[#0c1120]/90 text-gray-400 uppercase tracking-wider text-[11px] border-b border-white/10">
              <tr>
                <th className="py-3.5 px-3 w-8 text-center"></th>
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Threat Class</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Source IP</th>
                <th className="py-3.5 px-4">Dest IP</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4">Engine</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {isLoading && alerts.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-16 text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <RefreshCw className="w-6 h-6 text-[#00f3ff] animate-spin" />
                        <span className="text-xs">Connecting to DiodeGuard ML API...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-16 text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                        <div className="p-3 bg-white/5 rounded-full border border-white/10 text-gray-400">
                          <Terminal className="w-6 h-6 text-gray-500" />
                        </div>
                        <p className="text-xs text-gray-300 font-medium">
                          {alerts.length === 0
                            ? 'No alerts detected yet. Start a replay to generate real detections.'
                            : 'No alerts match the active search/filter criteria.'}
                        </p>
                        {alerts.length === 0 && (
                          <span className="text-[11px] text-gray-500">
                            Navigate to Live Detection to trigger a flow replay or stream real traffic.
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((alert) => {
                    const isExpanded = expandedAlertId === alert.id;
                    const effectiveStatus = getEffectiveStatus(alert);
                    const isCopied = copiedId === alert.id;

                    return (
                      <React.Fragment key={alert.id || alert.timestamp + alert.threat_class}>
                        {/* Main Table Row */}
                        <tr
                          onClick={() => toggleExpand(alert.id)}
                          className={`cursor-pointer transition-colors duration-150 hover:bg-white/[0.04] ${
                            isExpanded ? 'bg-white/[0.03] border-l-2 border-[#00f3ff]' : ''
                          }`}
                        >
                          {/* Expand Icon */}
                          <td className="py-3 px-3 text-center text-gray-400">
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="inline-block"
                            >
                              <ChevronDown className="w-4 h-4 text-[#00f3ff]" />
                            </motion.div>
                          </td>

                          {/* ID (Truncated with click-to-copy) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span 
                                title={alert.id}
                                className="font-bold text-[#00f3ff] text-xs hover:underline cursor-pointer"
                              >
                                {truncateId(alert.id)}
                              </span>
                              <button
                                onClick={(e) => copyToClipboard(e, alert.id, alert.id)}
                                className="text-gray-500 hover:text-white p-0.5 rounded transition"
                                title="Copy Alert ID"
                              >
                                {isCopied ? (
                                  <Check className="w-3 h-3 text-[#39ff14]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Timestamp */}
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap text-[11px]">
                            {formatTimestamp(alert.timestamp)}
                          </td>

                          {/* Threat Class */}
                          <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                            {alert.threat_class || 'Unknown Threat'}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-cyan-300">
                              {alert.category || 'Anomaly'}
                            </span>
                          </td>

                          {/* Severity */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${getSeverityBadge(alert.severity)}`}>
                              {alert.severity || 'MEDIUM'}
                            </span>
                          </td>

                          {/* Source IP */}
                          <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                            <span className="font-semibold text-gray-200">
                              {alert.source_ip || '0.0.0.0'}
                              {alert.src_port ? `:${alert.src_port}` : ''}
                            </span>
                          </td>

                          {/* Dest IP */}
                          <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                            <span className="font-semibold text-gray-200">
                              {alert.dest_ip || '0.0.0.0'}
                              {alert.dst_port ? `:${alert.dst_port}` : ''}
                            </span>
                          </td>

                          {/* Confidence */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#00f3ff] to-[#b000ff]"
                                  style={{ width: `${Math.min(100, Math.max(0, alert.confidence || 0))}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-gray-300">
                                {alert.confidence !== undefined ? `${alert.confidence}%` : 'N/A'}
                              </span>
                            </div>
                          </td>

                          {/* Engine */}
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap text-[11px]">
                            {alert.engine || 'Rule Engine'}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={effectiveStatus}
                                onChange={(e) => handleStatusChange(e, alert.id, e.target.value)}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border cursor-pointer appearance-none bg-black/60 focus:outline-none ${getStatusBadge(effectiveStatus)}`}
                              >
                                <option value="NEW" className="bg-[#0c1120] text-[#00f3ff]">NEW</option>
                                <option value="INVESTIGATING" className="bg-[#0c1120] text-yellow-300">INVESTIGATING</option>
                                <option value="RESOLVED" className="bg-[#0c1120] text-[#39ff14]">RESOLVED</option>
                              </select>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Evidence Row */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr className="bg-black/40">
                              <td colSpan="11" className="p-0">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="p-5 border-l-2 border-[#00f3ff] bg-[#0c1120]/90 space-y-4 text-xs"
                                >
                                  {/* Evidence Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                                    <div className="flex items-center gap-2">
                                      <FileCode className="w-4 h-4 text-[#00f3ff]" />
                                      <span className="font-bold text-white uppercase tracking-wider text-xs">
                                        Evidence & Incident Telemetry
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                      <span className="text-gray-400">
                                        Flow ID: <span className="text-gray-200 font-mono">{alert.flow_id || 'N/A'}</span>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Detailed Breakdown Cards */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Evidence Summary */}
                                    <div className="space-y-2 bg-black/40 p-3.5 rounded-lg border border-white/5">
                                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <Activity className="w-3.5 h-3.5 text-[#00f3ff]" />
                                        Heuristic / Signature Evidence
                                      </span>
                                      <div className="text-gray-200 text-[11px] leading-relaxed bg-black/30 p-2.5 rounded border border-white/5 font-mono">
                                        {typeof alert.evidence === 'string'
                                          ? alert.evidence
                                          : JSON.stringify(alert.evidence, null, 2) || 'Detection triggered by ML baseline anomaly.'}
                                      </div>
                                    </div>

                                    {/* Network Context */}
                                    <div className="space-y-2 bg-black/40 p-3.5 rounded-lg border border-white/5">
                                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <Network className="w-3.5 h-3.5 text-yellow-400" />
                                        Network Flow Parameters
                                      </span>
                                      <div className="space-y-1.5 text-[11px]">
                                        <div className="flex items-center justify-between text-gray-300">
                                          <span className="text-gray-400">Source:</span>
                                          <span className="text-white font-semibold">{alert.source_ip}:{alert.src_port || '0'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-gray-300">
                                          <span className="text-gray-400">Destination:</span>
                                          <span className="text-white font-semibold">{alert.dest_ip}:{alert.dst_port || '0'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-gray-300">
                                          <span className="text-gray-400">Detection Model:</span>
                                          <span className="text-cyan-300 font-semibold">{alert.engine || 'Engine'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-gray-300">
                                          <span className="text-gray-400">Threat Category:</span>
                                          <span className="text-orange-300 font-semibold">{alert.category || 'Anomaly'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quick Actions & Status */}
                                    <div className="space-y-2 bg-black/40 p-3.5 rounded-lg border border-white/5">
                                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-[#39ff14]" />
                                        SOC Incident Actions
                                      </span>
                                      <p className="text-gray-300 text-[11px]">
                                        Current status: <span className="font-bold text-white">{effectiveStatus}</span>
                                      </p>
                                      <div className="pt-2 flex flex-wrap items-center gap-2">
                                        <button 
                                          onClick={(e) => handleStatusChange(e, alert.id, 'RESOLVED')}
                                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded text-[10px] font-bold transition flex items-center gap-1"
                                        >
                                          <Check className="w-3 h-3" /> Mark Resolved
                                        </button>
                                        <button 
                                          onClick={(e) => handleStatusChange(e, alert.id, 'INVESTIGATING')}
                                          className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded text-[10px] font-bold transition flex items-center gap-1"
                                        >
                                          <Clock className="w-3 h-3" /> Investigate
                                        </button>
                                        <button 
                                          onClick={(e) => handleStatusChange(e, alert.id, 'NEW')}
                                          className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-bold transition"
                                        >
                                          Reset to New
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
