'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaUpload, FaSpinner, FaFilePdf, FaCheckCircle, FaExclamationTriangle, FaListAlt } from 'react-icons/fa';
import ThemeToggle from '@/components/theme-toggle';

export default function JiraPage() {
  const [file, setFile] = useState<File | null>(null);
  const [ticketPrefix, setTicketPrefix] = useState<string>("COMDEV.");
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
    formData.append('ticket_prefix', ticketPrefix);

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

  // Helper function to clean text from quotes and braces
  const cleanString = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).replace(/[{}[\]"]/g, '').trim();
  };

  // Helper to render a structured requirement item
  const renderRequirementDetail = (item: any) => {
    // If it's a string, try to parse it as JSON first (just in case)
    let data = item;
    if (typeof item === 'string' && (item.trim().startsWith('{') || item.trim().startsWith('['))) {
      try {
        data = JSON.parse(item);
      } catch (e) {
        // Not valid JSON, just clean the string
        return <div className="text-sm leading-relaxed">{cleanString(item)}</div>;
      }
    }

    if (typeof data !== 'object' || data === null) {
      return <div className="text-sm leading-relaxed">{cleanString(data)}</div>;
    }

    // Extract common fields
    const id = data.id || data.ID || data.code;
    const type = data.type || data.category;
    const priority = data.priority || data.level;
    const reqText = data.requirement || data.description || data.text || data.summary;
    const rationale = data.rationale || data.reasoning || data.why;

    // Remaining fields that aren't the primary ones
    const extraFields = Object.entries(data).filter(([k]) => 
      !['id', 'ID', 'code', 'type', 'category', 'priority', 'level', 'requirement', 'description', 'text', 'summary', 'rationale', 'reasoning', 'why'].includes(k)
    );

    return (
      <div className="flex flex-col gap-3 py-1">
        <div className="flex flex-wrap items-center gap-2">
          {id && (
            <span className="font-bold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2 py-0.5 rounded text-xs border border-[var(--accent-primary)]/20">
              {cleanString(id)}
            </span>
          )}
          {type && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
              {cleanString(type)}
            </span>
          )}
          {priority && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              String(priority).toLowerCase().includes('must') 
                ? 'bg-red-500/10 text-red-600 border-red-500/20' 
                : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
            }`}>
              {cleanString(priority)}
            </span>
          )}
        </div>

        {reqText && (
          <p className="text-[var(--foreground)] font-medium text-sm leading-relaxed">
            {cleanString(reqText)}
          </p>
        )}

        {rationale && (
          <div className="text-xs text-[var(--muted)] bg-[var(--background)]/50 p-3 rounded-lg border border-[var(--border-color)] mt-1">
            <span className="font-bold text-[var(--accent-primary)] mr-2">Rationale:</span>
            {cleanString(rationale)}
          </div>
        )}

        {extraFields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-1">
            {extraFields.map(([k, v]) => (
              <div key={k} className="text-[11px]">
                <span className="font-bold text-[var(--muted)] uppercase mr-1">{k.replace(/_/g, ' ')}:</span>
                <span className="text-[var(--foreground)]">{cleanString(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper to neatly render clusters
  const renderCluster = (cluster: any, index: number) => {
    const clusterData = cluster;
    const clusterName = cleanString(clusterData.functional_area || clusterData.cluster_name || clusterData.name || clusterData.title || `Requirement Group ${index + 1}`);
    const description = cleanString(clusterData.summary || clusterData.description || '');
    const items = clusterData.requirements || clusterData.items || clusterData.tickets || [];
    
    return (
      <div key={index} className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] shadow-sm mb-10 overflow-hidden transition-all hover:shadow-md">
        <div className="bg-[var(--accent-primary)]/5 px-8 py-6 border-b border-[var(--border-color)]">
          <div className="flex items-start gap-5">
            <div className="bg-[var(--accent-primary)]/10 p-3 rounded-xl mt-1">
              <FaListAlt className="text-[var(--accent-primary)] text-xl" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-[var(--foreground)] font-serif leading-tight mb-2">
                {clusterName}
              </h3>
              {description && (
                <p className="text-sm text-[var(--muted)] leading-relaxed italic">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-8">
          {Array.isArray(items) && items.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-color)] shadow-inner">
              <table className="w-full text-left border-collapse bg-[var(--background)]/20">
                <thead>
                  <tr className="bg-[var(--accent-primary)]/10">
                    <th className="px-6 py-4 text-xs font-bold text-[var(--accent-primary)] uppercase tracking-widest border-b border-[var(--border-color)] w-16">#</th>
                    <th className="px-6 py-4 text-xs font-bold text-[var(--accent-primary)] uppercase tracking-widest border-b border-[var(--border-color)]">Requirement Specification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[var(--accent-primary)]/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-[var(--muted)] align-top pt-6">{idx + 1}</td>
                      <td className="px-6 py-4 text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                        {renderRequirementDetail(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)] italic bg-[var(--background)]/50 p-6 rounded-lg border border-dashed border-[var(--border-color)]">
              No specific sub-requirements documented for this area.
            </p>
          )}
          
          {/* Render any additional fields at the top level of the cluster if they exist */}
          {Object.entries(clusterData).map(([key, value]) => {
            if (!['functional_area', 'cluster_name', 'name', 'title', 'description', 'summary', 'requirements', 'items', 'tickets'].includes(key)) {
              return (
                 <div key={key} className="mt-8 pt-6 border-t border-[var(--border-color)]/30">
                   <h4 className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-widest mb-3 opacity-70">{key.replace(/_/g, ' ')}</h4>
                   <div className="text-sm text-[var(--foreground)] leading-relaxed">
                     {cleanString(value)}
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

          {/* Configuration Options */}
          <div className="mt-8 flex flex-col items-start w-full max-w-sm mx-auto">
            <label htmlFor="ticketPrefix" className="text-sm font-semibold text-[var(--foreground)] mb-2">
              Ticket Prefix
            </label>
            <input
              id="ticketPrefix"
              type="text"
              value={ticketPrefix}
              onChange={(e) => setTicketPrefix(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors shadow-sm"
              placeholder="e.g., COMDEV. or CLO-REQ-"
            />
            <p className="text-xs text-[var(--muted)] mt-2 text-left w-full">
              The pipeline uses this prefix to locate tickets within the PDF text blocks. (e.g. "CLO-REQ-")
            </p>
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
