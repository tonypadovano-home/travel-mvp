"use client"

import { useState, useEffect } from 'react';

export default function Home() {
  const [destination, setDestination] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [useAI, setUseAI] = useState(false);
  const [lastMode, setLastMode] = useState('');
  
  // Admin states
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  // Fetch search history on load
  useEffect(() => {
    fetchHistory();
    // Check if admin on load
    const adminStatus = localStorage.getItem('isAdmin');
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const fetchHistory = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/destinations`);
      const data = await response.json();
      setHistory(data.destinations || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear all search history?')) {
      return;
    }
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/destinations`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setHistory([]);
        alert('History cleared!');
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      alert('Failed to clear history');
    }
  };

  const handleAdminLogin = () => {
    // Change this password to your own secret password
    if (adminPassword === 'ChangeThisPwd01') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      localStorage.setItem('isAdmin', 'true');
    } else {
      alert('Incorrect password');
      setAdminPassword('');
    }
  };

  const getRecommendations = async () => {
    if (!destination.trim()) return;
    
    setLoading(true);
    setRecommendation('');
    setLastMode('');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, useAI })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setRecommendation(data.recommendation);
        setLastMode(data.mode);
        fetchHistory();
      } else {
        setRecommendation(`Error: ${data.error || 'Failed to get recommendations'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setRecommendation('Failed to get recommendations. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">
          ✈️ Travel Recommender
        </h1>

        {/* Admin Section */}
        <div className="flex justify-end mb-4">
          {!isAdmin ? (
            <button
              onClick={() => setShowAdminLogin(true)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Admin
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green-600 font-semibold">
                🔓 Admin Mode
              </span>
              <button
                onClick={() => {
                  setIsAdmin(false);
                  setUseAI(false);
                  localStorage.removeItem('isAdmin');
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Admin Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Admin Login</h3>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                placeholder="Enter admin password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-gray-800"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminPassword('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main search section */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              {/* AI Toggle - Only visible to admin */}
              {isAdmin && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {useAI ? '🤖 AI Mode (OpenAI)' : '📝 Mock Mode'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {useAI 
                        ? 'Using real OpenAI API (requires credits)' 
                        : 'Using pre-written responses (free)'}
                    </p>
                  </div>
                  <button
                    onClick={() => setUseAI(!useAI)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      useAI ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        useAI ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Where do you want to go?
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && getRecommendations()}
                  placeholder="e.g., Paris, Tokyo, New York..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              
              <button
                onClick={getRecommendations}
                disabled={loading || !destination.trim()}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Getting recommendations...' : 'Get Travel Tips'}
              </button>
              
              {recommendation && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-gray-800">
                      Tips for {destination}:
                    </h2>
                    {lastMode && (
                      <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded">
                        {lastMode}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 whitespace-pre-line">
                    {recommendation}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Search history sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  📍 Recent Searches
                </h2>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm">No searches yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                      onClick={() => {
                        setDestination(item.destination);
                        setRecommendation(item.recommendation);
                        setLastMode('History');
                      }}
                    >
                      <p className="font-semibold text-gray-800">
                        {item.destination}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}