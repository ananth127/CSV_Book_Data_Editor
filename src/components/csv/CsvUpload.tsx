import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, HardDrive, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import Papa from 'papaparse';
import { CsvRecord, CsvData } from '@/types/csv';

interface CsvUploadProps {
  onDataLoaded: (data: CsvData) => void;
  isLoading: boolean;
  loadingMessage?: string;
  onLoadingChange?: (loading: boolean, message?: string) => void;
  onError?: (error: string | null) => void;
  progress?: number; // For restoration progress from parent
  restorationData?: {
    currentRecords: number;
    totalRecords: number;
    currentSize: number;
    totalSize: number;
  };
}

const CsvUpload: React.FC<CsvUploadProps> = ({
  onDataLoaded,
  isLoading,
  loadingMessage = 'Processing your file...',
  onLoadingChange,
  onError,
  progress: externalProgress = 0,
  restorationData
}) => {
  const [error, setError] = useState<string | null>(null);
  
  // File upload progress states
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [parseProgress, setParseProgress] = useState<number>(0);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  
  // File information states
  const [fileSize, setFileSize] = useState<number>(0);
  const [uploadedSize, setUploadedSize] = useState<number>(0);
  const [estimatedTotalRows, setEstimatedTotalRows] = useState<number>(0);
  const [processedRows, setProcessedRows] = useState<number>(0);
  const [validatedRows, setValidatedRows] = useState<number>(0);
  const [totalBytesRead, setTotalBytesRead] = useState<number>(0);
  
  // Current operation state
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Estimate total rows based on file size and average row size
  const estimateRowsFromFileSize = (fileSizeBytes: number, sampleRowSize: number = 50): number => {
    // Assume average row size including headers and delimiters
    const estimatedRowSize = Math.max(sampleRowSize, 30); // minimum 30 bytes per row
    const headerOverhead = 200; // bytes for headers
    const dataSize = fileSizeBytes - headerOverhead;
    return Math.max(Math.floor(dataSize / estimatedRowSize), 100);
  };

  const resetProgress = () => {
    setUploadProgress(0);
    setParseProgress(0);
    setProcessingProgress(0);
    setFileSize(0);
    setUploadedSize(0);
    setEstimatedTotalRows(0);
    setProcessedRows(0);
    setValidatedRows(0);
    setTotalBytesRead(0);
    setCurrentOperation('');
    setIsUploading(false);
    setIsParsing(false);
    setIsProcessing(false);
  };

  const processFile = useCallback((file: File) => {
    setError(null);
    onError?.(null);
    resetProgress();
    
    setFileSize(file.size);
    // Better initial estimate based on file size
    const initialEstimate = estimateRowsFromFileSize(file.size);
    setEstimatedTotalRows(initialEstimate);
    
    setCurrentOperation('Starting file upload...');
    onLoadingChange?.(true, 'Reading file...');

    // Simulate file upload progress with realistic chunks
    setIsUploading(true);
    let uploadedBytes = 0;
    const chunkSize = Math.max(file.size * 0.08, 1024 * 50); // 8% or min 50KB chunks
    
    const uploadInterval = setInterval(() => {
      uploadedBytes += chunkSize;
      
      if (uploadedBytes >= file.size) {
        uploadedBytes = file.size;
        setUploadedSize(file.size);
        setUploadProgress(100);
        setCurrentOperation(`File uploaded successfully - ${formatFileSize(file.size)}`);
        clearInterval(uploadInterval);
        
        // Start parsing after upload completes
        setTimeout(() => {
          setIsUploading(false);
          setIsParsing(true);
          setCurrentOperation('Starting CSV parsing...');
          startParsing();
        }, 300);
      } else {
        setUploadedSize(uploadedBytes);
        const progress = (uploadedBytes / file.size) * 100;
        setUploadProgress(progress);
        setCurrentOperation(`Uploading ${formatFileSize(uploadedBytes)} of ${formatFileSize(file.size)}`);
      }
    }, 150);

    const startParsing = () => {
      let allRows: CsvRecord[] = [];
      let headers: string[] = [];
      let bytesProcessed = 0;
      let chunkCount = 0;
      let averageRowSize = 0;
      let firstChunkProcessed = false;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        chunkSize: 1024 * 64, // 64KB chunks for better granularity
        transformHeader: (header: string) => header.replace(/^\uFEFF/, '').trim(),
        
        beforeFirstChunk: (chunk) => {
          setCurrentOperation('Reading CSV structure...');
          setTotalBytesRead(0);
        },

        chunk: (results, parser) => {
          chunkCount++;
          const chunkSize = new Blob([results.data as any]).size;
          bytesProcessed += chunkSize;
          setTotalBytesRead(bytesProcessed);
          
          // Capture headers from first chunk
          if (headers.length === 0 && results.meta.fields) {
            headers = results.meta.fields.map(h => h.replace(/^\uFEFF/, '').trim());
          }

          // Add rows from this chunk
          const chunkRows = results.data as CsvRecord[];
          const validChunkRows = chunkRows.filter(row => 
            Object.values(row).some(value => value && String(value).trim())
          );
          
          allRows = [...allRows, ...validChunkRows];
          setProcessedRows(allRows.length);
          
          // After first chunk, calculate better estimate
          if (!firstChunkProcessed && validChunkRows.length > 0) {
            averageRowSize = Math.max(chunkSize / validChunkRows.length, 30);
            const betterEstimate = estimateRowsFromFileSize(file.size, averageRowSize);
            setEstimatedTotalRows(betterEstimate);
            firstChunkProcessed = true;
          }
          
          // Update progress based on bytes processed
          const parsePercentage = Math.min((bytesProcessed / file.size) * 100, 95);
          setParseProgress(parsePercentage);
          
          setCurrentOperation(
            `Parsing data: ${formatNumber(allRows.length)} rows processed (${formatFileSize(bytesProcessed)} of ${formatFileSize(file.size)})`
          );
        },

        complete: () => {
          setParseProgress(100);
          setTotalBytesRead(file.size);
          setEstimatedTotalRows(allRows.length); // Final accurate count
          setProcessedRows(allRows.length);
          setCurrentOperation(`Parsing complete! Found ${formatNumber(allRows.length)} rows`);
          
          // Start data processing
          setTimeout(() => {
            setIsParsing(false);
            setIsProcessing(true);
            processData(allRows, headers);
          }, 400);
        },

        error: (err) => {
          clearInterval(uploadInterval);
          const msg = `Error parsing CSV: ${err.message}`;
          setError(msg);
          onError?.(msg);
          resetProgress();
          onLoadingChange?.(false);
        }
      });
    };

    const processData = (rows: CsvRecord[], headers: string[]) => {
      const totalRows = rows.length;
      
      setCurrentOperation('Validating data structure...');
      setProcessingProgress(10);
      setValidatedRows(0);

      setTimeout(() => {
        try {
          if (headers.length === 0) throw new Error('No column headers found.');
          if (rows.length === 0) throw new Error('CSV has no data rows.');

          setCurrentOperation(`Validating ${formatNumber(totalRows)} rows...`);
          setProcessingProgress(30);

          // Simulate validation progress
          let validatedCount = 0;
          const validateInterval = setInterval(() => {
            validatedCount += Math.ceil(totalRows * 0.15); // Validate 15% at a time
            
            if (validatedCount >= totalRows) {
              validatedCount = totalRows;
              setValidatedRows(validatedCount);
              clearInterval(validateInterval);
              
              setTimeout(() => {
                const validRows = rows.filter(row =>
                  Object.values(row).some(value => value && String(value).trim())
                );

                if (validRows.length === 0) throw new Error('No valid data rows found.');

                setCurrentOperation(`Creating backup of ${formatNumber(validRows.length)} valid rows...`);
                setProcessingProgress(80);

                setTimeout(() => {
                  const csvData: CsvData = {
                    headers,
                    rows: validRows,
                    originalRows: JSON.parse(JSON.stringify(validRows))
                  };

                  setCurrentOperation('Finalizing data structure...');
                  setProcessingProgress(95);

                  setTimeout(() => {
                    setProcessingProgress(100);
                    setCurrentOperation(`Ready! ${formatNumber(validRows.length)} rows loaded`);
                    
                    setTimeout(() => {
                      onDataLoaded(csvData);
                      onLoadingChange?.(false);
                    }, 600);
                  }, 200);
                }, 300);
              }, 200);
            } else {
              setValidatedRows(validatedCount);
              setProcessingProgress(30 + (validatedCount / totalRows) * 50); // 30-80% range
              setCurrentOperation(`Validating rows: ${formatNumber(validatedCount)} of ${formatNumber(totalRows)}`);
            }
          }, 100);

        } catch (err: any) {
          const msg = err.message || 'Failed to process CSV data.';
          setError(msg);
          onError?.(msg);
          resetProgress();
          onLoadingChange?.(false);
        }
      }, 200);
    };

  }, [onDataLoaded, onError, onLoadingChange]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      const msg = 'Please upload a valid CSV file (.csv only).';
      setError(msg);
      onError?.(msg);
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      const msg = 'File size too large. Please upload under 100MB.';
      setError(msg);
      onError?.(msg);
      return;
    }

    processFile(file);
  }, [processFile, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: isLoading
  });

  // Use external progress for restoration, internal progress for upload
  const shouldShowExternalProgress = isLoading && !isUploading && !isParsing && !isProcessing && externalProgress > 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">CSV Data Manager</h1>
        <p className="text-muted-foreground text-lg">Upload, edit, and manage your CSV data</p>
      </div>

      <Card className="p-8">
        <div
          {...getRootProps()}
          className={`upload-zone border-2 border-dashed rounded-lg p-12 transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center space-y-4">
            {isLoading ? (
              <div className="w-full space-y-6">
                {/* Header with spinner */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-lg font-medium text-foreground">{loadingMessage}</p>
                  <p className="text-sm text-muted-foreground text-center max-w-md">{currentOperation}</p>
                </div>

                {/* File and data info */}
                <div className="flex flex-col items-center space-y-2">
                  {fileSize > 0 && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-4 w-4" />
                        <span>File: {formatFileSize(fileSize)}</span>
                      </div>
                      {(processedRows > 0 || estimatedTotalRows > 0) && (
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4" />
                          <span>
                            Rows: {formatNumber(processedRows)}
                            {estimatedTotalRows > processedRows && `/${formatNumber(estimatedTotalRows)} est.`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Restoration data info */}
                  {shouldShowExternalProgress && restorationData && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-4 w-4" />
                        <span>Size: {formatFileSize(restorationData.currentSize)}/{formatFileSize(restorationData.totalSize)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-4 w-4" />
                        <span>Records: {formatNumber(restorationData.currentRecords)}/{formatNumber(restorationData.totalRecords)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Bars */}
                <div className="w-full max-w-md space-y-4">
                  
                  {/* External Progress (for restoration) */}
                  {shouldShowExternalProgress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Restoring Data</span>
                        <span className="text-primary font-medium">{Math.round(externalProgress)}%</span>
                      </div>
                      <Progress value={externalProgress} className="w-full h-3" />
                      {restorationData && (
                        <div className="text-xs text-center text-muted-foreground">
                          {formatNumber(restorationData.currentRecords)} / {formatNumber(restorationData.totalRecords)} records loaded
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">File Upload</span>
                        <span className="text-primary font-medium">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full h-3" />
                      <div className="text-xs text-center text-muted-foreground">
                        {formatFileSize(uploadedSize)} / {formatFileSize(fileSize)} uploaded
                      </div>
                    </div>
                  )}

                  {/* Parse Progress */}
                  {isParsing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reading CSV Data</span>
                        <span className="text-primary font-medium">{Math.round(parseProgress)}%</span>
                      </div>
                      <Progress value={parseProgress} className="w-full h-3" />
                      <div className="text-xs text-center text-muted-foreground">
                        {formatNumber(processedRows)} rows found • {formatFileSize(totalBytesRead)} / {formatFileSize(fileSize)} read
                      </div>
                    </div>
                  )}

                  {/* Processing Progress */}
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Validating Data</span>
                        <span className="text-primary font-medium">{Math.round(processingProgress)}%</span>
                      </div>
                      <Progress value={processingProgress} className="w-full h-3" />
                      <div className="text-xs text-center text-muted-foreground">
                        {validatedRows > 0 
                          ? `${formatNumber(validatedRows)} / ${formatNumber(processedRows)} rows validated`
                          : `Preparing ${formatNumber(processedRows)} rows for validation`
                        }
                      </div>
                    </div>
                  )}
                </div>

                {/* Helpful explanations */}
                <div className="text-xs text-muted-foreground text-center max-w-lg">
                  {isUploading && "Reading your CSV file into memory..."}
                  {isParsing && "Converting CSV text into structured data rows and columns"}
                  {isProcessing && "Checking data quality and preparing for editing"}
                  {shouldShowExternalProgress && "Loading your previously saved data from browser storage"}
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-full bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground mb-1">
                    {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse (max 100MB)</p>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" /> Choose File
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Accepts any CSV format with headers:</p>
          <div className="bg-muted/50 rounded p-3 font-mono text-xs">
            Column1, Column2, Column3<br />
            "Value 1", "Value 2", "Value 3"
          </div>
          <div className="mt-3 p-3 bg-accent/10 rounded border border-accent/20">
            <p className="text-xs font-medium text-accent-foreground mb-1">📁 Need sample data to test?</p>
            <p className="text-xs text-muted-foreground">
              Download our{' '}
              <a href="/sample-books.csv" className="text-accent hover:underline font-medium" download>
                sample CSV file
              </a>{' '}
              with book data to try the editor.
            </p>
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="destructive" className="animate-slide-up">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default CsvUpload;