import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<'admin' | 'staff' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserRole();
    } else {
      setRole(null);
      setLoading(false);
    }
  }, [user]);

  const loadUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setRole(data.role as 'admin' | 'staff');
    }
    setLoading(false);
  };

  return { role, loading };
}
