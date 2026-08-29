import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, Activity, Bug, Mail, AlertTriangle, MessageSquare, Terminal, FileText, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const SidebarBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const nodes = Array.from({ length: 12 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      r: Math.random() * 1 + 0.3,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.005;

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 243, 255, ${Math.sin(t + n.x)*0.2 + 0.3})`;
        ctx.fill();
      });

      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(0, 243, 255, ${(1 - dist / 80) * 0.15})`;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

const menuItems = [
  { name: 'Overview', path: '/dashboard', icon: Activity, accent: '#00f3ff', rgb: '0,243,255' },
  { name: 'Live Detection', path: '/live', icon: Shield, accent: '#39ff14', rgb: '57,255,20' },
  { name: 'Alerts', path: '/alerts', icon: AlertTriangle, accent: '#ff003c', rgb: '255,0,60' },
  { name: 'Traffic Analytics', path: '/traffic', icon: Terminal, accent: '#a855f7', rgb: '168,85,247' },
  { name: 'Model Performance', path: '/models', icon: Bug, accent: '#f97316', rgb: '249,115,22' },
  { name: 'System Health', path: '/health', icon: MessageSquare, accent: '#00f3ff', rgb: '0,243,255' },
];

const NavItem = ({ item, index }) => {
  const Icon = item.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.06, duration: 0.4 }}
    >
      <NavLink to={item.path} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {({ isActive }) => (
          <div
            className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 overflow-hidden group"
            style={{
              background: isActive ? `rgba(${item.rgb},0.1)` : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
              border: isActive ? `1px solid rgba(${item.rgb},0.3)` : '1px solid transparent',
              boxShadow: isActive ? `0 0 15px rgba(${item.rgb},0.1) inset` : 'none',
            }}
          >
            <Icon size={18} style={{ color: isActive ? item.accent : '#94a3b8' }} />
            <span style={{ color: isActive ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: isActive ? 600 : 400 }}>
              {item.name}
            </span>
          </div>
        )}
      </NavLink>
    </motion.div>
  );
};

const ProfileNavItem = ({ user }) => {
  return (
    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
      <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center font-bold text-xs" style={{ border: '1px solid #334155' }}>
          {user?.name?.slice(0, 2).toUpperCase() || 'OP'}
        </div>
        <div className="flex flex-col">
          <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600 }}>{user?.name || 'Operator'}</span>
          <span style={{ color: '#64748b', fontSize: 11 }}>{user?.role || 'Analyst'}</span>
        </div>
      </div>
    </motion.div>
  );
};

const Sidebar = () => {
  const user = { name: 'Admin', role: 'SOC Analyst', clearanceLevel: 'LEVEL-5' };
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-col w-64 h-full shrink-0 overflow-hidden"
      style={{
        background: 'rgba(3,6,15,0.95)',
        borderRight: '1px solid rgba(0,243,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <SidebarBackground />
      <div className="relative z-10 flex flex-col h-full">
        <motion.div className="flex items-center gap-3 px-5 py-5 border-b border-[#00f3ff]/10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#00f3ff]/10 border border-[#00f3ff]/20 shadow-[0_0_20px_rgba(0,243,255,0.1)]">
            <Shield size={18} style={{ color: '#00f3ff' }} />
          </div>
          <div>
            <h1 className="font-display font-black tracking-widest" style={{ fontSize: 15, color: '#f1f5f9' }}>
              DIODE<span style={{ color: '#00f3ff' }}>GUARD</span>
            </h1>
            <p className="font-mono uppercase tracking-widest text-[11px] text-[#8eb4d4] mt-1">Passive Threat Detection</p>
          </div>
        </motion.div>

        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <div style={{ width: 16, height: 1, background: 'rgba(0,243,255,0.3)' }} />
            <span className="font-mono uppercase tracking-[0.2em] text-[12px] text-[#94a3b8]">Navigation</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3 flex-1">
          {menuItems.map((item, index) => (
            <NavItem key={item.path} item={item} index={index} />
          ))}
        </nav>

        <motion.div className="px-3 pt-3 pb-1 border-t border-white/5">
          <div className="flex items-center gap-2 px-1 mb-1.5">
            <div style={{ width: 16, height: 1, background: 'rgba(168,85,247,0.35)' }} />
            <span className="font-mono uppercase tracking-[0.2em] text-[12px] text-[#94a3b8]">Operator</span>
          </div>
          {user && <ProfileNavItem user={user} />}
        </motion.div>

        <motion.div className="mx-3 mb-3 rounded-2xl p-4 bg-black/40 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono uppercase tracking-widest text-[12px] text-[#94a3b8]">System Status</span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full w-1.5 h-1.5 bg-[#39ff14] shadow-[0_0_6px_#39ff14] animate-pulse" />
              <span className="font-mono font-bold uppercase tracking-widest text-[11px] text-[#39ff14]">Online</span>
            </div>
          </div>
          {[
            { label: 'Engine', val: 'ACTIVE' },
            { label: 'Rules', val: '7 loaded' },
            { label: 'Models', val: '3 online' },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="font-mono uppercase tracking-widest text-[12px] text-[#94a3b8]">{label}</span>
              <span className="font-mono font-bold text-[13px] text-[#a8bdd4]">{val}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <span className="font-mono uppercase tracking-widest text-[12px] text-[#94a3b8]">Time</span>
            <span className="font-mono font-bold text-[11px] text-[#00f3ff]">{time.toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>
        </motion.div>
        
        <div className="px-5 py-3 flex items-center justify-between border-t border-white/10">
          <span className="font-mono uppercase tracking-widest text-[11px] text-[#8eb4d4]">v1.0.0</span>
          <span className="font-mono uppercase tracking-widest text-[11px] text-[#8eb4d4]">DiodeGuard</span>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
