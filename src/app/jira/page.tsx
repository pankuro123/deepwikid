'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaUpload, FaSpinner, FaFilePdf, FaCheckCircle, FaExclamationTriangle, FaListAlt } from 'react-icons/fa';
import ThemeToggle from '@/components/theme-toggle';

export default function JiraPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setError("Please select a valid PDF file.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResults(null); // Clear previous results
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().endsWith('.pdf')) {
        setError("Please drop a valid PDF file.");
        return;
      }
      setFile(droppedFile);
      setError(null);
      setResults(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.errorText || "An error occurred while processing the PDF.");
      }

      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process the Jira PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to render a single requirement
  const renderRequirement = (req: any, index: number) => {
    if (typeof req === 'string') {
      return <li key={index} className="mb-2 text-sm text-[var(--foreground)]">{req}</li>;
    }
    
    // If it's an object with various fields
    return (
      <div key={index} className="mb-4 p-4 bg-[var(--background)]/50 rounded-lg border border-[var(--border-color)]">
        {Object.entries(req).map(([key, value]) => (
          <div key={key} className="mb-2">
            <span className="font-semibold text-xs text-[var(--accent-primary)] uppercase tracking-wider">{key}: </span>
            <span className="text-sm text-[var(--foreground)]">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Helper to neatly render clusters
  const renderCluster = (cluster: any, index: number) => {
    // Handle cases where cluster might be an entry from an object or a direct object
    const clusterData = cluster;
    const clusterName = clusterData.functional_area || clusterData.cluster_name || clusterData.name || clusterData.title || `Requirement Group ${index + 1}`;
    const description = clusterData.summary || clusterData.description || '';
    const items = clusterData.requirements || clusterData.items || clusterData.tickets || [];
    
    return (
      <div key={index} className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] shadow-sm mb-6 overflow-hidden transition-all hover:shadow-md">
        <div className="bg-[var(--accent-primary)]/5 px-6 py-5 border-b border-[var(--border-color)]">
          <div className="flex items-start gap-4">
            <div className="bg-[var(--accent-primary)]/10 p-2 rounded-lg mt-1">
              <FaListAlt className="text-[var(--accent-primary)] text-lg" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[var(--foreground)] font-serif leading-tight">
                {clusterName}
              </h3>
              {description && (
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed italic">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-[var(--background)]/30">
          {Array.isArray(items) && items.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-widest mb-2 opacity-70">Requirements & Specs</h4>
              <ul className="space-y-3">
                {items.map((item, idx) => (
                  <li key={idx} className="flex gap-3 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] mt-1.5 flex-shrink-0 group-hover:scale-125 transition-transform" />
                    <div className="text-sm text-[var(--foreground)] leading-relaxed">
                      {typeof item === 'string' ? item : JSON.stringify(item)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)] italic">No specific sub-requirements documented for this area.</p>
          )}
          
          {/* Render any additional fields at the top level of the cluster if they exist */}
          {Object.entries(clusterData).map(([key, value]) => {
            if (!['functional_area', 'cluster_name', 'name', 'title', 'description', 'summary', 'requirements', 'items', 'tickets'].includes(key)) {
              return (
                 <div key={key} className="mt-6 pt-4 border-t border-[var(--border-color)]/50">
                   <h4 className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-widest mb-2 opacity-70">{key.replace(/_/g, ' ')}</h4>
                   <div className="text-sm text-[var(--foreground)] bg-[var(--card-bg)]/50 p-4 rounded-lg border border-[var(--border-color)] shadow-inner">
                     {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                   </div>
                 </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    // Check if the overall structure is an array or object of clusters
    let clustersArray: any[] = [];
    
    const rawClusters = results.clusters || results.data || results;
    
    if (Array.isArray(rawClusters)) {
      clustersArray = rawClusters;
    } else if (typeof rawClusters === 'object' && rawClusters !== null) {
      // Handle the format with numeric keys {"0": {...}, "1": {...}}
      clustersArray = Object.values(rawClusters);
    } else {
      clustersArray = [rawClusters];
    }

    return (
      <div className="mt-12 animate-fade-in w-full max-w-4xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-4">
            <div className="bg-green-500/10 p-2 rounded-full">
              <FaCheckCircle className="text-2xl text-green-500" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-[var(--foreground)]">Consolidated Requirements</h2>
          </div>
          <div className="text-xs text-[var(--muted)] bg-[var(--background)] px-3 py-1 rounded-full border border-[var(--border-color)]">
            {clustersArray.length} Cluster{clustersArray.length !== 1 ? 's' : ''} Detected
          </div>
        </div>
        
        <div className="space-y-8">
          {clustersArray.map((cluster, idx) => renderCluster(cluster, idx))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen paper-texture p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <Link 
          href="/"
          className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--accent-primary)] transition-colors font-medium text-sm"
        >
          <FaArrowLeft />
          Back to Home
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl flex flex-col items-center">
        <div className="w-full bg-[var(--card-bg)] rounded-xl shadow-custom border border-[var(--border-color)] p-8 md:p-12 text-center card-japanese">
          
          <h1 className="text-3xl font-bold font-serif text-[var(--foreground)] mb-3">Jira Requirements Parser</h1>
          <p className="text-[var(--muted)] mb-8 max-w-xl mx-auto">
            Upload a PDF containing exported Jira tickets, and our pipeline will automatically extract, analyze, and cluster them into consolidated technical requirements.
          </p>

          {/* Upload Dropzone */}
          <div 
            className={`relative border-2 border-dashed rounded-xl p-10 transition-colors ${
              file ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 bg-[var(--background)]/50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {file ? (
              <div className="flex flex-col items-center gap-4">
                <FaFilePdf className="text-5xl text-red-500" />
                <div>
                  <p className="text-[var(--foreground)] font-medium text-lg">{file.name}</p>
                  <p className="text-[var(--muted)] text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[var(--accent-primary)] hover:underline mt-2"
                >
                  Change File
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-[var(--accent-primary)]/10 p-4 rounded-full">
                  <FaUpload className="text-3xl text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="text-[var(--foreground)] font-medium mb-1">Drag and drop your PDF here</p>
                  <p className="text-[var(--muted)] text-sm">or click to browse files</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-japanese px-6 py-2 mt-2 rounded-lg text-sm"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-left">
              <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-8">
            <button
              onClick={handleProcess}
              disabled={!file || isProcessing}
              className={`px-8 py-3 rounded-xl font-bold text-lg shadow-sm transition-all flex items-center gap-3 mx-auto ${
                !file || isProcessing
                  ? 'bg-[var(--border-color)] text-[var(--muted)] cursor-not-allowed'
                  : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--highlight)] hover:-translate-y-0.5 shadow-md'
              }`}
            >
              {isProcessing ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Processing PDF...
                </>
              ) : (
                'Generate Requirements'
              )}
            </button>
          </div>
          
          {/* Note */}
          <p className="text-xs text-[var(--muted)] mt-6 max-w-md mx-auto">
            Note: Processing may take a few minutes depending on the size of the PDF and complexity of the tickets. Make sure the local python backend is running.
          </p>
        </div>

        {/* Results Area */}
        {renderResults()}
        
      </main>
    </div>
  );
}
