import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, X, Zap, Loader2, CheckCircle, AlertCircle,
  Cpu, DollarSign, Recycle, Leaf, BarChart2, PieChart,
  Smartphone, Laptop, Keyboard, MousePointer2, Monitor,
  Printer, Wifi, Tablet, Battery, Image as ImageIcon,
  ChevronRight, Info, TrendingUp, Package
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// ─── Material color palette ────────────────────────────────────────────────
const MATERIAL_COLORS = {
  copper:    '#f97316',
  aluminum:  '#6366f1',
  gold:      '#f59e0b',
  silver:    '#94a3b8',
  plastic:   '#10b981',
  lithium:   '#ec4899',
  iron:      '#64748b',
  lead:      '#84cc16',
  tin:       '#06b6d4',
  zinc:      '#8b5cf6',
};

// Condition badge map
const CONDITION_STYLE = {
  good:       { color: '#10b981', bg: '#d1fae5', label: 'Good Condition' },
  repairable: { color: '#f59e0b', bg: '#fef3c7', label: 'Repairable' },
  damaged:    { color: '#f97316', bg: '#ffedd5', label: 'Damaged' },
  scrap:      { color: '#ef4444', bg: '#fee2e2', label: 'Scrap / End-of-life' },
};

// Device icon map
const DEVICE_ICONS = {
  mobile_phone: Smartphone,
  laptop: Laptop,
  keyboard: Keyboard,
  mouse: MousePointer2,
  monitor_screen: Monitor,
  printer: Printer,
  router: Wifi,
  tablet: Tablet,
  battery: Battery,
  default: Cpu,
};

// ─── Mini bar chart component ──────────────────────────────────────────────
const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize' }}>{item.label}</span>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{item.display}</span>
          </div>
          <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(item.value / max) * 100}%`,
                height: '100%',
                background: item.color || '#6366f1',
                borderRadius: '5px',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Donut chart (SVG) ────────────────────────────────────────────────────
const DonutChart = ({ data, size = 200 }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size * 0.38, innerR = size * 0.22;
  let cumAngle = -Math.PI / 2;

  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle);
    const y2 = cy + r * Math.sin(cumAngle + angle);
    const ix1 = cx + innerR * Math.cos(cumAngle);
    const iy1 = cy + innerR * Math.sin(cumAngle);
    const ix2 = cx + innerR * Math.cos(cumAngle + angle);
    const iy2 = cy + innerR * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const pathData = `M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
    const slice = { ...d, pathData, startAngle: cumAngle };
    cumAngle += angle;
    return slice;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.pathData} fill={s.color} stroke="#fff" strokeWidth="2" />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="#64748b">Total</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e293b">{total.toFixed(0)}g</text>
    </svg>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const DeviceAnalyzer = () => {
  const [images, setImages] = useState([]);         // { file, preview }[]
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const addFiles = useCallback((files) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const filtered = Array.from(files).filter(f => validTypes.includes(f.type));
    const remaining = 5 - images.length;
    const toAdd = filtered.slice(0, remaining).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setImages(prev => [...prev, ...toAdd]);
    setError('');
  }, [images.length]);

  const removeImage = (idx) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleAnalyze = async () => {
    if (images.length === 0) { setError('Please upload at least 1 image.'); return; }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      images.forEach(img => formData.append('images', img.file));

      const res = await fetch(`${API_BASE}/detect-device`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || 'Analysis failed');
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const DeviceIcon = result ? (DEVICE_ICONS[result.device_type] || DEVICE_ICONS.default) : Cpu;
  const cond = result ? (CONDITION_STYLE[result.condition] || CONDITION_STYLE.damaged) : null;

  // Prepare chart data from result
  const materialChartData = result
    ? result.materials.map(m => ({
        label: m.material,
        value: m.estimated_weight_g,
        display: `${m.estimated_weight_g}g`,
        color: MATERIAL_COLORS[m.material] || '#6366f1',
      }))
    : [];

  const recoveryChartData = result
    ? result.materials.map(m => ({
        label: m.material,
        value: m.recovery_pct,
        display: `${m.recovery_pct}%`,
        color: MATERIAL_COLORS[m.material] || '#10b981',
      }))
    : [];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      {/* ── Page Header ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '16px',
          padding: '32px 28px',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Cpu size={28} color="white" />
            </div>
            <div>
              <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.5rem', margin: 0 }}>
                AI Device Analyzer
              </h2>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>
                Multi-Image Material Recovery Predictor
              </p>
            </div>
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: 0, maxWidth: '560px' }}>
            Upload 1–5 photos of your e-waste device. Our AI detects device type, condition, estimates material composition and calculates recovery value.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* ── LEFT PANEL: Upload ── */}
        <div className="col-lg-5">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#6366f1' : '#cbd5e1'}`,
              borderRadius: '16px',
              padding: '36px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'rgba(99,102,241,0.06)' : '#f8fafc',
              transition: 'all 0.25s',
              marginBottom: '20px',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            <Upload size={44} style={{ color: '#6366f1', marginBottom: '12px' }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px', color: '#1e293b' }}>
              Drop images here or click to browse
            </p>
            <p style={{ color: '#64748b', fontSize: '0.84rem', marginBottom: 0 }}>
              JPG / PNG • Max 5 images • 10MB each
            </p>
          </div>

          {/* Thumbnail grid */}
          {images.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
              gap: '10px',
              marginBottom: '20px',
            }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1' }}>
                  <img
                    src={img.preview}
                    alt={`upload-${i}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    style={{
                      position: 'absolute', top: '4px', right: '4px',
                      background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%',
                      width: '22px', height: '22px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={12} color="white" />
                  </button>
                  {i === 0 && (
                    <span style={{
                      position: 'absolute', bottom: '4px', left: '4px',
                      background: '#6366f1', color: 'white', fontSize: '0.6rem',
                      borderRadius: '4px', padding: '1px 5px', fontWeight: 700,
                    }}>PRIMARY</span>
                  )}
                </div>
              ))}
              {images.length < 5 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', aspectRatio: '1',
                    color: '#94a3b8', fontSize: '1.5rem', fontWeight: 300,
                  }}
                >+</div>
              )}
            </div>
          )}

          {/* Info pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#eff6ff', borderRadius: '10px', padding: '10px 14px',
            marginBottom: '16px',
          }}>
            <Info size={15} color="#3b82f6" />
            <span style={{ fontSize: '0.82rem', color: '#1d4ed8' }}>
              All images should show the <strong>same device</strong> from different angles for best accuracy.
            </span>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'flex-start',
              background: '#fee2e2', borderRadius: '10px', padding: '12px',
              marginBottom: '16px',
            }}>
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
              <span style={{ fontSize: '0.88rem', color: '#b91c1c' }}>{error}</span>
            </div>
          )}

          {/* Analyze button */}
          <button
            id="analyze-device-btn"
            onClick={handleAnalyze}
            disabled={loading || images.length === 0}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '12px',
              background: images.length === 0 || loading
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: images.length === 0 || loading ? '#94a3b8' : 'white',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: images.length === 0 || loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s',
              boxShadow: images.length > 0 && !loading ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
            }}
          >
            {loading ? <Loader2 size={20} className="spinner" /> : <Zap size={20} />}
            {loading ? 'Analyzing Device...' : 'Analyze Device'}
          </button>

          {/* Image count indicator */}
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {images.length} / 5 images • {images.length === 0 ? 'Upload to begin' : images.length === 5 ? 'Maximum reached' : 'You may add more'}
            </span>
          </div>
        </div>

        {/* ── RIGHT PANEL: Results ── */}
        <div className="col-lg-7">
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* ── Device Card ── */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '14px',
                      background: '#ede9fe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <DeviceIcon size={30} color="#7c3aed" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', textTransform: 'capitalize' }}>
                        {result.device_display || result.device_type?.replace(/_/g, ' ') || 'Unknown Device'}
                      </h4>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                        Confidence: {(result.confidence * 100).toFixed(1)}% • {result.images_analyzed} image{result.images_analyzed > 1 ? 's' : ''} analyzed
                      </p>
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 16px', borderRadius: '99px',
                    background: cond.bg, color: cond.color,
                    fontWeight: 700, fontSize: '0.82rem',
                    border: `1.5px solid ${cond.color}30`,
                  }}>
                    {cond.label}
                  </div>
                </div>

                {/* KPI row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Est. Weight', value: `~${result.estimated_weight_kg} kg`, icon: <Package size={18} color="#6366f1" /> },
                    { label: 'Total Recovery', value: `₹${result.total_recovery_value.toFixed(2)}`, icon: <DollarSign size={18} color="#10b981" /> },
                    { label: 'CO₂ Saved', value: `${result.co2_saved_kg} kg`, icon: <Leaf size={18} color="#059669" /> },
                  ].map((kpi, i) => (
                    <div key={i} style={{
                      background: '#f8fafc', borderRadius: '12px',
                      padding: '14px 12px', textAlign: 'center',
                    }}>
                      <div style={{ marginBottom: '6px' }}>{kpi.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>{kpi.value}</div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>{kpi.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Material Table ── */}
              <div style={{
                background: 'white', borderRadius: '16px',
                padding: '24px', border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}>
                <h6 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Recycle size={18} color="#10b981" /> Material Composition & Recovery
                </h6>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        {['Material', 'Est. Weight', 'Recovery %', 'Recoverable', 'Price/g', 'Value (₹)'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.78rem' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.materials.map((m, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: MATERIAL_COLORS[m.material] || '#6366f1', flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{m.material}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>{m.estimated_weight_g}g</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ height: '6px', width: '60px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${m.recovery_pct}%`, height: '100%', background: MATERIAL_COLORS[m.material] || '#10b981', borderRadius: '3px', transition: 'width 0.8s' }} />
                              </div>
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{m.recovery_pct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>{m.recoverable_g}g</td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>₹{m.price_per_g}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#10b981' }}>₹{m.value.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                        <td colSpan={5} style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>Total Recovery Value</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: '1rem', color: '#6366f1' }}>
                          ₹{result.total_recovery_value.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ── Charts row ── */}
              <div className="row g-3">
                {/* Donut: Material distribution */}
                <div className="col-md-5">
                  <div style={{
                    background: 'white', borderRadius: '16px',
                    padding: '24px', border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    height: '100%',
                  }}>
                    <h6 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PieChart size={16} color="#6366f1" /> Composition
                    </h6>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                      <DonutChart data={materialChartData} size={160} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {materialChartData.map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: m.color, flexShrink: 0 }} />
                          <span style={{ textTransform: 'capitalize', flex: 1 }}>{m.label}</span>
                          <span style={{ fontWeight: 600 }}>{m.display}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bar: Recovery % */}
                <div className="col-md-7">
                  <div style={{
                    background: 'white', borderRadius: '16px',
                    padding: '24px', border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    height: '100%',
                  }}>
                    <h6 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BarChart2 size={16} color="#10b981" /> Recovery Rates
                    </h6>
                    <BarChart data={recoveryChartData} />
                  </div>
                </div>
              </div>

              {/* ── Environmental impact ── */}
              <div style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
              }}>
                <h6 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7' }}>
                  <Leaf size={16} /> Environmental Impact
                </h6>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                  {[
                    { label: 'CO₂ Savings', value: `${result.co2_saved_kg} kg`, sub: 'emissions prevented', icon: <Leaf size={22} /> },
                    { label: 'Landfill Diverted', value: `${result.estimated_weight_kg} kg`, sub: 'of waste recovered', icon: <Recycle size={22} /> },
                    { label: 'Recovery Value', value: `₹${result.total_recovery_value.toFixed(0)}`, sub: 'estimated return', icon: <TrendingUp size={22} /> },
                  ].map((kpi, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                      <div style={{ color: '#6ee7b7', marginBottom: '6px' }}>{kpi.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{kpi.value}</div>
                      <div style={{ fontSize: '0.78rem', color: '#a7f3d0', marginTop: '2px' }}>{kpi.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6ee7b7', opacity: 0.7 }}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* Empty state */
            <div style={{
              background: 'white', borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '60px 30px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '20px',
                background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <Cpu size={40} color="#7c3aed" />
              </div>
              <h5 style={{ fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>Ready to Analyze</h5>
              <p style={{ color: '#64748b', maxWidth: '350px', lineHeight: '1.6', marginBottom: '24px' }}>
                Upload 1–5 images of your electronic device and click <strong>Analyze Device</strong> to get instant AI-powered material recovery predictions.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {['Device Type Detection', 'Condition Analysis', 'Material Recovery', 'Value Estimation'].map((tag, i) => (
                  <span key={i} style={{
                    background: '#f1f5f9', borderRadius: '99px',
                    padding: '6px 14px', fontSize: '0.8rem', color: '#475569', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <CheckCircle size={13} color="#10b981" /> {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spinner keyframe (inline for portability) */}
      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DeviceAnalyzer;
