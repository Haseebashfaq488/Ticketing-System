import React, { useState, useMemo } from 'react';

// Helper to draw radial semi-circle gauge
function RadialGauge({ value, max = 100, label, target, unit = '%', color = 'var(--accent-cyan)', subtitle = '' }) {
  const radius = 64;
  const strokeWidth = 12;
  const numVal = typeof value === 'number' && !isNaN(value) ? value : 0;
  const normalizedValue = Math.min(Math.max(numVal, 0), max);
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
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
        <div className="radial-gauge-value-display">
          <span className="gauge-number">{numVal}{unit}</span>
        </div>
      </div>
      <div className="gauge-meta">
        <span className="gauge-title">{label}</span>
        <span className="gauge-target">Target: <strong>{target}</strong></span>
        {subtitle && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{subtitle}</span>}
      </div>
    </div>
  );
}

function SupportAnalytics({ tickets = [] }) {
  // Real Filter state
  const [dateRange, setDateRange] = useState('all'); // '7d' | '30d' | '90d' | 'ytd' | 'all'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null);
  const [hoveredHeatmapCell, setHoveredHeatmapCell] = useState(null);
  const [activeSeries, setActiveSeries] = useState({
    total: true,
    criticalHigh: true,
    normal: true,
  });

  // Unique categories from the actual tickets
  const availableCategories = useMemo(() => {
    const set = new Set();
    tickets.forEach((t) => {
      if (t.category) set.add(t.category.toUpperCase());
    });
    return Array.from(set);
  }, [tickets]);

  // 1. FILTER ACTUAL TICKETS by Date Range, Category, and Priority
  const filteredTickets = useMemo(() => {
    const now = Date.now();

    return tickets.filter((t) => {
      // Date filter
      if (dateRange !== 'all' && t.created_at) {
        const ticketTime = new Date(t.created_at).getTime();
        if (!isNaN(ticketTime)) {
          if (dateRange === '7d' && now - ticketTime > 7 * 86400000) return false;
          if (dateRange === '30d' && now - ticketTime > 30 * 86400000) return false;
          if (dateRange === '90d' && now - ticketTime > 90 * 86400000) return false;
          if (dateRange === 'ytd') {
            const ticketYear = new Date(t.created_at).getFullYear();
            const currentYear = new Date().getFullYear();
            if (ticketYear !== currentYear) return false;
          }
        }
      }

      // Category filter
      if (categoryFilter !== 'ALL') {
        if ((t.category || '').toUpperCase() !== categoryFilter) return false;
      }

      // Priority filter
      if (priorityFilter !== 'ALL') {
        if ((t.priority || '').toUpperCase() !== priorityFilter) return false;
      }

      return true;
    });
  }, [tickets, dateRange, categoryFilter, priorityFilter]);

  // 2. REAL METRIC CALCULATIONS
  const metrics = useMemo(() => {
    const total = filteredTickets.length;
    
    // Status counts
    const openCount = filteredTickets.filter((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status)).length;
    const waitingCount = filteredTickets.filter((t) => t.status === 'WAITING_FOR_CUSTOMER').length;
    const escalatedCount = filteredTickets.filter((t) => t.status === 'ESCALATED').length;
    const resolvedCount = filteredTickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length;
    const activeBacklog = openCount + waitingCount + escalatedCount;

    // Priority counts
    const criticalCount = filteredTickets.filter((t) => t.priority === 'CRITICAL').length;
    const highCount = filteredTickets.filter((t) => t.priority === 'HIGH').length;
    const mediumCount = filteredTickets.filter((t) => t.priority === 'MEDIUM').length;
    const lowCount = filteredTickets.filter((t) => t.priority === 'LOW').length;

    // Resolution Rate %
    const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 100;

    // Ticket Aging calculations (in hours)
    const now = Date.now();
    const openTickets = filteredTickets.filter((t) => ['OPEN', 'IN_PROGRESS', 'ESCALATED'].includes(t.status));
    let totalOpenAgeHours = 0;
    let slaAtRiskCount = 0;

    openTickets.forEach((t) => {
      if (t.created_at) {
        const createdTime = new Date(t.created_at).getTime();
        if (!isNaN(createdTime)) {
          const ageHours = Math.max(0, (now - createdTime) / 3600000);
          totalOpenAgeHours += ageHours;

          // SLA Risk: Critical open > 4h, High open > 12h, or any ticket open > 48h
          if (
            (t.priority === 'CRITICAL' && ageHours > 4) ||
            (t.priority === 'HIGH' && ageHours > 12) ||
            ageHours > 48
          ) {
            slaAtRiskCount++;
          }
        }
      }
    });

    const avgResolutionOrAgeHours = openTickets.length > 0
      ? Math.round((totalOpenAgeHours / openTickets.length) * 10) / 10
      : 0;

    // Capacity utilization baseline
    const capacityMax = Math.max(20, total * 2);
    const capacityUtilization = Math.round((activeBacklog / capacityMax) * 100);

    return {
      total,
      openCount,
      waitingCount,
      escalatedCount,
      resolvedCount,
      activeBacklog,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      resolutionRate,
      avgResolutionOrAgeHours,
      slaAtRiskCount,
      capacityMax,
      capacityUtilization,
    };
  }, [filteredTickets]);

  // 3. REAL CATEGORY BREAKDOWN
  const categoryStats = useMemo(() => {
    if (!filteredTickets.length) return [];
    
    const counts = {};
    filteredTickets.forEach((t) => {
      const cat = (t.category || 'UNCATEGORIZED').toUpperCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([cat, count]) => ({
        name: cat.replace(/_/g, ' '),
        rawKey: cat,
        count,
        percentage: Math.round((count / filteredTickets.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredTickets]);

  // 4. REAL CUSTOMER / REQUESTER WORKLOAD LEADERBOARD
  const customerStats = useMemo(() => {
    if (!filteredTickets.length) return [];

    const map = {};
    filteredTickets.forEach((t) => {
      const email = t.customer_email || 'guest@example.com';
      const name = t.customer_name || email.split('@')[0];
      if (!map[email]) {
        map[email] = {
          email,
          name,
          total: 0,
          resolved: 0,
          active: 0,
          critical: 0,
        };
      }
      map[email].total += 1;
      if (['RESOLVED', 'CLOSED'].includes(t.status)) {
        map[email].resolved += 1;
      } else {
        map[email].active += 1;
      }
      if (['CRITICAL', 'HIGH'].includes(t.priority)) {
        map[email].critical += 1;
      }
    });

    return Object.values(map)
      .map((c) => ({
        ...c,
        resolutionRate: c.total > 0 ? Math.round((c.resolved / c.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // top 5
  }, [filteredTickets]);

  // 5. REAL DAILY VOLUME TIMELINE (Bucketed by actual created_at dates)
  const dailyVolumeTimeline = useMemo(() => {
    const daysMap = {};
    const daysList = [];
    const numDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 14;
    
    // Initialize date buckets for the selected window
    const now = new Date();
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const shortLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      daysMap[dateKey] = {
        dateKey,
        label: shortLabel,
        total: 0,
        criticalHigh: 0,
        normal: 0,
      };
      daysList.push(dateKey);
    }

    // Populate with real tickets
    filteredTickets.forEach((t) => {
      if (t.created_at) {
        const ticketDate = t.created_at.split('T')[0];
        if (daysMap[ticketDate]) {
          daysMap[ticketDate].total += 1;
          if (['CRITICAL', 'HIGH'].includes(t.priority)) {
            daysMap[ticketDate].criticalHigh += 1;
          } else {
            daysMap[ticketDate].normal += 1;
          }
        }
      }
    });

    return daysList.map((key) => daysMap[key]);
  }, [filteredTickets, dateRange]);

  // 6. REAL 7x24 PEAK SUPPORT HOURS HEATMAP
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

  const heatmapMatrix = useMemo(() => {
    // 7 rows x 24 cols initialized to 0
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxHourCount = 1;

    filteredTickets.forEach((t) => {
      if (t.created_at) {
        const d = new Date(t.created_at);
        if (!isNaN(d.getTime())) {
          // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
          const jsDay = d.getDay();
          const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // Convert 0=Mon, 6=Sun
          const hour = d.getHours();
          if (dayIdx >= 0 && dayIdx < 7 && hour >= 0 && hour < 24) {
            matrix[dayIdx][hour] += 1;
            if (matrix[dayIdx][hour] > maxHourCount) {
              maxHourCount = matrix[dayIdx][hour];
            }
          }
        }
      }
    });

    return { matrix, maxHourCount };
  }, [filteredTickets]);

  // SVG Chart bounds
  const chartWidth = 560;
  const chartHeight = 220;
  const chartPadding = { top: 20, right: 20, bottom: 35, left: 35 };
  const graphW = chartWidth - chartPadding.left - chartPadding.right;
  const graphH = chartHeight - chartPadding.top - chartPadding.bottom;
  
  const maxTrendVal = Math.max(
    5,
    ...dailyVolumeTimeline.map((p) => p.total)
  );

  const getSvgCoordinates = (points, key) => {
    if (!points.length) return '';
    return points
      .map((p, idx) => {
        const x = chartPadding.left + (idx / Math.max(1, points.length - 1)) * graphW;
        const y = chartPadding.top + graphH - (p[key] / maxTrendVal) * graphH;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="support-analytics-root animate-fade-in">
      {/* Top Header & Data Filter Controls */}
      <div className="analytics-header-card card">
        <div className="analytics-title-group">
          <div className="badge-pill" style={{ marginBottom: '8px' }}>
            Data-Driven SLA & Operations Intelligence
          </div>
          <h1 className="analytics-heading">
            Live Support <span className="grad-text">Analytics Dashboard</span>
          </h1>
          <p className="analytics-subtext">
            Calculated in real-time from <strong>{filteredTickets.length}</strong> active database ticket records (schema synchronized).
          </p>
        </div>

        {/* Real Data Filters Bar */}
        <div className="analytics-filter-controls">
          <div className="filter-select-group">
            <label className="filter-label">Date Filter</label>
            <select
              className="analytics-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">All Time ({tickets.length} tickets)</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>

          <div className="filter-select-group">
            <label className="filter-label">Category</label>
            <select
              className="analytics-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-group">
            <label className="filter-label">Priority</label>
            <select
              className="analytics-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end', paddingBottom: '4px' }}>
            <span className="live-data-pill" style={{ padding: '6px 12px', fontSize: '12px' }}>
              ● {filteredTickets.length} MATCHING RECORDS
            </span>
          </div>
        </div>
      </div>

      {/* Row 1: Executive KPI Radial Gauges (100% Derived from Real Data) */}
      <div className="gauges-grid">
        {/* Gauge 1: Resolution Rate */}
        <div className="card gauge-card">
          <div className="gauge-card-header">
            <span className="gauge-kpi-badge" style={{ color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.12)' }}>
              {metrics.resolvedCount} of {metrics.total} Resolved
            </span>
          </div>
          <RadialGauge
            value={metrics.resolutionRate}
            max={100}
            unit="%"
            label="Resolution Rate (Real)"
            target=">85%"
            color="var(--accent-emerald)"
            subtitle={`${metrics.resolvedCount} resolved / closed tickets`}
          />
        </div>

        {/* Gauge 2: Avg Open Ticket Age */}
        <div className="card gauge-card">
          <div className="gauge-card-header">
            <span
              className="gauge-kpi-badge"
              style={{
                color: metrics.slaAtRiskCount > 0 ? 'var(--accent-rose)' : 'var(--accent-cyan)',
                background: metrics.slaAtRiskCount > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(6, 182, 212, 0.12)',
              }}
            >
              {metrics.slaAtRiskCount > 0 ? `⚠️ ${metrics.slaAtRiskCount} SLA at risk` : '✓ All within SLA'}
            </span>
          </div>
          <RadialGauge
            value={metrics.avgResolutionOrAgeHours}
            max={48}
            unit="h"
            label="Avg. Open Ticket Age"
            target="<24h"
            color={metrics.avgResolutionOrAgeHours > 24 ? 'var(--accent-rose)' : 'var(--accent-cyan)'}
            subtitle={`${metrics.openCount + metrics.escalatedCount} active open tickets`}
          />
        </div>

        {/* Gauge 3: Active Ticket Backlog */}
        <div className="card gauge-card">
          <div className="gauge-card-header">
            <span className="gauge-kpi-badge" style={{ color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.12)' }}>
              {metrics.capacityUtilization}% of {metrics.capacityMax} Capacity
            </span>
          </div>
          <RadialGauge
            value={metrics.activeBacklog}
            max={metrics.capacityMax}
            unit=""
            label="Active Backlog"
            target={`Capacity: ${metrics.capacityMax}`}
            color="var(--accent-amber)"
            subtitle={`${metrics.escalatedCount} escalated`}
          />
        </div>
      </div>

      {/* Row 2: Real Ticket Volume Trends & Peak Support Hours Heatmap */}
      <div className="analytics-charts-grid">
        {/* Left: Real Daily Volume Trends */}
        <div className="card chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Daily Ticket Volume Trends</h3>
              <p className="chart-subtitle">Real daily creation volume from database records</p>
            </div>

            {/* Interactive Series Toggles */}
            <div className="chart-legend-toggles">
              <button
                className={`legend-pill ${activeSeries.total ? 'active' : 'inactive'}`}
                onClick={() => setActiveSeries((p) => ({ ...p, total: !p.total }))}
              >
                <span className="legend-dot" style={{ background: 'var(--accent-purple)' }} /> Total Tickets
              </button>
              <button
                className={`legend-pill ${activeSeries.criticalHigh ? 'active' : 'inactive'}`}
                onClick={() => setActiveSeries((p) => ({ ...p, criticalHigh: !p.criticalHigh }))}
              >
                <span className="legend-dot" style={{ background: 'var(--accent-rose)' }} /> High/Critical
              </button>
              <button
                className={`legend-pill ${activeSeries.normal ? 'active' : 'inactive'}`}
                onClick={() => setActiveSeries((p) => ({ ...p, normal: !p.normal }))}
              >
                <span className="legend-dot" style={{ background: 'var(--accent-cyan)' }} /> Medium/Low
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
              {[0, Math.round(maxTrendVal / 2), maxTrendVal].map((val) => {
                const y = chartPadding.top + graphH - (val / maxTrendVal) * graphH;
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

              {/* X-axis date markers */}
              {dailyVolumeTimeline
                .filter((_, idx) => idx % Math.max(1, Math.floor(dailyVolumeTimeline.length / 5)) === 0)
                .map((pt, idx) => {
                  const origIdx = dailyVolumeTimeline.findIndex((p) => p.dateKey === pt.dateKey);
                  const x = chartPadding.left + (origIdx / Math.max(1, dailyVolumeTimeline.length - 1)) * graphW;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y={chartHeight - 10}
                      fill="var(--text-muted)"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      {pt.label}
                    </text>
                  );
                })}

              {/* Path lines */}
              {activeSeries.total && (
                <path
                  d={getSvgCoordinates(dailyVolumeTimeline, 'total')}
                  fill="none"
                  stroke="var(--accent-purple)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {activeSeries.criticalHigh && (
                <path
                  d={getSvgCoordinates(dailyVolumeTimeline, 'criticalHigh')}
                  fill="none"
                  stroke="var(--accent-rose)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {activeSeries.normal && (
                <path
                  d={getSvgCoordinates(dailyVolumeTimeline, 'normal')}
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              )}

              {/* Interactive Hover Overlay */}
              {dailyVolumeTimeline.map((pt, idx) => {
                const x = chartPadding.left + (idx / Math.max(1, dailyVolumeTimeline.length - 1)) * graphW;
                const isHovered = hoveredTrendPoint?.dateKey === pt.dateKey;

                return (
                  <g key={pt.dateKey} onMouseEnter={() => setHoveredTrendPoint(pt)}>
                    <rect
                      x={x - graphW / Math.max(1, dailyVolumeTimeline.length) / 2}
                      y={chartPadding.top}
                      width={graphW / Math.max(1, dailyVolumeTimeline.length)}
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
                        {activeSeries.total && (
                          <circle
                            cx={x}
                            cy={chartPadding.top + graphH - (pt.total / maxTrendVal) * graphH}
                            r="5"
                            fill="var(--accent-purple)"
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
                  left: '40%',
                  top: '15px',
                }}
              >
                <div className="tooltip-header">{hoveredTrendPoint.label} ({hoveredTrendPoint.dateKey})</div>
                <div className="tooltip-row">
                  <span style={{ color: 'var(--accent-purple)' }}>● Total Tickets:</span>
                  <strong>{hoveredTrendPoint.total}</strong>
                </div>
                <div className="tooltip-row">
                  <span style={{ color: 'var(--accent-rose)' }}>● High/Critical:</span>
                  <strong>{hoveredTrendPoint.criticalHigh}</strong>
                </div>
                <div className="tooltip-row">
                  <span style={{ color: 'var(--accent-cyan)' }}>● Medium/Low:</span>
                  <strong>{hoveredTrendPoint.normal}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Peak Support Hours Weekly Heatmap (REAL DATA) */}
        <div className="card chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Peak Support Hours (Weekly)</h3>
              <p className="chart-subtitle">Real ticket creation frequency by day & hour</p>
            </div>
            <div className="heatmap-legend">
              <span className="legend-label">0 tickets</span>
              <div className="heatmap-gradient-bar" />
              <span className="legend-label">Peak</span>
            </div>
          </div>

          <div className="heatmap-matrix-container">
            <div className="heatmap-matrix-grid">
              {daysOfWeek.map((day, dayIdx) => (
                <div key={day} className="heatmap-row">
                  <div className="heatmap-day-label">{day}</div>
                  <div className="heatmap-cells-track">
                    {hoursOfDay.map((hour) => {
                      const count = heatmapMatrix.matrix[dayIdx][hour];
                      const maxCount = heatmapMatrix.maxHourCount;
                      const intensity = count > 0 ? Math.max(0.25, count / maxCount) : 0.06;
                      const isHovered =
                        hoveredHeatmapCell &&
                        hoveredHeatmapCell.day === day &&
                        hoveredHeatmapCell.hour === hour;

                      return (
                        <div
                          key={hour}
                          className={`heatmap-cell ${isHovered ? 'hovered' : ''}`}
                          style={{
                            backgroundColor: count > 0 ? `rgba(99, 102, 241, ${intensity})` : 'var(--bg-input)',
                            boxShadow: count > 0 && intensity > 0.7 ? '0 0 10px rgba(99, 102, 241, 0.5)' : 'none',
                          }}
                          onMouseEnter={() =>
                            setHoveredHeatmapCell({
                              day,
                              hour: `${String(hour).padStart(2, '0')}:00`,
                              tickets: count,
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
                <span> • <strong>{hoveredHeatmapCell.tickets}</strong> real tickets created</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Ticket Categories Breakdown (REAL) & Top Requesters / Customer Accounts (REAL) */}
      <div className="analytics-bottom-grid">
        {/* Categories Breakdown (100% REAL DATA) */}
        <div className="card category-breakdown-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Ticket Categories Breakdown</h3>
              <p className="chart-subtitle">Real distribution calculated from database records</p>
            </div>
            <span className="badge-pill">{categoryStats.length} Categories</span>
          </div>

          {/* Real Priority Distribution Summary */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.12)', color: 'var(--accent-rose)' }}>
              Critical: {metrics.criticalCount}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber)' }}>
              High: {metrics.highCount}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent-cyan)' }}>
              Medium: {metrics.mediumCount}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              Low: {metrics.lowCount}
            </span>
          </div>

          <div className="category-bars-list">
            {categoryStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                No tickets matching current filters.
              </div>
            ) : (
              categoryStats.map((cat, idx) => (
                <div key={idx} className="category-bar-item">
                  <div className="category-bar-info">
                    <span className="category-name">{cat.name}</span>
                    <span className="category-percent">{cat.count} tickets ({cat.percentage}%)</span>
                  </div>

                  {/* Real Data Category Bar */}
                  <div className="category-stacked-bar">
                    <div
                      className="stack-segment"
                      style={{
                        width: `${Math.max(cat.percentage, 5)}%`,
                        backgroundColor: idx === 0 ? 'var(--accent-purple)' : idx === 1 ? 'var(--accent-cyan)' : idx === 2 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                      }}
                    >
                      <span>{cat.percentage}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Requester Accounts & Workload (100% REAL DATA from database) */}
        <div className="card agents-leaderboard-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Top Requester Accounts & Workload</h3>
              <p className="chart-subtitle">Real volume & resolution rates by customer account</p>
            </div>
            <span className="badge-pill">
              {customerStats.length} Active Accounts
            </span>
          </div>

          <div className="agents-table-wrap">
            <table className="agents-leaderboard-table">
              <thead>
                <tr>
                  <th>Customer Account</th>
                  <th>Total Tickets</th>
                  <th>Active</th>
                  <th>Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {customerStats.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                      No customer ticket data found.
                    </td>
                  </tr>
                ) : (
                  customerStats.map((cust, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="agent-profile-cell">
                          <div>
                            <div className="agent-name-text">{cust.name}</div>
                            <div className="agent-role-text">{cust.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="agent-resolved-count">
                          <strong>{cust.total}</strong>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', color: cust.active > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                          {cust.active}
                        </span>
                      </td>
                      <td>
                        <div className="agent-metric-bar-group">
                          <div className="metric-score-label">
                            <strong>{cust.resolutionRate}%</strong> ({cust.resolved}/{cust.total})
                          </div>
                          <div className="mini-progress-track">
                            <div
                              className="mini-progress-fill"
                              style={{
                                width: `${cust.resolutionRate}%`,
                                backgroundColor: cust.resolutionRate >= 80 ? 'var(--accent-emerald)' : 'var(--accent-purple)',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupportAnalytics;
