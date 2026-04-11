import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Building, Settings, Shield, Factory, GraduationCap } from 'lucide-react';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [isRegister, setIsRegister] = useState(false);

  const roles = [
    { id: 'admin', name: 'Admin', icon: <Shield size={40} className="mb-2" />, desc: 'Government / Authority' },
    { id: 'hub', name: 'Hub', icon: <Building size={40} className="mb-2" />, desc: 'Collection & Inventory' },
    { id: 'customer', name: 'Customer', icon: <User size={40} className="mb-2" />, desc: 'Public User' },
    { id: 'service', name: 'Service', icon: <Settings size={40} className="mb-2" />, desc: 'Repair & Recycling' },
    { id: 'industry', name: 'Industry', icon: <Factory size={40} className="mb-2" />, desc: 'B2B Disposal & Compliance' },
    { id: 'institute', name: 'Institute', icon: <GraduationCap size={40} className="mb-2" />, desc: 'Research & Refurbishing' }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    
    // For admin, currently keep hardcoded as a fail-safe, but others go to DB
    if (selectedRole === 'admin' && username === 'admin' && password === 'admin123') {
      onLogin({ role: 'admin', username });
      navigate('/');
      return;
    } else if (selectedRole === 'admin') {
      setError('Invalid admin credentials.');
      return;
    }

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: selectedRole })
      });

      const data = await res.json();

      if (res.ok) {
        onLogin({ role: selectedRole, username });
        const pathMap = {
          hub: '/hub',
          customer: '/customer',
          service: '/service',
          industry: '/industry',
          institute: '/institute'
        };
        navigate(pathMap[selectedRole]);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    }
  };

  return (
    <div className="container mt-5">
      <div className="text-center mb-5">
        <h1 className="fw-bold">Welcome to E-Waste Platform</h1>
        <p className="text-muted">Select your module to sign in</p>
      </div>

      <div className="row justify-content-center mb-4">
        {roles.map(role => (
          <div key={role.id} className="col-6 col-md-3 mb-3">
            <div 
              className={`card text-center p-3 cursor-pointer transition ${selectedRole === role.id ? 'border-primary bg-primary text-white' : 'border-secondary'}`}
              onClick={() => { setSelectedRole(role.id); setError(''); }}
              style={{ cursor: 'pointer', transition: '0.3s' }}
            >
              <div className="card-body p-0">
                {role.icon}
                <h5 className="card-title fw-bold">{role.name}</h5>
                <small className={selectedRole === role.id ? 'text-white-50' : 'text-muted'}>{role.desc}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h3 className="card-title text-center mb-4">
                {roles.find(r => r.id === selectedRole).name} {isRegister && selectedRole !== 'admin' ? 'Register' : 'Login'}
              </h3>
              
              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={`Enter ${selectedRole} username`}
                    required
                  />
                  <div className="form-text">{isRegister ? 'Choose a unique username' : 'Enter your registered username'}</div>
                </div>
                
                <div className="mb-4">
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                  <div className="form-text">Secure password required.</div>
                </div>

                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary btn-lg">
                    <LogIn size={20} className="me-2" />
                    {isRegister && selectedRole !== 'admin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </div>
                {selectedRole !== 'admin' && (
                  <div className="text-center mt-3">
                    <button 
                      type="button" 
                      className="btn btn-link text-decoration-none" 
                      onClick={() => setIsRegister(!isRegister)}
                    >
                      {isRegister ? 'Already have an account? Sign In' : 'New user? Create an account'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
