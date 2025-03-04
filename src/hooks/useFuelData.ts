import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { FuelData } from '../types';

interface UseFuelDataReturn {
  data: FuelData[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useFuelData(): UseFuelDataReturn {
  const [data, setData] = useState<FuelData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchFuelData() {
      try {
        const { data, error } = await supabase
          .from('fuel_data')
          .select('*')
          .order('fuel_name');

        if (error) throw error;
        setData(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch fuel data'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchFuelData();
  }, []);

  return { data, isLoading, error };
}