import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useEmployeeData } from '../hooks';
import { Button, Card, Badge, getStatusVariant } from '../components';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { stats, history } = useEmployeeData(user?.employee_id);

  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.full_name}</h1>
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/face-check')} variant="success">
              Face Check
            </Button>
            <Button onClick={() => navigate('/admin/register-face')}>
              Register Face
            </Button>
            <Button onClick={handleLogout} variant="danger">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Diligence Score</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.diligence_score}%</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">On Time</h3>
              <p className="text-3xl font-bold text-green-600">{stats.on_time}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Late</h3>
              <p className="text-3xl font-bold text-orange-500">{stats.late}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Total Days</h3>
              <p className="text-3xl font-bold text-gray-700">{stats.total_days}</p>
            </div>
          </div>
        )}

        <Card title="Recent Attendance History">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.check_in}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.check_out}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusVariant(item.status_code)}>
                      {item.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
