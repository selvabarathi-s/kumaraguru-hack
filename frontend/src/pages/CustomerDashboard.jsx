import React, { useState, useEffect } from 'react';
import { Smartphone, MapPin, Truck, RefreshCw, Cpu, Award, Trash2, Leaf, ShieldAlert, BarChart2 } from 'lucide-react';

const CustomerDashboard = () => {
  const [deviceType, setDeviceType] = useState('phone');
  const [age, setAge] = useState(3);
  const [condition, setCondition] = useState('good');
  const [suggestion, setSuggestion] = useState(null);
  const [devices, setDevices] = useState([]);
  const [pickupMessage, setPickupMessage] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
  
  // Environmental constants for quantification
  const ECO_METRICS = {
    phone: { points: 50, co2_kg: 5.5, toxic_g: 2.1 },
    laptop: { points: 150, co2_kg: 35.0, toxic_g: 15.5 },
    tv: { points: 200, co2_kg: 60.0, toxic_g: 30.2 },
    accessories: { points: 20, co2_kg: 1.2, toxic_g: 0.5 }
  };

  // Mock currently logged-in user from localStorage 
  const currentUser = JSON.parse(localStorage.getItem('ewaste_user'))?.username || 'customer';
  const nearbyCenters = [
    {
      name: 'Green Recycling Hub',
      distance: '2.5 km away',
      details: 'Opens till 6 PM',
      latitude: 11.0183,
      longitude: 76.9682,
    },
    {
      name: 'Tech Fixers Service Center',
      distance: '3.8 km away',
      details: 'Repair & Refurbish',
      latitude: 11.077,
      longitude: 77.0163,
    },
  ];

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const resp = await fetch(`${API_BASE}/customer/devices`);
      if (resp.ok) {
        const data = await resp.json();
        // Since we don't have true auth, just show devices for this user
        setDevices(data.filter(d => d.username === currentUser));
      }
    } catch (err) {
      console.error('Error fetching devices', err);
    }
  };

  const handlePredictAndSave = async (e) => {
    e.preventDefault();
    
    // Simulate AI prediction
    let action = 'Scrap';
    let desc = 'This device is too old. Send it to recycling to recover precious metals like Gold and Copper.';
    let color = 'warning';

    if (deviceType === 'phone' || age <= 4 || condition === 'good') {
      action = 'Refurbish';
      desc = 'Your device can be repaired or used as a CCTV! Connect with a local service center.';
      color = 'success';
    }

    setSuggestion({ action, desc, color });

    // Save to backend
    try {
      await fetch(`${API_BASE}/customer/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser,
          device_type: deviceType,
          age_years: age,
          condition_status: condition,
          ai_suggestion: action
        })
      });
      fetchDevices(); // Refresh list
    } catch (err) {
      console.error('Failed to save device', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE}/customer/devices/${id}`, {
        method: 'DELETE'
      });
      fetchDevices();
    } catch (err) {
      console.error('Failed to delete device', err);
    }
  };

  const openMapDirections = (latitude, longitude, label) => {
    const encodedLabel = encodeURIComponent(label);
    window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}%20(${encodedLabel})`, '_blank', 'noopener,noreferrer');
  };

  const handlePickupRequest = () => {
    const pickupCount = devices.length;
    if (pickupCount === 0) {
      setPickupMessage('Add at least one device before requesting a pickup.');
      return;
    }

    setPickupMessage(`Pickup request created for ${pickupCount} device${pickupCount > 1 ? 's' : ''}. A collection agent will contact ${currentUser} soon.`);
  };

  // Calculate environmental impact dynamically
  const calculateImpact = () => {
    return devices.reduce((acc, dev) => {
      const type = dev.device_type.toLowerCase().includes('laptop') ? 'laptop' 
                 : dev.device_type.toLowerCase().includes('tv') ? 'tv'
                 : dev.device_type.toLowerCase().includes('phone') ? 'phone'
                 : 'accessories';
      
      const metrics = ECO_METRICS[type] || ECO_METRICS.accessories;
      return {
        points: acc.points + metrics.points,
        co2: acc.co2 + (metrics.co2_kg || 0),
        toxic: acc.toxic + (metrics.toxic_g || 0)
      };
    }, { points: 0, co2: 0, toxic: 0 });
  };
  
  const impact = calculateImpact();
  
  // Determine Tier
  const getRankTier = (pts) => {
    if (pts < 50) return { name: 'Eco-Starter', color: 'secondary' };
    if (pts < 200) return { name: 'Green Warrior', color: 'success' };
    if (pts < 500) return { name: 'Earth Champion', color: 'primary' };
    return { name: 'Sustainability Hero', color: 'warning' };
  };
  const tier = getRankTier(impact.points);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Customer Dashboard</h2>
          <p className="text-muted">Manage your e-waste smartly and earn rewards</p>
        </div>
        <div className="text-end">
          <div className="d-flex flex-column align-items-end">
            <span className={`badge bg-${tier.color} fs-6 p-2 mb-1`}><Award size={18} className="me-1"/> {impact.points} Eco Points</span>
            <small className="text-muted fw-bold">Rank: {tier.name}</small>
          </div>
        </div>
      </div>

      {/* Environmental Impact Summary Feature */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0 premium-card">
            <div className="card-header border-0 pt-4 pb-0 bg-transparent">
              <h5 className="fw-bold d-flex align-items-center gap-2"><Leaf className="text-success"/> Your Environmental Impact</h5>
            </div>
            <div className="card-body">
              <div className="row g-3 text-center">
                <div className="col-md-4">
                  <div className="p-3 border rounded">
                    <div className="kpi-icon green mx-auto mb-2"><BarChart2 size={24}/></div>
                    <div className="display-6 fw-bold">{impact.co2.toFixed(1)} <span className="fs-6 text-muted">kg</span></div>
                    <p className="text-muted small mb-0">CO₂ Emissions Averted</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 border rounded">
                    <div className="kpi-icon purple mx-auto mb-2"><ShieldAlert size={24}/></div>
                    <div className="display-6 fw-bold">{impact.toxic.toFixed(1)} <span className="fs-6 text-muted">g</span></div>
                    <p className="text-muted small mb-0">Toxic Metals Diverted</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 border rounded bg-success text-white" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                    <div className="kpi-icon mx-auto mb-2" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}><Award size={24}/></div>
                    <div className="display-6 fw-bold">{impact.points}</div>
                    <p className="small mb-0 opacity-75">Total Eco Points Earned</p>
                    <div className="progress mt-2" style={{ height: '5px', background: 'rgba(255,255,255,0.3)' }}>
                      <div className="progress-bar bg-warning" style={{ width: `${Math.min((impact.points / 1000) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-header border-0 pt-4 pb-0">
              <h5 className="fw-bold"><Smartphone className="me-2" />Add New Device</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handlePredictAndSave}>
                <div className="mb-3">
                  <label className="form-label">Device Type</label>
                  <select className="form-select" value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
                    <option value="phone">Smartphone</option>
                    <option value="laptop">Laptop / PC</option>
                    <option value="tv">Television</option>
                    <option value="accessories">Cables / Accessories</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Approximate Age (Years)</label>
                  <input type="number" className="form-control" value={age} onChange={e => setAge(e.target.value)} min="1" max="20" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Physical Condition</label>
                  <select className="form-select" value={condition} onChange={e => setCondition(e.target.value)}>
                    <option value="good">Good (Working fine)</option>
                    <option value="fair">Fair (Minor issues)</option>
                    <option value="poor">Poor (Not turning on / Broken)</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary-custom w-100">Get AI Suggestion & Save</button>
              </form>

              {suggestion && (
                <div className={`alert alert-${suggestion.color} mt-4 d-flex align-items-start`}>
                  <Cpu className="me-3 mt-1" size={24} />
                  <div>
                    <strong>AI Recommendation: {suggestion.action}</strong>
                    <p className="mb-0 mt-1">{suggestion.desc}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          
          {/* List logged devices */}
          <div className="card mb-4 shadow-sm border-0">
            <div className="card-header border-0 pt-4 pb-0">
              <h5 className="fw-bold">My Logged Devices</h5>
            </div>
            <div className="card-body p-0">
              {devices.length === 0 ? (
                <p className="p-3 text-muted">No devices logged yet.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {devices.map(d => (
                    <li key={d.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{d.device_type}</strong> ({d.age_years} yrs) - 
                        <span className={`ms-2 badge bg-${d.ai_suggestion === 'Scrap' ? 'danger' : 'success'}`}>{d.ai_suggestion}</span>
                      </div>
                      <button onClick={() => handleDelete(d.id)} className="btn btn-sm btn-outline-danger"><Trash2 size={14}/></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold"><MapPin className="me-2" />Nearest Hubs & Centers</h5>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => openMapDirections(nearbyCenters[0].latitude, nearbyCenters[0].longitude, nearbyCenters[0].name)}
              >
                View Map
              </button>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                {nearbyCenters.map((center) => (
                  <li key={center.name} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-0">{center.name}</h6>
                      <small className="text-muted">{center.distance} • {center.details}</small>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => openMapDirections(center.latitude, center.longitude, center.name)}
                    >
                      Directions
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-header border-0 pt-4 pb-0">
              <h5 className="fw-bold"><Truck className="me-2" />Request Pickup</h5>
            </div>
            <div className="card-body">
              <p className="text-muted small mb-3">Schedule a door-step pickup. Our agent will collect your e-waste.</p>
              <button className="btn btn-dark w-100" onClick={handlePickupRequest}>
                <Truck size={18} className="me-2" /> Schedule Pickup Now
              </button>
              {pickupMessage && (
                <div className={`alert mt-3 mb-0 ${devices.length > 0 ? 'alert-success' : 'alert-warning'}`}>
                  {pickupMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
