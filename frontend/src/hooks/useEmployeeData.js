import { useState, useEffect, useCallback } from 'react';
import { getStats, getHistory } from '../services/api';

/**
 * Hook to fetch employee data (stats and history)
 * @param {string} employeeId - The employee ID to fetch data for
 */
export const useEmployeeData = (employeeId) => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!employeeId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [statsData, historyData] = await Promise.all([
        getStats(employeeId),
        getHistory(employeeId),
      ]);
      
      if (statsData.success) setStats(statsData.stats);
      if (historyData.success) setHistory(historyData.history);
    } catch (err) {
      console.error('Error fetching employee data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stats, history, loading, error, refetch: fetchData };
};

export default useEmployeeData;
