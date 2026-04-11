import React, { useState } from 'react';
import { 
  Building2, Leaf, Truck, FileText, BarChart3, Upload, 
  Trash2, Award, ArrowUpRight, ArrowDownRight, ShieldCheck, Download
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const IndustryDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState('');
  const [disposalData, setDisposalData] = useState({ device_category: 'IT Equipment (Laptops, PCs, Servers)', weight_kg: '', data_security: 'Software Data Wiping' });

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleDisposalSubmit = async (e) => {
    e.preventDefault();
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${BASE_URL}/industry/disposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disposalData)
      });
      if (res.ok) {
        showNotification('Disposal request submitted successfully.');
        setDisposalData({ ...disposalData, weight_kg: '' });
      } else {
        showNotification('Failed to submit request.');
      }
    } catch (err) {
      showNotification('Error connecting to server.');
    }
  };

  // Dummy data for charts
  const recoveryData = [
    { name: 'Reused', value: 45, color: '#10b981' },
    { name: 'Recycled', value: 35, color: '#3b82f6' },
    { name: 'Refurbished', value: 15, color: '#f59e0b' },
    { name: 'Disposed', value: 5, color: '#ef4444' }
  ];

  const monthlyGeneration = [
    { month: 'Jan', Laptops: 120, Servers: 40, PCs: 80 },
    { month: 'Feb', Laptops: 150, Servers: 35, PCs: 95 },
    { month: 'Mar', Laptops: 180, Servers: 60, PCs: 110 },
    { month: 'Apr', Laptops: 140, Servers: 45, PCs: 90 },
    { month: 'May', Laptops: 200, Servers: 55, PCs: 130 },
    { month: 'Jun', Laptops: 170, Servers: 50, PCs: 105 }
  ];

  const logisticsData = [
    { date: '2026-04-10', id: 'TRK-9821', status: 'In Transit', driver: 'John Doe', destination: 'Green Era Facility A' },
    { date: '2026-04-08', id: 'TRK-9815', status: 'Delivered', driver: 'Alice Smith', destination: 'Green Era Facility B' },
    { date: '2026-04-05', id: 'TRK-9802', status: 'Processing', driver: 'Mike Johnson', destination: 'Shredding Center 1' }
  ];

  return (
    <div className="container-fluid p-4 position-relative">
      {notification && (
        <div className="alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3 shadow z-3">
          {notification}
        </div>
      )}

      {/* Header section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1"><Building2 className="me-2 text-primary" /> Industry Portal</h2>
          <p className="text-muted mb-0">Manage corporate e-waste, compliance, and sustainability goals</p>
        </div>
        <div className="d-flex gap-3">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body py-2 px-4 d-flex align-items-center gap-3">
              <Award size={32} />
              <div>
                <h6 className="mb-0 text-white-50">Green Rating</h6>
                <h3 className="mb-0 fw-bold">A+</h3>
              </div>
            </div>
          </div>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setActiveTab('disposal')}>
            <Upload size={18} /> Schedule Pickup
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-pills mb-4 border-bottom pb-3">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <BarChart3 className="me-2" size={18}/> Dashboard
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'disposal' ? 'active' : ''}`} onClick={() => setActiveTab('disposal')}>
            <Trash2 className="me-2" size={18}/> Bulk Disposal
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'logistics' ? 'active' : ''}`} onClick={() => setActiveTab('logistics')}>
            <Truck className="me-2" size={18}/> Reverse Logistics
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'compliance' ? 'active' : ''}`} onClick={() => setActiveTab('compliance')}>
            <FileText className="me-2" size={18}/> EPR & Compliance
          </button>
        </li>
      </ul>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="row g-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between mb-3">
                  <h6 className="text-muted mb-0">Total Waste Generated</h6>
                  <Leaf className="text-success" size={20} />
                </div>
                <h3 className="fw-bold">4,250 kg</h3>
                <p className="text-success mb-0 d-flex align-items-center small">
                  <ArrowDownRight size={16} className="me-1"/> 12% from last year
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between mb-3">
                  <h6 className="text-muted mb-0">Recycling Efficiency</h6>
                  <BarChart3 className="text-primary" size={20} />
                </div>
                <h3 className="fw-bold">92.5%</h3>
                <p className="text-success mb-0 d-flex align-items-center small">
                  <ArrowUpRight size={16} className="me-1"/> 3.2% improvement
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between mb-3">
                  <h6 className="text-muted mb-0">Secure Wipes Done</h6>
                  <ShieldCheck className="text-info" size={20} />
                </div>
                <h3 className="fw-bold">1,840</h3>
                <p className="text-muted mb-0 small">Devices completely sanitized</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between mb-3">
                  <h6 className="text-muted mb-0">EPR Target Status</h6>
                  <Award className="text-warning" size={20} />
                </div>
                <h3 className="fw-bold">85%</h3>
                <div className="progress mt-2" style={{height: '6px'}}>
                  <div className="progress-bar bg-warning" role="progressbar" style={{width: '85%'}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent border-0 pt-4 pb-0">
                <h5 className="fw-bold">Waste Generation by Device Type</h5>
              </div>
              <div className="card-body" style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyGeneration}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{fill: 'transparent'}} />
                    <Legend />
                    <Bar dataKey="Laptops" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Servers" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="PCs" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent border-0 pt-4 pb-0">
                <h5 className="fw-bold">Lifecycle Recovery Breakdown</h5>
              </div>
              <div className="card-body d-flex flex-column justify-content-center">
                <div style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={recoveryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {recoveryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="row text-center mt-3">
                  {recoveryData.map((item, idx) => (
                    <div className="col-6 mb-2" key={idx}>
                      <div className="d-flex align-items-center justify-content-center gap-2">
                        <div style={{width: '12px', height: '12px', backgroundColor: item.color, borderRadius: '50%'}}></div>
                        <span className="small">{item.name} ({item.value}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disposal Tab */}
      {activeTab === 'disposal' && (
        <div className="row g-4">
          <div className="col-md-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">Schedule Bulk Collection</h5>
                <form onSubmit={handleDisposalSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Device Category</label>
                      <select className="form-select" value={disposalData.device_category} onChange={(e) => setDisposalData({...disposalData, device_category: e.target.value})}>
                        <option value="IT Equipment (Laptops, PCs, Servers)">IT Equipment (Laptops, PCs, Servers)</option>
                        <option value="Telecommunication (Phones, Routers)">Telecommunication (Phones, Routers)</option>
                        <option value="Consumer Electronics (Displays, Printers)">Consumer Electronics (Displays, Printers)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Estimated Weight (kg)</label>
                      <input type="number" className="form-control" placeholder="e.g., 500" value={disposalData.weight_kg} onChange={(e) => setDisposalData({...disposalData, weight_kg: e.target.value})} required />
                    </div>
                    <div className="col-12 mt-4 mb-2">
                      <h6 className="fw-bold">Data Security Requirement</h6>
                    </div>
                    <div className="col-md-6">
                      <div className="form-check card p-3 border">
                        <input className="form-check-input ms-1" type="radio" name="dataSecurity" id="wipe" value="Software Data Wiping" checked={disposalData.data_security === 'Software Data Wiping'} onChange={(e) => setDisposalData({...disposalData, data_security: e.target.value})} />
                        <label className="form-check-label fw-bold ms-2" htmlFor="wipe">
                          Software Data Wiping
                          <p className="text-muted small fw-normal mb-0">Dod 5220.22-M Standard wipe with certificate</p>
                        </label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-check card p-3 border">
                        <input className="form-check-input ms-1" type="radio" name="dataSecurity" id="shred" value="Physical Shredding" checked={disposalData.data_security === 'Physical Shredding'} onChange={(e) => setDisposalData({...disposalData, data_security: e.target.value})} />
                        <label className="form-check-label fw-bold ms-2" htmlFor="shred">
                          Physical Shredding
                          <p className="text-muted small fw-normal mb-0">Hard drives physically destroyed to 20mm</p>
                        </label>
                      </div>
                    </div>
                    <div className="col-12 mt-4">
                      <button type="submit" className="btn btn-primary">Submit Disposal Request</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm bg-primary text-white mb-4">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Value Recovery Estimate</h5>
                <p className="opacity-75">AI models estimate the potential return value from your recent disposals through refurbishing and precious metal extraction.</p>
                <h2 className="fw-bold display-5 mt-4">$4,250</h2>
                <p className="small mb-0 opacity-75">Estimated return for next batch</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Tab */}
      {activeTab === 'logistics' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-transparent border-0 pt-4 pb-0">
             <h5 className="fw-bold">Reverse Logistics Tracking</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Tracking ID</th>
                    <th>Pickup Date</th>
                    <th>Destination</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logisticsData.map((item, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold text-primary">{item.id}</td>
                      <td>{item.date}</td>
                      <td>{item.destination}</td>
                      <td>{item.driver}</td>
                      <td>
                        <span className={`badge ${item.status === 'Delivered' ? 'bg-success' : item.status === 'In Transit' ? 'bg-warning text-dark' : 'bg-info'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => showNotification(`Tracking details for ${item.id} sent to email.`)}>Track</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="row g-4">
          <div className="col-md-12">
             <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-4">Certificates & Auto-Generated Reports</h5>
                  <div className="row">
                    {[
                      { title: 'Q1 EPR Compliance Report', date: 'March 31, 2026', type: 'PDF' },
                      { title: 'Data Destruction Certificate (Batch #849)', date: 'April 05, 2026', type: 'PDF' },
                      { title: 'Pollution Control Document Form-3', date: 'April 08, 2026', type: 'PDF' },
                      { title: 'Green Sustainability Certificate 2025', date: 'Jan 15, 2026', type: 'PDF' }
                    ].map((doc, idx) => (
                      <div className="col-md-6 mb-3" key={idx}>
                        <div className="d-flex align-items-center justify-content-between p-3 border rounded hover-bg-light">
                          <div className="d-flex align-items-center gap-3">
                            <div className="bg-light p-2 rounded text-danger">
                              <FileText size={24} />
                            </div>
                            <div>
                              <h6 className="mb-0 fw-bold">{doc.title}</h6>
                              <small className="text-muted">Generated: {doc.date}</small>
                            </div>
                          </div>
                          <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={() => showNotification(`Downloading ${doc.title}...`)}>
                            <Download size={14} /> Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndustryDashboard;
