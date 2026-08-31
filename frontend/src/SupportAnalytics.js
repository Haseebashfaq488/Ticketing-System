import React, { useState, useMemo } from 'react';

// Sample agent roster with real avatars
const AGENT_DATA = [
  {
    id: 1,
    name: 'James Smith',
    role: 'Senior Escalation Engineer',
    department: 'tech',
    team: 'escalations',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    resolved: 147,
    csat: 94,
    resolutionRate: 96,
    avgTime: '1.8h',
    status: 'online',
  },
  {
    id: 2,
    name: 'Roxana Jones',
    role: 'Billing & Enterprise Specialist',
    department: 'billing',
    team: 'vip',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80',
    resolved: 131,
    csat: 91,
    resolutionRate: 92,
    avgTime: '2.4h',
    status: 'online',
  },
  {
    id: 3,
    name: 'Marcus Vance',
    role: 'Tier-1 Response Lead',
    department: 'tech',
    team: 'tier1',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    resolved: 118,
    csat: 89,
    resolutionRate: 88,
    avgTime: '1.2h',
    status: 'busy',
  },
  {
    id: 4,
    name: 'Elena Rostova',
    role: 'Customer Success Manager',
    department: 'enterprise',
    team: 'vip',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
    resolved: 95,
    csat: 97,
    resolutionRate: 98,
    avgTime: '3.1h',
    status: 'online',
  },
  {
    id: 5,
    name: 'David Chen',
    role: 'DevOps & Infrastructure Architect',
    department: 'devops',
    team: 'escalations',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    resolved: 84,
    csat: 93,
    resolutionRate: 91,
    avgTime: '2.0h',
    status: 'offline',
  },
];

// Helper to draw radial semi-circle gauge
function RadialGauge({ value, max = 100, label, target, unit = '%', color = 'var(--accent-cyan)' }) {
  const radius = 64;
  const strokeWidth = 12;
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = normalizedValue / max;
  
  // Semi-circle circumference
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);

  return (
    <div className="radial-gauge-container">
      <div className="radial-gauge-svg-wrap">
        <svg viewBox="0 0 160 95" className="radial-gauge-svg">
          {/* Background Arc */}
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke="var(--bg-input)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress Arc */}
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div className="radial-gauge-value-display">
          <span className="gauge-number">{value}{unit}</span>
        </div>
      </div>
      <div className="gauge-meta">
        <span className="gauge-title">{label}</span>
        <span className="gauge-target">Target: <strong>{target}</strong></span>
      </div>
    </div>
  );
}

function SupportAnalytics({ ticketsCount = 0 }) {
  const [dateRange, setDateRange] = useState('30d');
  const [department, setDepartment] = useState('all');
  const [agentTeam, setAgentTeam] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({
    dateRange: '30d',
    department: 'all',
    agentTeam: 'all',
  });
  const [filterNotification, setFilterNotification] = useState(false);
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null);
  const [hoveredHeatmapCell, setHoveredHeatmapCell] = useState(null);
  const [activeChannels, setActiveChannels] = useState({
    email: true,
    chat: true,
    phone: true,
  });

  const handleApplyFilters = () => {
    setAppliedFilters({
      dateRange,
      department,
      agentTeam,
    });
    setFilterNotification(true);
    setTimeout(() => setFilterNotification(false), 2400);
  };

  // Generate dynamic data points for the trend graph based on date range
  const trendData = useMemo(() => {
    const daysCount = appliedFilters.dateRange === '7d' ? 7 : appliedFilters.dateRange === '90d' ? 90 : 30;
    const step = daysCount === 90 ? 3 : 1;
    const points = [];
    
    // Seeded modifier based on department/team
    const multiplier = appliedFilters.department === 'tech' ? 1.3 : appliedFilters.department === 'billing' ? 0.9 : 1.0;
    
    for (let i = 1; i <= daysCount; i += step) {
      // Dynamic wavy values
      const baseWave = Math.sin(i * 0.4) * 8 + Math.cos(i * 0.2) * 5;
      const email = Math.max(10, Math.round((26 + baseWave * 1.2 + ((i * 7) % 11)) * multiplier));
      const chat = Math.max(8, Math.round((18 + baseWave * 0.9 + ((i * 5) % 9)) * multiplier));
      const phone = Math.max(4, Math.round((12 + baseWave * 0.6 + ((i * 3) % 7)) * multiplier));
      
      points.push({
        day: i,
        label: `Day ${i}`,
        email,
        chat,
        phone,
        total: email + chat + phone,
      });
    }
    return points;
  }, [appliedFilters]);

  // Compute overall dynamic metrics
  const metrics = useMemo(() => {
    let csat = 88;
    let avgHours = 24;
    let backlog = 145;
    let fcr = 79;

    if (appliedFilters.department === 'tech') {
      csat = 86;
      avgHours = 28;
      backlog = 168;
      fcr = 74;
    } else if (appliedFilters.department === 'billing') {
      csat = 92;
      avgHours = 18;
      backlog = 94;
      fcr = 86;
    } else if (appliedFilters.department === 'enterprise') {
      csat = 95;
      avgHours = 14;
      backlog = 62;
      fcr = 91;
    }

    if (appliedFilters.dateRange === '7d') {
      backlog = Math.round(backlog * 0.85);
    } else if (appliedFilters.dateRange === '90d') {
      backlog = Math.round(backlog * 1.25);
    }

    return { csat, avgHours, backlog, fcr };
  }, [appliedFilters]);

  // Filtered agents leaderboard
  const filteredAgents = useMemo(() => {
    return AGENT_DATA.filter((agent) => {
      const matchDept = appliedFilters.department === 'all' || agent.department === appliedFilters.department;
      const matchTeam = appliedFilters.agentTeam === 'all' || agent.team === appliedFilters.agentTeam;
      return matchDept && matchTeam;
    });
  }, [appliedFilters]);

  // Category breakdown distribution
  const categories = [
    { name: 'Billing & Invoicing', email: 42, chat: 38, phone: 20, total: '34%' },
    { name: 'Technical & API Issues', email: 58, chat: 28, phone: 14, total: '28%' },
    { name: 'Feature Requests & Enhancements', email: 30, chat: 55, phone: 15, total: '18%' },
    { name: 'Account Access & Security', email: 25, chat: 45, phone: 30, total: '12%' },
    { name: 'DevOps & Server Infrastructure', email: 65, chat: 20, phone: 15, total: '8%' },
  ];

  // 7 days x 24 hours peak heatmap matrix
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

  const getHeatmapIntensity = (dayIdx, hour) => {
    // Peak hours between 11:00 and 17:00 on weekdays (Mon-Fri)
    const isWeekday = dayIdx < 5;
    const isPeakHour = hour >= 10 && hour <= 17;
    const isSubPeak = (hour >= 8 && hour < 10) || (hour > 17 && hour <= 20);

    let base = 0.1;
    if (isWeekday && isPeakHour) {
      // High intensity ring
      const distFromCenter = Math.abs(hour - 14) + Math.abs(dayIdx - 2);
      base = 0.95 - distFromCenter * 0.12;
    } else if (isWeekday && isSubPeak) {
      base = 0.45;
    } else if (!isWeekday && isPeakHour) {
      base = 0.35;
    } else {
      base = 0.15;
    }
    return Math.min(Math.max(base, 0.08), 1.0);
  };

  // SVG Chart bounds
  const chartWidth = 560;
  const chartHeight = 220;
  const chartPadding = { top: 20, right: 20, bottom: 35, left: 35 };
  const graphW = chartWidth - chartPadding.left - chartPadding.right;
  const graphH = chartHeight - chartPadding.top - chartPadding.bottom;

  const maxVal = 50;

  const getSvgCoordinates = (points, key) => {
    if (!points.length) return '';
    return points
      .map((p, idx) => {
        const x = chartPadding.left + (idx / (points.length - 1)) * graphW;
        const y = chartPadding.top + graphH - (p[key] / maxVal) * graphH;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="support-analytics-root animate-fade-in">
      {/* Top Header & Interactive Filter Bar */}
      <div className="analytics-header-card card">
        <div className="analytics-title-group">
          <div className="badge-pill" style={{ marginBottom: '8px' }}>
            Executive Intelligence & Analytics
          </div>
          <h1 className="analytics-heading">
            Interactive Support <span className="grad-text">Analytics Dashboard</span>
          </h1>
          <p className="analytics-subtext">
            Comprehensive SLA telemetry, multi-channel volume tracking, and agent performance matrices.
          </p>
        </div>

        {/* Filters Controls Bar */}
        <div className="analytics-filter-controls">
          <div className="filter-select-group">
            <label className="filter-label">Date Range</label>
            <select
              className="analytics-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>

          <div className="filter-select-group">
            <label className="filter-label">Department</label>
            <select
              className="analytics-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="all">All Departments</option>
              <option value="tech">Technical Support</option>
              <option value="billing">Billing & Finance</option>
              <option value="enterprise">Enterprise Success</option>
              <option value="devops">DevOps & Cloud</option>
            </select>
          </div>

          <div className="filter-select-group">
            <label className="filter-label">Agent Team</label>
            <select
              className="analytics-select"
              value={agentTeam}
              onChange={(e) => setAgentTeam(e.target.value)}
            >
              <option value="all">All Teams</option>
              <option value="tier1">Tier 1 Support</option>
              <option value="escalations">Escalation Specialists</option>
              <option value="vip">VIP Enterprise</option>
            </select>
          </div>

          <button
            className="btn primary apply-filters-btn"
            onClick={handleApplyFilters}
          >
            <svg className="icon-svg" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Apply Filters
          </button>
        </div>

        {filterNotification && (
          <div className="filter-feedback-toast animate-fade-in">
            ✓ Analytics updated for <strong>{dateRange.toUpperCase()}</strong> ({department === 'all' ? 'All Depts' : department.toUpperCase()})
          </div>
        )}
      </div>

      {/* Row 1: Executive KPI Radial Gauges */}
      <div className="gauges-grid">
        {/* Gauge 1: CSAT Score */}
        <div className="card gauge-card">
          <div className="gauge-card-header">
            <span className="gauge-kpi-badge" style={{ color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.12)' }}>
              +2.4% vs last month
            </span>
          </div>
          <RadialGauge
            value={metrics.csat}
            max={100}
            unit="%"
            label="CSAT Score (Overall)"
            target="90%"
            color="var(--accent-emerald)"
          />
        </div>

        {/* Gauge 2: Avg Resolution Time */}
        <div className="card gauge-card">
          <div className="gauge-card-header">
            <span className="gauge-kpi-badge" style={{ color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.12)' }}>
              -15% resolution time
            </span>
          </div>
          <RadialGauge
            value={metrics.avgHours}
            max={48}
            unit="h"
            label="Avg. Resolution Time (Hrs)"
            target="<20h"
            color="var(--accent-cyan)"
          />
        </div>

        {/* Gauge 3: Ticket Backlog */}
        <div className="card gauge-card">
          <div className="gauge-card-header">
            <span className="gauge-kpi-badge" style={{ color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.12)' }}>
              72.5% Capacity
            </span>
          </div>
          <RadialGauge
            value={metrics.backlog}
            max={200}
            unit=""
            label="Ticket Backlog"
            target="Capacity: 200"
            color="var(--accent-amber)"
          />
        </div>
      </div>

      {/* Row 2: Ticket Volume Trends & Peak Support Hours Heatmap */}
      <div className="analytics-charts-grid">
        {/* Left: Ticket Volume Trends Multi-Channel Chart */}
        <div className="card chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Ticket Volume Trends (Daily)</h3>
              <p className="chart-subtitle">Incoming volume per channel across time</p>
            </div>

            {/* Interactive Channel Legend Toggles */}
            <div className="chart-legend-toggles">
              <button
                className={`legend-pill ${activeChannels.email ? 'active email' : 'inactive'}`}
                onClick={() => setActiveChannels((p) => ({ ...p, email: !p.email }))}
              >
                <span className="legend-dot dot-email" /> Email
              </button>
              <button
                className={`legend-pill ${activeChannels.chat ? 'active chat' : 'inactive'}`}
                onClick={() => setActiveChannels((p) => ({ ...p, chat: !p.chat }))}
              >
                <span className="legend-dot dot-chat" /> Live Chat
              </button>
              <button
                className={`legend-pill ${activeChannels.phone ? 'active phone' : 'inactive'}`}
                onClick={() => setActiveChannels((p) => ({ ...p, phone: !p.phone }))}
              >
                <span className="legend-dot dot-phone" /> Phone / Portal
              </button>
            </div>
          </div>

          {/* SVG Multi-Line Chart Container */}
          <div className="trend-svg-container" style={{ position: 'relative' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="trend-chart-svg"
            >
              {/* Horizontal Grid lines */}
              {[0, 10, 20, 30, 40].map((val) => {
                const y = chartPadding.top + graphH - (val / maxVal) * graphH;
                return (
                  <g key={val}>
                    <line
                      x1={chartPadding.left}
                      y1={y}
                      x2={chartWidth - chartPadding.right}
                      y2={y}
                      stroke="var(--border-color)"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={chartPadding.left - 8}
                      y={y + 4}
                      fill="var(--text-muted)"
                      fontSize="11"
                      textAnchor="end"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* X-axis days markers */}
              {trendData
                .filter((_, idx) => idx % Math.max(1, Math.floor(trendData.length / 6)) === 0)
                .map((pt, idx, arr) => {
                  const origIdx = trendData.findIndex((p) => p.day === pt.day);
                  const x = chartPadding.left + (origIdx / (trendData.length - 1)) * graphW;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y={chartHeight - 10}
                      fill="var(--text-muted)"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      Day {pt.day}
                    </text>
                  );
                })}

              {/* Path lines */}
              {activeChannels.email && (
                <path
                  d={getSvgCoordinates(trendData, 'email')}
                  fill="none"
                  stroke="var(--accent-purple)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {activeChannels.chat && (
                <path
                  d={getSvgCoordinates(trendData, 'chat')}
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {activeChannels.phone && (
                <path
                  d={getSvgCoordinates(trendData, 'phone')}
                  fill="none"
                  stroke="var(--text-secondary)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              )}

              {/* Interactive Hover Detection Overlay */}
              {trendData.map((pt, idx) => {
                const x = chartPadding.left + (idx / (trendData.length - 1)) * graphW;
                const isHovered = hoveredTrendPoint?.day === pt.day;

                return (
                  <g key={pt.day} onMouseEnter={() => setHoveredTrendPoint(pt)}>
                    <rect
                      x={x - graphW / trendData.length / 2}
                      y={chartPadding.top}
                      width={graphW / trendData.length}
                      height={graphH}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                    />
                    {isHovered && (
                      <>
                        <line
                          x1={x}
                          y1={chartPadding.top}
                          x2={x}
                          y2={chartPadding.top + graphH}
                          stroke="var(--accent-cyan)"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                        />
                        {activeChannels.email && (
                          <circle
                            cx={x}
                            cy={chartPadding.top + graphH - (pt.email / maxVal) * graphH}
                            r="5"
                            fill="var(--accent-purple)"
                            stroke="#fff"
                            strokeWidth="2"
                          />
                        )}
                        {activeChannels.chat && (
                          <circle
                            cx={x}
                            cy={chartPadding.top + graphH - (pt.chat / maxVal) * graphH}
                            r="5"
                            fill="var(--accent-cyan)"
                            stroke="#fff"
                            strokeWidth="2"
                          />
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Floating Tooltip */}
            {hoveredTrendPoint && (
              <div
                className="chart-floating-tooltip animate-fade-in"
                style={{
                  left: `${chartPadding.left + ((hoveredTrendPoint.day - 1) / (trendData.length - 1)) * 75}%`,
                  top: '15px',
                }}
              >
                <div className="tooltip-header">{hoveredTrendPoint.label}</div>
                <div className="tooltip-row">
                  <span style={{ color: 'var(--accent-purple)' }}>● Email:</span>
                  <strong>{hoveredTrendPoint.email}</strong>
                </div>
                <div className="tooltip-row">
                  <span style={{ color: 'var(--accent-cyan)' }}>● Chat:</span>
                  <strong>{hoveredTrendPoint.chat}</strong>
                </div>
                <div className="tooltip-row">
                  <span style={{ color: 'var(--text-secondary)' }}>● Phone:</span>
                  <strong>{hoveredTrendPoint.phone}</strong>
                </div>
                <div className="tooltip-footer">Total: {hoveredTrendPoint.total} tickets</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Peak Support Hours Weekly Heatmap Matrix */}
        <div className="card chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Peak Support Hours (Weekly)</h3>
              <p className="chart-subtitle">Hourly traffic intensity matrix</p>
            </div>
            <div className="heatmap-legend">
              <span className="legend-label">Low</span>
              <div className="heatmap-gradient-bar" />
              <span className="legend-label">High</span>
            </div>
          </div>

          <div className="heatmap-matrix-container">
            <div className="heatmap-matrix-grid">
              {daysOfWeek.map((day, dayIdx) => (
                <div key={day} className="heatmap-row">
                  <div className="heatmap-day-label">{day}</div>
                  <div className="heatmap-cells-track">
                    {hoursOfDay.map((hour) => {
                      const intensity = getHeatmapIntensity(dayIdx, hour);
                      const isHovered =
                        hoveredHeatmapCell &&
                        hoveredHeatmapCell.day === day &&
                        hoveredHeatmapCell.hour === hour;

                      return (
                        <div
                          key={hour}
                          className={`heatmap-cell ${isHovered ? 'hovered' : ''}`}
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${intensity})`,
                            boxShadow: intensity > 0.8 ? '0 0 10px rgba(99, 102, 241, 0.5)' : 'none',
                          }}
                          onMouseEnter={() =>
                            setHoveredHeatmapCell({
                              day,
                              hour: `${String(hour).padStart(2, '0')}:00`,
                              tickets: Math.round(intensity * 48),
                              level: intensity > 0.7 ? 'Peak Load' : intensity > 0.4 ? 'Moderate' : 'Low Traffic',
                            })
                          }
                          onMouseLeave={() => setHoveredHeatmapCell(null)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Heatmap Time Axis */}
            <div className="heatmap-time-axis">
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
              <span>23:00</span>
            </div>

            {/* Heatmap Hover Tooltip Display */}
            {hoveredHeatmapCell && (
              <div className="heatmap-cell-tooltip animate-fade-in">
                <strong>{hoveredHeatmapCell.day} at {hoveredHeatmapCell.hour}</strong>
                <span> • ~{hoveredHeatmapCell.tickets} incoming requests ({hoveredHeatmapCell.level})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Ticket Categories Breakdown & Top Performing Agents */}
      <div className="analytics-bottom-grid">
        {/* Categories Stacked Breakdown */}
        <div className="card category-breakdown-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Ticket Categories Breakdown</h3>
              <p className="chart-subtitle">Distribution across channels & SLA efficiency</p>
            </div>
            <span className="badge-pill">5 Key Categories</span>
          </div>

          <div className="category-bars-list">
            {categories.map((cat, idx) => (
              <div key={idx} className="category-bar-item">
                <div className="category-bar-info">
                  <span className="category-name">{cat.name}</span>
                  <span className="category-percent">{cat.total} of total</span>
                </div>

                {/* Stacked Percentage Bar */}
                <div className="category-stacked-bar">
                  <div
                    className="stack-segment stack-email"
                    style={{ width: `${cat.email}%` }}
                    title={`Email: ${cat.email}%`}
                  >
                    {cat.email > 25 && <span>{cat.email}%</span>}
                  </div>
                  <div
                    className="stack-segment stack-chat"
                    style={{ width: `${cat.chat}%` }}
                    title={`Live Chat: ${cat.chat}%`}
                  >
                    {cat.chat > 20 && <span>{cat.chat}%</span>}
                  </div>
                  <div
                    className="stack-segment stack-phone"
                    style={{ width: `${cat.phone}%` }}
                    title={`Phone / Portal: ${cat.phone}%`}
                  >
                    {cat.phone > 15 && <span>{cat.phone}%</span>}
                  </div>
                </div>

                <div className="category-mini-legend">
                  <span>✉ Email: {cat.email}%</span>
                  <span>💬 Chat: {cat.chat}%</span>
                  <span>☎ Portal: {cat.phone}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Agents Leaderboard */}
        <div className="card agents-leaderboard-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Top Performing Agents</h3>
              <p className="chart-subtitle">Resolution volume, CSAT scores & SLA benchmarks</p>
            </div>
            <span className="badge-pill" style={{ color: 'var(--accent-amber)' }}>
              ★ Leaderboard
            </span>
          </div>

          <div className="agents-table-wrap">
            <table className="agents-leaderboard-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Tickets Resolved</th>
                  <th>Avg. CSAT</th>
                  <th>Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <div className="agent-profile-cell">
                        <div className="agent-avatar-wrap">
                          <img src={agent.avatar} alt={agent.name} className="agent-avatar-img" />
                          <span className={`agent-status-indicator ${agent.status}`} />
                        </div>
                        <div>
                          <div className="agent-name-text">{agent.name}</div>
                          <div className="agent-role-text">{agent.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="agent-resolved-count">
                        <strong>{agent.resolved}</strong>
                        <span className="agent-avg-time">~{agent.avgTime} avg</span>
                      </div>
                    </td>
                    <td>
                      <div className="agent-metric-bar-group">
                        <div className="metric-score-label">
                          <strong>{agent.csat}%</strong>
                        </div>
                        <div className="mini-progress-track">
                          <div
                            className="mini-progress-fill"
                            style={{
                              width: `${agent.csat}%`,
                              backgroundColor: agent.csat >= 90 ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="agent-metric-bar-group">
                        <div className="metric-score-label">
                          <strong>{agent.resolutionRate}%</strong>
                        </div>
                        <div className="mini-progress-track">
                          <div
                            className="mini-progress-fill"
                            style={{
                              width: `${agent.resolutionRate}%`,
                              backgroundColor: 'var(--accent-purple)',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupportAnalytics;
