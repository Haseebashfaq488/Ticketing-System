import React, { useState, useMemo } from 'react';

// Sample agent roster for visual showcase / preview
const DEMO_AGENTS = [
  {
    id: 1,
    name: 'James Smith',
    role: 'Senior Escalation Engineer',
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
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    resolved: 84,
    csat: 93,
    resolutionRate: 91,
    avgTime: '2.0h',
    status: 'offline',
  },
];

// Helper to draw radial semi-circle gauge
function RadialGauge({ value, max = 100, label, target, unit = '%', color = 'var(--accent-cyan)', isLive = false }) {
  const radius = 64;
  const strokeWidth = 12;
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = max > 0 ? normalizedValue / max : 0;
  
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
        <span className="gauge-title">
          {label} {isLive && <span className="live-data-pill">● LIVE DB</span>}
        </span>
        <span className="gauge-target">Target: <strong>{target}</strong></span>
      </div>
    </div>
  );
}

function SupportAnalytics({ tickets = [] }) {
  // Visual filter controls
  const [dateRange, setDateRange] = useState('30d');
  const [department, setDepartment] = useState('all');
  const [agentTeam, setAgentTeam] = useState('all');
  const [filterNotification, setFilterNotification] = useState(false);
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null);
  const [hoveredHeatmapCell, setHoveredHeatmapCell] = useState(null);
  const [activeChannels, setActiveChannels] = useState({
    email: true,
    chat: true,
    phone: true,
  });

  // REAL DATA CALCULATION 1: Real ticket status counts from live database
  const liveStats = useMemo(() => {
    const total = tickets.length;
    const activeBacklog = tickets.filter((t) =>
      ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED'].includes(t.status)
    ).length;
    const resolved = tickets.filter((t) =>
      ['RESOLVED', 'CLOSED'].includes(t.status)
    ).length;
    const escalated = tickets.filter((t) => t.status === 'ESCALATED').length;
    const highPriority = tickets.filter((t) =>
      ['HIGH', 'CRITICAL'].includes(t.priority)
    ).length;

    return { total, activeBacklog, resolved, escalated, highPriority };
  }, [tickets]);

  // REAL DATA CALCULATION 2: Real category breakdown from live database
  const liveCategoryBreakdown = useMemo(() => {
    if (!tickets.length) {
      return [
        { name: 'Technical Issues', count: 0, percentage: 0, tag: 'TECHNICAL' },
        { name: 'Billing & Payments', count: 0, percentage: 0, tag: 'BILLING' },
        { name: 'General Support', count: 0, percentage: 0, tag: 'GENERAL' },
        { name: 'Account & Security', count: 0, percentage: 0, tag: 'SECURITY' },
      ];
    }

    const counts = {};
    tickets.forEach((t) => {
      const cat = (t.category || 'GENERAL').toUpperCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const categoryNames = {
      TECHNICAL: 'Technical Issues',
      BILLING: 'Billing & Payments',
      GENERAL: 'General Support',
      SECURITY: 'Account & Security',
      REFUND: 'Refund Requests',
      FEATURE: 'Feature Requests',
    };

    return Object.entries(counts).map(([tag, count]) => ({
      name: categoryNames[tag] || tag.replace(/_/g, ' '),
      tag,
      count,
      percentage: Math.round((count / tickets.length) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [tickets]);

  // REAL DATA CALCULATION 3: Real priority distribution
  const livePriorityDistribution = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    tickets.forEach((t) => {
      const prio = (t.priority || 'MEDIUM').toUpperCase();
      if (counts[prio] !== undefined) counts[prio] += 1;
    });
    return counts;
  }, [tickets]);

  const handleApplyFilters = () => {
    setFilterNotification(true);
    setTimeout(() => setFilterNotification(false), 2400);
  };

  // Sample trend points for visual timeline simulation (clearly marked as preview)
  const trendData = useMemo(() => {
    const daysCount = dateRange === '7d' ? 7 : dateRange === '90d' ? 30 : 30;
    const points = [];
    
    for (let i = 1; i <= daysCount; i++) {
      const baseWave = Math.sin(i * 0.4) * 8 + Math.cos(i * 0.2) * 5;
      const email = Math.max(8, Math.round(24 + baseWave * 1.2 + ((i * 7) % 9)));
      const chat = Math.max(6, Math.round(16 + baseWave * 0.9 + ((i * 5) % 7)));
      const phone = Math.max(3, Math.round(10 + baseWave * 0.6 + ((i * 3) % 5)));
      
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
  }, [dateRange]);

  // 7 days x 24 hours peak heatmap matrix simulation
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

  const getHeatmapIntensity = (dayIdx, hour) => {
    const isWeekday = dayIdx < 5;
    const isPeakHour = hour >= 10 && hour <= 17;
    const isSubPeak = (hour >= 8 && hour < 10) || (hour > 17 && hour <= 20);

    let base = 0.1;
    if (isWeekday && isPeakHour) {
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
      {/* Top Header & Visual Filter Bar */}
      <div className="analytics-header-card card">
        <div className="analytics-title-group">
          <div className="badge-pill" style={{ marginBottom: '8px' }}>
            Support Analytics & SLA Intelligence
          </div>
          <h1 className="analytics-heading">
            Interactive Support <span className="grad-text">Analytics Dashboard</span>
          </h1>
          <p className="analytics-subtext">
            Real-time database ticket distribution combined with SLA target benchmarks and multi-channel telemetry.
          </p>
        </div>

        {/* Visual Filter Controls Bar */}
        <div className="analytics-filter-controls">
          <div className="filter-select-group">
            <label className="filter-label">Date Range (Preview Filter)</label>
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
            <label className="filter-label">Department (Preview Filter)</label>
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
            <label className="filter-label">Agent Team (Preview Filter)</label>
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
            ✓ Preview filters applied: <strong>{dateRange.toUpperCase()}</strong> ({department === 'all' ? 'All Depts' : department.toUpperCase()})
          </div>
        )}
      </div>

      {/* Row 1: Executive KPI Radial Gauges (Real Backlog + SLA Target Benchmarks) */}
      <div className="gauges-grid">
        {/* Gauge 1: CSAT Score (Target Benchmark) */}
        <div className="card gauge-card">
          <div className="gauge-card-header">
            <span className="gauge-kpi-badge" style={{ color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.12)' }}>
              Benchmark Target
            </span>
          </div>
          <RadialGauge
            value={88}
            max={100}
            unit="%"
            label="CSAT Score (Target Benchmark)"
            target="90%"
            color="var(--accent-emerald)"
            isLive={false}
          />
        </div>

        {/* Gauge 2: Avg Resolution Time (SLA Target Benchmark) */}
        <div className="card gauge-card">
          <div className="gauge-card-header">
            <span className="gauge-kpi-badge" style={{ color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.12)' }}>
              SLA Objective
            </span>
          </div>
          <RadialGauge
            value={24}
            max={48}
            unit="h"
            label="Avg. Resolution Time (SLA Target)"
            target="<20h"
            color="var(--accent-cyan)"
            isLive={false}
          />
        </div>

        {/* Gauge 3: Ticket Backlog (100% REAL LIVE DATA from database) */}
        <div className="card gauge-card">
          <div className="gauge-card-header">
            <span className="gauge-kpi-badge" style={{ color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.12)' }}>
              {liveStats.total > 0 ? `${Math.round((liveStats.activeBacklog / Math.max(20, liveStats.total)) * 100)}% Load` : '0% Load'}
            </span>
          </div>
          <RadialGauge
            value={liveStats.activeBacklog}
            max={Math.max(50, liveStats.total * 2)}
            unit=" active"
            label="Ticket Backlog"
            target={`Capacity: ${Math.max(50, liveStats.total * 2)}`}
            color="var(--accent-amber)"
            isLive={true}
          />
        </div>
      </div>

      {/* Row 2: Ticket Volume Trends & Peak Support Hours Heatmap */}
      <div className="analytics-charts-grid">
        {/* Left: Multi-Channel Volume Trends (Sample Simulation) */}
        <div className="card chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">
                Ticket Volume Trends <span className="preview-label">(Sample Simulation)</span>
              </h3>
              <p className="chart-subtitle">Projected incoming volume across channels</p>
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
                .map((pt, idx) => {
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

              {/* Interactive Hover Overlay */}
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
                <div className="tooltip-header">{hoveredTrendPoint.label} (Sample)</div>
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
                <div className="tooltip-footer">Total: {hoveredTrendPoint.total} projected</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Peak Support Hours Weekly Heatmap (Sample Traffic Simulation) */}
        <div className="card chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">
                Peak Support Hours <span className="preview-label">(Sample Simulation)</span>
              </h3>
              <p className="chart-subtitle">Projected hourly traffic intensity matrix</p>
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
                              level: intensity > 0.7 ? 'Peak Window' : intensity > 0.4 ? 'Moderate' : 'Low Traffic',
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

            {/* Heatmap Hover Tooltip */}
            {hoveredHeatmapCell && (
              <div className="heatmap-cell-tooltip animate-fade-in">
                <strong>{hoveredHeatmapCell.day} at {hoveredHeatmapCell.hour}</strong>
                <span> • Projected ~{hoveredHeatmapCell.tickets} inquiries ({hoveredHeatmapCell.level})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Ticket Categories Breakdown (REAL DB DATA) & Top Performing Agents (Showcase) */}
      <div className="analytics-bottom-grid">
        {/* Categories Breakdown (100% REAL LIVE DATA from database) */}
        <div className="card category-breakdown-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">
                Ticket Categories Breakdown <span className="live-data-pill">● LIVE DB DATA</span>
              </h3>
              <p className="chart-subtitle">Real distribution calculated from {tickets.length} database tickets</p>
            </div>
            <span className="badge-pill">{liveCategoryBreakdown.length} Categories</span>
          </div>

          {/* Real Priority Distribution Summary */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.12)', color: 'var(--accent-rose)' }}>
              Critical: {livePriorityDistribution.CRITICAL}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber)' }}>
              High: {livePriorityDistribution.HIGH}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent-cyan)' }}>
              Medium: {livePriorityDistribution.MEDIUM}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              Low: {livePriorityDistribution.LOW}
            </span>
          </div>

          <div className="category-bars-list">
            {liveCategoryBreakdown.map((cat, idx) => (
              <div key={idx} className="category-bar-item">
                <div className="category-bar-info">
                  <span className="category-name">{cat.name} ({cat.count} tickets)</span>
                  <span className="category-percent">{cat.percentage}% of total</span>
                </div>

                {/* Live Data Category Bar */}
                <div className="category-stacked-bar">
                  <div
                    className="stack-segment stack-email"
                    style={{
                      width: `${Math.max(cat.percentage, 4)}%`,
                      backgroundColor: idx === 0 ? 'var(--accent-purple)' : idx === 1 ? 'var(--accent-cyan)' : idx === 2 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                    }}
                    title={`${cat.name}: ${cat.count} tickets (${cat.percentage}%)`}
                  >
                    <span>{cat.count > 0 ? `${cat.percentage}%` : '0%'}</span>
                  </div>
                </div>

                <div className="category-mini-legend">
                  <span>Tag: <code>{cat.tag}</code></span>
                  <span>Volume: <strong>{cat.count}</strong> tickets</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Agents (Showcase Preview) */}
        <div className="card agents-leaderboard-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">
                Top Performing Agents <span className="preview-label">(Showcase Preview)</span>
              </h3>
              <p className="chart-subtitle">Team roster performance metrics benchmark</p>
            </div>
            <span className="badge-pill" style={{ color: 'var(--accent-amber)' }}>
              ★ Team Benchmark
            </span>
          </div>

          <div className="agents-table-wrap">
            <table className="agents-leaderboard-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Resolved Benchmark</th>
                  <th>Target CSAT</th>
                  <th>Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_AGENTS.map((agent) => (
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
