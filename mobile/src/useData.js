import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshControl } from 'react-native';
import React from 'react';

// Loads data once, re-loads on pull-to-refresh or when refreshSignal changes.
export function useData(loader, deps = []) {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => {
    return Promise.resolve()
      .then(() => loaderRef.current())
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message || String(e)))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); reload(); }}
      tintColor="#6366f1"
      colors={['#6366f1']}
    />
  );

  return { data, setData, loading, error, reload, refreshControl };
}
