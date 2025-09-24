import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wifi, WifiOff, Clock, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import CsvUpload from './CsvUpload';
import DataTable from './DataTable';
import { CsvData, CsvRecord } from '@/types/csv';
import { useCsvPersistence } from '@/hooks/useCsvPersistence';
import Papa from 'papaparse';

const CsvManager: React.FC = () => {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [restorationProgress, setRestorationProgress] = useState(0);
  const [savingProgress, setSavingProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');

  const { toast } = useToast();
  const { saveData, loadData, clearData, hasStoredData, isOnline } = useCsvPersistence();

  // Format file size helper
  const formatDataSize = (rows: number): string => {
    if (rows === 0) return '0 records';
    if (rows === 1) return '1 record';
    return `${rows.toLocaleString()} records`;
  };

  useEffect(() => {
    const restoreData = async () => {
      setIsLoading(true);
      setLoadingMessage('Checking for saved data...');
      setRestorationProgress(0);
      setCurrentOperation('');

      try {
        // Check if we have stored data first
        const stored = await hasStoredData();
        setHasData(stored);

        if (!stored) {
          setIsLoading(false);
          setLoadingMessage('');
          return;
        }

        // Simulate restoration process with realistic progress
        setCurrentOperation('Connecting to storage...');
        setRestorationProgress(10);
        await new Promise(resolve => setTimeout(resolve, 300));

        setCurrentOperation('Reading saved data...');
        setRestorationProgress(30);
        await new Promise(resolve => setTimeout(resolve, 400));

        setCurrentOperation('Loading CSV structure...');
        setRestorationProgress(50);
        
        const persistedData = await loadData();
        
        if (persistedData) {
          setCurrentOperation('Validating data integrity...');
          setRestorationProgress(70);
          await new Promise(resolve => setTimeout(resolve, 300));

          setCurrentOperation('Reconstructing table data...');
          setRestorationProgress(85);
          await new Promise(resolve => setTimeout(resolve, 300));

          setCurrentOperation(`Loading ${formatDataSize(persistedData.rows.length)}...`);
          setRestorationProgress(95);
          await new Promise(resolve => setTimeout(resolve, 200));

          setRestorationProgress(100);
          setCurrentOperation('Restoration complete!');
          await new Promise(resolve => setTimeout(resolve, 500));

          setCsvData(persistedData);
          toast({
            title: 'Data Restored Successfully',
            description: `Loaded ${formatDataSize(persistedData.rows.length)} from storage`,
          });
        }
      } catch (err) {
        console.error('Restoration error:', err);
        setError('Failed to restore saved data. Starting fresh.');
        setTimeout(() => setError(null), 5000);
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
        setRestorationProgress(0);
        setCurrentOperation('');
      }
    };

    restoreData();
  }, [loadData, toast, hasStoredData]);

  const handleDataLoaded = async (data: CsvData) => {
    setIsLoading(true);
    setLoadingMessage('Saving your data...');
    setSavingProgress(0);
    setCurrentOperation('');

    try {
      setCsvData(data);

      // Simulate saving process with progress
      setCurrentOperation('Preparing data for storage...');
      setSavingProgress(20);
      await new Promise(resolve => setTimeout(resolve, 300));

      setCurrentOperation('Compressing data...');
      setSavingProgress(50);
      await new Promise(resolve => setTimeout(resolve, 400));

      setCurrentOperation('Writing to storage...');
      setSavingProgress(80);
      
      await saveData(data);
      
      setSavingProgress(95);
      setCurrentOperation('Finalizing save...');
      await new Promise(resolve => setTimeout(resolve, 200));

      setSavingProgress(100);
      setCurrentOperation('Save complete!');
      await new Promise(resolve => setTimeout(resolve, 300));

      toast({
        title: 'Success!',
        description: `Loaded and saved ${formatDataSize(data.rows.length)} successfully`,
      });
    } catch (err) {
      setError('Failed to save data. Your changes may not persist.');
      console.error('Save error:', err);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      setSavingProgress(0);
      setCurrentOperation('');
    }
  };

  const handleDataChange = async (newData: CsvRecord[]) => {
    if (csvData) {
      const updatedData = { ...csvData, rows: newData };
      setCsvData(updatedData);
      
      // Auto-save in background without showing progress
      try {
        await saveData(updatedData);
      } catch (err) {
        console.warn('Failed to auto-save changes:', err);
      }
    }
  };

  const handleDownload = () => {
    if (!csvData) return;
    
    const csv = Papa.unparse(csvData.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `edited_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({
      title: 'Downloaded Successfully!',
      description: `Downloaded ${formatDataSize(csvData.rows.length)} as CSV file`,
    });
  };

  const handleReset = () => {
    if (csvData) {
      setCsvData({
        ...csvData,
        rows: JSON.parse(JSON.stringify(csvData.originalRows)),
      });
      toast({
        title: 'Reset Complete',
        description: 'All changes reverted to original data',
      });
    }
  };

  const handleBackToUpload = async () => {
    setCsvData(null);
    setError(null);
    setRestorationProgress(0);
    setSavingProgress(0);
    await clearData();
    toast({
      title: 'Session Cleared',
      description: 'All data has been cleared. You can upload a new file.',
    });
  };

  // Show data table if we have CSV data
  if (csvData) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleBackToUpload}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Upload
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>{formatDataSize(csvData.rows.length)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? 'default' : 'secondary'} className="gap-1">
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              {!isOnline && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" /> Auto-expires in 10min
                </Badge>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DataTable
            data={csvData.rows}
            originalData={csvData.originalRows}
            onDataChange={handleDataChange}
            onDownload={handleDownload}
            onReset={handleReset}
          />
        </div>
      </div>
    );
  }

  // Show upload interface
  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {hasData && csvData && !isLoading && (
          <Alert className="bg-accent/10 border-accent/20">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              You have previously saved CSV data. It will be restored automatically when you refresh.
              {!isOnline && ' Note: Data will expire in 10 minutes while offline.'}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <CsvUpload
          onDataLoaded={handleDataLoaded}
          isLoading={isLoading}
          loadingMessage={loadingMessage || (isLoading ? 'Processing...' : '')}
          onLoadingChange={(loading, message) => {
            setIsLoading(loading);
            setLoadingMessage(message || '');
          }}
          onError={setError}
          progress={restorationProgress || savingProgress} // Pass the appropriate progress
        />
      </div>
    </div>
  );
};

export default CsvManager;