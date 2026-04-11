import React, { useState } from 'react';
import { 
  GraduationCap, Beaker, FileSpreadsheet, Users, Wrench, Sprout, 
  Download, BookOpen, Presentation, CheckCircle, BarChart2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

const InstituteDashboard = () => {
  const [activeTab, setActiveTab] = useState('lab');
  const [notification, setNotification] = useState('');
  const [devices, setDevices] = useState([]);

  React.useEffect(() => {
    if (activeTab === 'lab') {
      fetchDevices();
    }
  }, [activeTab]);

  const fetchDevices = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${BASE_URL}/institute/devices`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (err) {
      console.error('Error fetching devices', err);
    }
  };

  const updateDeviceStatus = async (id, currentStatus) => {
    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const newStatus = currentStatus === 'Awaiting Diagnostics' ? 'Repairing' : 'Refurbished';
      const res = await fetch(`${BASE_URL}/institute/devices/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showNotification('Status updated successfully.');
        fetchDevices();
      }
    } catch (err) {
      showNotification('Error updating status.');
    }
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const performanceData = [
    { month: 'Jan', refurbished: 20, students_trained: 45 },
    { month: 'Feb', refurbished: 35, students_trained: 50 },
    { month: 'Mar', refurbished: 42, students_trained: 65 },
    { month: 'Apr', refurbished: 55, students_trained: 80 }
  ];

  return (
    <div className="container-fluid p-4 position-relative">
      {notification && (
        <div className="alert alert-info position-fixed top-0 start-50 translate-middle-x mt-3 shadow z-3">
          {notification}
        </div>
      )}

      {/* Header section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1"><GraduationCap className="me-2 text-primary" /> Institute Hub</h2>
          <p className="text-muted mb-0">Research, refurbishment, education, and innovation</p>
        </div>
        <div className="d-flex gap-3">
          <div className="card border-0 shadow-sm bg-info text-white">
            <div className="card-body py-2 px-4 d-flex align-items-center gap-3">
              <Sprout size={32} />
              <div>
                <h6 className="mb-0 text-white-50">Impact Score</h6>
                <h3 className="mb-0 fw-bold">842 pts</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-pills mb-4 border-bottom pb-3">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'lab' ? 'active' : ''}`} onClick={() => setActiveTab('lab')}>
            <Wrench className="me-2" size={18}/> Refurbishment Lab
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'research' ? 'active' : ''}`} onClick={() => setActiveTab('research')}>
            <Beaker className="me-2" size={18}/> ML & Research Datasets
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>
            <BookOpen className="me-2" size={18}/> Skill Development
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'exchange' ? 'active' : ''}`} onClick={() => setActiveTab('exchange')}>
            <Users className="me-2" size={18}/> Circular Exchange
          </button>
        </li>
      </ul>

      {/* Refurbishment Lab Tab */}
      {activeTab === 'lab' && (
        <div className="row g-4">
          <div className="col-md-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-transparent border-0 pt-4 pb-0">
                <h5 className="fw-bold d-flex align-items-center gap-2"><Wrench className="text-primary"/> Devices in Lab</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Device Type</th>
                        <th>Source Industry</th>
                        <th>Condition Intake</th>
                        <th>Current Status</th>
                        <th>Intended Use</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.length === 0 ? (
                        <tr><td colSpan="6" className="text-center">No devices in lab currently.</td></tr>
                      ) : (
                        devices.map(device => (
                          <tr key={device.id}>
                            <td className="fw-bold">{device.category}</td>
                            <td>System Intake</td>
                            <td>{device.issues}</td>
                            <td>
                              <span className={`badge ${device.status === 'Refurbished' ? 'bg-success' : device.status === 'Repairing' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                                {device.status}
                              </span>
                            </td>
                            <td>Student Comm</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline-primary" 
                                onClick={() => updateDeviceStatus(device.id, device.status)}
                                disabled={device.status === 'Refurbished'}
                              >
                                {device.status === 'Refurbished' ? 'Issued' : 'Update Status'}
                              </button>
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
          
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent border-0 pt-4 pb-0">
                <h5 className="fw-bold">Lab Performance</h5>
              </div>
              <div className="card-body" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="refurbished" stroke="#10b981" strokeWidth={3} name="Refurbished Devices" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ML & Research Tab */}
      {activeTab === 'research' && (
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0">Anonymized E-Waste Datasets for ML</h5>
                  <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => showNotification('Dataset contribution portal opened.')}>
                    <FileSpreadsheet size={16}/> Contribute Data
                  </button>
                </div>
                
                <div className="row">
                  {[
                    { title: 'Global E-Waste Generation 2025', size: '1.2 GB', format: 'CSV/JSON', desc: 'Anonymized batch records of corporate IT disposal.' },
                    { title: 'Device Component Lifespan Data', size: '450 MB', format: 'CSV', desc: 'MTBF data for extracted RAM, HDDs, and CPUs.' },
                    { title: 'E-Waste Image Classification', size: '4.8 GB', format: 'Images', desc: 'Over 50,000 labeled images of dismantled components for CV.' },
                    { title: 'Value Recovery Forecasting', size: '800 MB', format: 'HDF5', desc: 'Historical scrap market values mapped to device specs.' }
                  ].map((dataset, idx) => (
                    <div className="col-md-6 mb-4" key={idx}>
                      <div className="card h-100 border bg-light">
                        <div className="card-body d-flex flex-column">
                          <h6 className="fw-bold">{dataset.title}</h6>
                          <div className="d-flex gap-2 mb-2">
                            <span className="badge bg-secondary text-white">{dataset.format}</span>
                            <span className="badge bg-dark text-white">{dataset.size}</span>
                          </div>
                          <p className="small text-muted flex-grow-1">{dataset.desc}</p>
                          <button className="btn btn-primary btn-sm mt-auto d-flex align-items-center justify-content-center gap-2" onClick={() => showNotification(`Starting download for ${dataset.title}...`)}>
                            <Download size={14}/> Download Dataset
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skill Development Tab */}
      {activeTab === 'skills' && (
        <div className="row g-4">
          <div className="col-md-8">
            <div className="card border-0 shadow-sm">
               <div className="card-header bg-transparent border-0 pt-4 pb-0">
                  <h5 className="fw-bold">Training Modules & Certification</h5>
               </div>
               <div className="card-body">
                 <div className="list-group list-group-flush">
                    <div className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="fw-bold mb-1">AI-based Waste Sorting Analysis</h6>
                        <p className="text-muted small mb-0">Learn to build CV models for automated segregation.</p>
                      </div>
                      <button className="btn btn-outline-primary btn-sm" disabled>Enrolled</button>
                    </div>
                    <div className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center">
                      <div>
                         <h6 className="fw-bold mb-1">Safe Dismantling Protocols (Level 1)</h6>
                         <p className="text-muted small mb-0">Safety guidelines and physical teardown of laptops.</p>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => showNotification('Redirecting to LMS for "Safe Dismantling Protocols"...')}>Start Course</button>
                    </div>
                    <div className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center">
                      <div>
                         <h6 className="fw-bold mb-1">Circular Economy Strategies</h6>
                         <p className="text-muted small mb-0">Theory and implementation of sustainable IT cycles.</p>
                      </div>
                      <span className="text-success small fw-bold d-flex align-items-center gap-1"><CheckCircle size={14}/> Completed</span>
                    </div>
                 </div>
               </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm bg-primary text-white h-100">
               <div className="card-body text-center d-flex flex-column justify-content-center align-items-center">
                  <Presentation size={48} className="mb-3 opacity-75"/>
                  <h4 className="fw-bold">Organize Campaign</h4>
                  <p className="small opacity-75 px-3">Launch an awareness drive or e-waste collection run in your campus.</p>
                  <button className="btn btn-light mt-2 fw-bold text-primary" onClick={() => showNotification('Event creation form launched.')}>Start Event</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Circular Exchange Tab */}
      {activeTab === 'exchange' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 text-center">
            <Users size={64} className="text-muted mb-4 opacity-50" />
            <h4 className="fw-bold">Industry-Institute Collaboration Hub</h4>
            <p className="text-muted mb-4 mx-auto" style={{maxWidth: '600px'}}>
              Request end-of-life devices directly from partnered industries for lab usage and R&D. Contribute your refurbished systems back into the circular economy.
            </p>
            <div className="row g-3 justify-content-center">
              <div className="col-md-4">
                <div className="card border-primary h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="fw-bold text-primary">Request Devices</h5>
                    <p className="small text-muted mb-3">Browse available industrial e-waste batches donated for academic use.</p>
                    <button className="btn btn-outline-primary w-100" onClick={() => showNotification('Fetching listings from the Hub network...')}>View Listings</button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                 <div className="card border-success h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="fw-bold text-success">Offer Refurbished</h5>
                    <p className="small text-muted mb-3">List repaired devices for deployment in NGOs, schools, or back to businesses.</p>
                    <button className="btn btn-outline-success w-100" onClick={() => showNotification('Loading refurbishment listing manager...')}>Create Listing</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstituteDashboard;
