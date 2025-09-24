import { useState, useEffect, useCallback } from 'react';
import { openDB } from 'idb';
import { CsvData } from '@/types/csv';

const STORAGE_KEY = 'csv_data_persistent';
const EXPIRY_MINUTES = 10;

interface StoredCsvData {
  data: CsvData;
  timestamp: number;
  online: boolean;
}

const DB_NAME = 'csv-db';
const STORE_NAME = 'csvData';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  },
});

export const useCsvPersistence = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Online/offline tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveData = useCallback(async (csvData: CsvData) => {
    const storedData: StoredCsvData = {
      data: csvData,
      timestamp: Date.now(),
      online: isOnline,
    };
    try {
      const db = await dbPromise;
      await db.put(STORE_NAME, storedData, STORAGE_KEY);
      console.log('CSV data saved to IndexedDB');
    } catch (error) {
      console.warn('Failed to save CSV data:', error);
    }
  }, [isOnline]);

  const loadData = useCallback(async (): Promise<CsvData | null> => {
    try {
      const db = await dbPromise;
      const stored: StoredCsvData | undefined = await db.get(STORE_NAME, STORAGE_KEY);
      if (!stored) return null;

      const ageInMinutes = (Date.now() - stored.timestamp) / (1000 * 60);
      if (!stored.online && ageInMinutes > EXPIRY_MINUTES) {
        await db.delete(STORE_NAME, STORAGE_KEY);
        return null;
      }

      return stored.data;
    } catch (error) {
      console.warn('Failed to load CSV data:', error);
      return null;
    }
  }, []);

  const clearData = useCallback(async () => {
    try {
      const db = await dbPromise;
      await db.delete(STORE_NAME, STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear CSV data:', error);
    }
  }, []);

  const hasStoredData = useCallback(async (): Promise<boolean> => {
    const data = await loadData();
    return data !== null;
  }, [loadData]);

  return {
    saveData,
    loadData,
    clearData,
    hasStoredData,
    isOnline,
  };
};
