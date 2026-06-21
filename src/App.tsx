/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileJson,
  Code,
  Sliders,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Download,
  Search,
  BookOpen,
  History,
  Terminal,
  Upload,
  AlertTriangle,
  Info,
  Layers,
  ArrowRightLeft,
  X,
  FileDown
} from 'lucide-react';
import {
  PresetSample,
  ValidationError,
  HistoryItem,
  ViewMode,
  IndentStyle,
  ExportFormat
} from './types';
import {
  parseAndValidate,
  formatJson,
  filterJsonByQuery,
  jsonToXml,
  jsonToYaml,
  jsonToCsv,
  SAMPLE_DATASETS
} from './utils/jsonUtils';
import JsonTree from './components/JsonTree';
import JsonDiff from './components/JsonDiff';
import SidebarHistory from './components/SidebarHistory';

export default function App() {
  // Input Workspace states
  const [rawInput, setRawInput] = useState<string>('');
  const [valError, setValError] = useState<ValidationError | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isFixMode, setIsFixMode] = useState<boolean>(false);

  // Settings states
  const [indentStyle, setIndentStyle] = useState<IndentStyle>('2');
  const [sortAlphabetically, setSortAlphabetically] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('formatted');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('yaml');

  // Query path / Search Filter state
  const [queryPath, setQueryPath] = useState<string>('');
  const [filteredData, setFilteredData] = useState<any>(null);
  const [treeSearch, setTreeSearch] = useState<string>('');

  // UI state managers
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [stats, setStats] = useState({
    size: 0,
    lines: 0,
    chars: 0,
    keysCount: 0,
  });

  // History states (Durable LocalStorage)
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Load & Load from localstorage
  useEffect(() => {
    // Default load sample dataset
    const defaultData = SAMPLE_DATASETS[0].data;
    setRawInput(defaultData);
    handleProcess(defaultData, indentStyle, sortAlphabetically, queryPath);

    // Dark mode default check
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }

    try {
      const savedLogs = localStorage.getItem('json_formatter_logs');
      if (savedLogs) {
        setHistory(JSON.parse(savedLogs));
      }
    } catch (_) {}
  }, []);

  // Update DOM body background for beautiful dark mode transitions
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Process Formatting and Validation Pipeline
  const handleProcess = (
    inputText: string,
    indent: IndentStyle,
    sortKeys: boolean,
    query: string
  ) => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setParsedData(null);
      setFilteredData(null);
      setValError(null);
      setStats({ size: 0, lines: 0, chars: 0, keysCount: 0 });
      return;
    }

    // Step 1: Parse and Validate
    const { data, error } = parseAndValidate(inputText);
    setValError(error);

    if (error) {
      setParsedData(null);
      setFilteredData(null);
      // Calculate basic statistics of raw input anyway
      setStats({
        size: new Blob([inputText]).size,
        lines: inputText.split('\n').length,
        chars: inputText.length,
        keysCount: 0,
      });
      return;
    }

    // Step 2: Store parsed state
    setParsedData(data);

    // Step 3: Run filter query if present
    const cleanQuery = query.trim();
    const workingData = cleanQuery ? filterJsonByQuery(data, cleanQuery) : data;
    setFilteredData(workingData);

    // Step 4: Extract structural metrics
    let nestedKeysCount = 0;
    const countKeys = (obj: any) => {
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach((k) => {
          nestedKeysCount++;
          countKeys(obj[k]);
        });
      }
    };
    countKeys(data);

    setStats({
      size: new Blob([inputText]).size,
      lines: inputText.split('\n').length,
      chars: inputText.length,
      keysCount: nestedKeysCount,
    });
  };

  // Re-run configuration options trigger
  useEffect(() => {
    handleProcess(rawInput, indentStyle, sortAlphabetically, queryPath);
  }, [rawInput, indentStyle, sortAlphabetically, queryPath]);

  // Trigger Save to logs history
  const logFormattedWorkspace = (textToLog: string) => {
    if (!textToLog.trim() || valError) return;

    try {
      const { data } = parseAndValidate(textToLog);
      if (!data) return;

      const titleExcerpt =
        typeof data === 'object' && !Array.isArray(data)
          ? `Object { ${Object.keys(data).slice(0, 3).join(', ')} }`
          : Array.isArray(data)
          ? `Array [ ${data.length} items ]`
          : 'JSON Snippet';

      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        title: titleExcerpt,
        size: new Blob([textToLog]).size,
        content: textToLog,
      };

      const updatedHistory = [newItem, ...history.filter((h) => h.content !== textToLog)].slice(0, 30);
      setHistory(updatedHistory);
      localStorage.setItem('json_formatter_logs', JSON.stringify(updatedHistory));
    } catch (_) {}
  };

  // Run formatting beautifier and minify action triggers
  const triggerFormat = () => {
    if (!parsedData) return;
    const formattingStyle = indentStyle === 'minify' ? '2' : indentStyle; // fallback to 2 if formatted on minify mode
    const output = formatJson(parsedData, formattingStyle, sortAlphabetically);
    setRawInput(output);
    logFormattedWorkspace(output);
  };

  const triggerMinify = () => {
    if (!parsedData) return;
    const output = formatJson(parsedData, 'minify', sortAlphabetically);
    setRawInput(output);
    logFormattedWorkspace(output);
  };

  // Auto Repair common syntax errors
  const triggerAutoRepair = () => {
    let cleaned = rawInput.trim();
    if (!cleaned) return;

    // Consecutively fix single quotes to double quotes
    cleaned = cleaned.replace(/'([^']*)'/g, '"$1"');

    // Add double quotes to unquoted object keys
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_\-]+)\s*:/g, '$1"$2":');

    // Remove trailing commas inside brackets or arrays
    cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

    setRawInput(cleaned);
    setIsFixMode(true);
    setTimeout(() => setIsFixMode(false), 1000);
  };

  // Paste Preset Samples
  const handleLoadSample = (sampleData: string) => {
    setRawInput(sampleData);
    setQueryPath('');
  };

  // Clipboard Handler
  const clickCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  // Disk downloader
  const clickDownloadFile = (content: string, prefix = 'formatted-json', ext = 'json') => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prefix}-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Drag and Drop File Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawInput(text);
      setQueryPath('');
    };
    reader.readAsText(file);
  };

  // Highlight Formatted Outputs Line by Line
  const renderHighlightedLine = (line: string, index: number) => {
    const keyValRegex = /^(\s*)"([^"]+)"\s*:\s*(.*)$/;
    const match = line.match(keyValRegex);

    if (match) {
      const indentSpaces = match[1];
      const keyName = match[2];
      const restValue = match[3];

      let valueNode: React.ReactNode = restValue;

      // Color coding value syntax
      if (restValue.startsWith('"')) {
        const hasCommaValue = restValue.endsWith(',');
        const strVal = hasCommaValue ? restValue.slice(0, -1) : restValue;
        valueNode = (
          <>
            <span className="text-emerald-600 dark:text-emerald-400 select-text">{strVal}</span>
            {hasCommaValue && <span className="text-slate-400">,</span>}
          </>
        );
      } else if (restValue.startsWith('true') || restValue.startsWith('false')) {
        const hasCommaValue = restValue.endsWith(',');
        const boolVal = hasCommaValue ? restValue.slice(0, -1) : restValue;
        valueNode = (
          <>
            <span className="text-purple-600 dark:text-purple-400 font-semibold select-text">{boolVal}</span>
            {hasCommaValue && <span className="text-slate-400">,</span>}
          </>
        );
      } else if (restValue.startsWith('null')) {
        const hasCommaValue = restValue.endsWith(',');
        const nullVal = hasCommaValue ? restValue.slice(0, -1) : restValue;
        valueNode = (
          <>
            <span className="text-rose-500 font-semibold select-text">{nullVal}</span>
            {hasCommaValue && <span className="text-slate-400">,</span>}
          </>
        );
      } else if (/^\d/.test(restValue) || restValue.startsWith('-')) {
        const hasCommaValue = restValue.endsWith(',');
        const numVal = hasCommaValue ? restValue.slice(0, -1) : restValue;
        valueNode = (
          <>
            <span className="text-amber-600 dark:text-amber-500 select-text">{numVal}</span>
            {hasCommaValue && <span className="text-slate-400">,</span>}
          </>
        );
      }

      return (
        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 line-height-normal">
          <td className="w-10 text-right pr-3 select-none text-slate-400 border-r border-slate-100 dark:border-slate-800 pl-1 text-[10px] font-mono shrink-0 align-top">
            {index + 1}
          </td>
          <td className="pl-3 font-mono text-xs whitespace-pre select-text text-left align-top">
            {indentSpaces}
            <span className="text-indigo-600 dark:text-indigo-400 font-medium font-mono select-text">"{keyName}"</span>
            <span className="text-slate-400 font-mono">: </span>
            {valueNode}
          </td>
        </tr>
      );
    }

    return (
      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 line-height-normal">
        <td className="w-10 text-right pr-3 select-none text-slate-400 border-r border-slate-100 dark:border-slate-800 pl-1 text-[10px] font-mono shrink-0 align-top">
          {index + 1}
        </td>
        <td className="pl-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-pre text-left align-top">
          {line}
        </td>
      </tr>
    );
  };

  const getExportData = (): string => {
    if (!parsedData) return '';
    try {
      const target = filteredData || parsedData;
      if (exportFormat === 'yaml') {
        return jsonToYaml(target);
      } else if (exportFormat === 'xml') {
        return jsonToXml(target);
      } else if (exportFormat === 'csv') {
        return jsonToCsv(target, ',');
      } else if (exportFormat === 'tsv') {
        return jsonToCsv(target, '\t');
      }
    } catch (e: any) {
      return `Conversion Error: ${e.message}`;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-slate-950 font-sans flex flex-col selection:bg-blue-100 transition-colors duration-300">
      
      {/* Trial Task Verification Banner */}
      <div className="bg-slate-900 text-slate-100 px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-950 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="font-semibold tracking-wide uppercase text-[10px] text-slate-405">Made by :</span>
          <span className="font-bold text-white border-l border-slate-700 pl-2">Tohit Khan</span>
          <a href="mailto:tohitk121@gmail.com" className="text-blue-400 hover:underline hover:text-blue-300 ml-1">tohitk121@gmail.com</a>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 hidden md:inline">Custom Software Developer Trial Task</span>
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-tight rounded text-[11px] shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
          >
            Built for Digital Heroes
          </a>
        </div>
      </div>
      
      {/* Dynamic Session Log Top Bar */}
      <header className="border-b border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-30 px-4 py-3 shrink-0">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded flex items-center justify-center text-white shadow-sm z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-gray-800 dark:text-gray-100">
                  JSON Processor
                </h1>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-450 border border-gray-200 dark:border-slate-705 font-mono rounded-full px-2 py-0.5">
                  Pro Engine
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold leading-tight hidden sm:block">
                Professional Validator & Formatter
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 border-r pr-3 border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800 px-2 py-1 rounded">
                <Terminal className="w-3" /> UTC: 2026-06-20 17:34
              </span>
            </div>

            {/* Quick Sample Selector */}
            <div className="relative">
              <select
                onChange={(e) => handleLoadSample(e.target.value)}
                defaultValue=""
                className="text-xs font-semibold pl-8 pr-12 py-2 border bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-720 rounded-lg cursor-pointer hover:bg-slate-50 transition appearance-none"
              >
                <option value="" disabled>📂 Load Preset Samples...</option>
                {SAMPLE_DATASETS.map((s, idx) => (
                  <option key={idx} value={s.data}>
                    {s.name}
                  </option>
                ))}
              </select>
              <BookOpen className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <div className="absolute right-3 top-3 text-slate-400 text-[10px] pointer-events-none">▼</div>
            </div>

            {/* Toggle History Side Drawer */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`p-2 rounded border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition ${
                isHistoryOpen
                  ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-720'
              }`}
              title="Toggle formatting history drawer"
            >
              <History className="w-4 h-4" />
              <span className="hidden lg:inline">{isHistoryOpen ? 'Hide History' : 'Show Logs'}</span>
            </button>

            {/* Change Theme */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded border bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-720 hover:bg-slate-50 transition cursor-pointer"
              title="Toggle color theme"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

        </div>
      </header>

      {/* Main Structural Space */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 flex gap-4 min-h-0 overflow-hidden">
        
        {/* Central Grid container */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: Input Textarea Workspace */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm transition overflow-hidden">
            
            {/* Input Header & Upload Handles */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Code className="w-4.5 h-4.5 text-blue-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">JSON Data Workspace</span>
              </div>

              <div className="flex items-center gap-2">
                {/* File Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:text-slate-700 rounded inline-flex items-center gap-1.5 transition cursor-pointer"
                  title="Upload from computer file"
                >
                  <Upload className="w-3.5 h-3.5" /> Import File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.text,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Repair trigger */}
                <button
                  onClick={triggerAutoRepair}
                  className="text-xs font-semibold px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-105 hover:text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50 rounded inline-flex items-center gap-1.5 transition cursor-pointer"
                  title="Auto repair unquoted keys, single quotes or trailing commas"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isFixMode ? 'animate-spin' : ''}`} /> Auto-Fix Syntax
                </button>

                {/* Reset Trigger */}
                <button
                  onClick={() => {
                    setRawInput('');
                    setQueryPath('');
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-red-500 py-1 transition"
                  title="Clear all text"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Input Panel with Drag State drop zones */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex-1 flex flex-col relative focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-950/40 min-h-0 ${
                isDragging ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
              }`}
            >
              {isDragging && (
                <div className="absolute inset-0 bg-blue-600/10 dark:bg-blue-950/40 border-2 border-dashed border-blue-400 flex flex-col items-center justify-center pointer-events-none z-10 transition">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded shadow-lg flex flex-col items-center gap-2">
                    <FileDown className="w-10 h-10 text-blue-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Drop JSON file here!</span>
                    <span className="text-xs text-slate-400">Instantly import and validate</span>
                  </div>
                </div>
              )}

              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={`Paste raw JSON data here, or drag and drop files directly into this area...\n\nExample object structure:\n{\n  "status": "online",\n  "count": 5\n}`}
                className="flex-1 w-full h-full p-4 font-mono text-xs bg-slate-50/20 dark:bg-slate-900/20 text-slate-800 dark:text-slate-200 select-text resize-none focus:outline-none placeholder-slate-400 leading-relaxed border-none"
              />
            </div>

            {/* Error Validation Logs */}
            {valError ? (
              <div className="shrink-0 p-4 border-t border-red-150 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/20 transition duration-200">
                <div className="flex gap-2 text-red-700 dark:text-red-400 text-xs font-semibold mb-2 items-center">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>Validation Failed: Synatically Invalid ({valError.message.substring(0, 60)})</span>
                </div>
                {valError.line !== undefined && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-mono">
                    Coordinate: <span className="font-semibold text-rose-600">Line {valError.line}</span>, Character <span className="font-semibold text-rose-600">{valError.column}</span>
                  </div>
                )}
                {valError.snippet && (
                  <pre className="text-[10px] leading-tight font-mono p-3 bg-red-100/50 dark:bg-red-950/45 text-slate-855 dark:text-slate-250 border border-red-100 dark:border-red-900/40 rounded-lg overflow-x-auto whitespace-pre">
                    {valError.snippet}
                  </pre>
                )}
              </div>
            ) : rawInput.trim() ? (
              <div className="shrink-0 p-3.5 border-t border-emerald-150 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/10 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-400 transition">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-505 animate-ping" />
                  <span>Prisine Validation Match: Syntactically Perfect JSON Structure</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">Depth: Verified</span>
              </div>
            ) : null}

          </div>

          {/* CENTRAL FUNCTION TRIGGERS PANE */}
          <div className="shrink-0 lg:w-14 flex lg:flex-col justify-center items-center gap-3 py-2 bg-slate-100 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 self-center w-full lg:h-fit shadow-xs">
            
            <button
              onClick={triggerFormat}
              disabled={!parsedData}
              className={`p-3 rounded flex items-center justify-center font-semibold transition cursor-pointer text-xs ${
                parsedData
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
              title="Indent and format JSON with indentation spaces"
            >
              <Code className="w-5.5 h-5.5" />
            </button>

            <button
              onClick={triggerMinify}
              disabled={!parsedData}
              className={`p-3 rounded flex items-center justify-center font-semibold transition cursor-pointer ${
                parsedData
                  ? 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
              title="Compress/Minify JSON to single line string"
            >
              <Layers className="w-5.5 h-5.5" />
            </button>

            <button
              onClick={() => {
                const output = formatJson(parsedData, indentStyle, !sortAlphabetically);
                setSortAlphabetically(!sortAlphabetically);
                logFormattedWorkspace(output);
              }}
              disabled={!parsedData}
              className={`p-3 rounded flex items-center justify-center transition border cursor-pointer ${
                parsedData
                  ? sortAlphabetically
                    ? 'bg-amber-50 text-amber-605 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40'
                    : 'bg-white dark:bg-slate-850 hover:bg-slate-50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-720'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-transparent cursor-not-allowed'
              }`}
              title="Toggle sorting attributes and keys alphabetically"
            >
              <Sliders className="w-5.5 h-5.5" />
            </button>

            <button
              onClick={() => handleProcess(rawInput, indentStyle, sortAlphabetically, queryPath)}
              className="p-3 rounded bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-720 transition cursor-pointer"
              title="Force full validate parse reload"
            >
              <RefreshCw className="w-5.5 h-5.5" />
            </button>
          </div>

          {/* RIGHT COLUMN: Output Preview & Visual Tools */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm transition overflow-hidden">
            
            {/* View Mode Switching Drawer Header */}
            <div className="px-4 py-1 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              
              {/* Tab options switcher */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('formatted')}
                  className={`text-xs px-3 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
                    viewMode === 'formatted'
                      ? 'text-blue-600 border-blue-600 dark:text-white dark:border-white'
                      : 'text-slate-500 hover:text-slate-850 border-transparent dark:text-slate-400'
                  }`}
                >
                  ✨ Code Highlight
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className={`text-xs px-3 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
                    viewMode === 'tree'
                      ? 'text-blue-600 border-blue-600 dark:text-white dark:border-white'
                      : 'text-slate-500 hover:text-slate-850 border-transparent dark:text-slate-400'
                  }`}
                >
                  🌳 Interactive Tree
                </button>
                <button
                  onClick={() => setViewMode('diff')}
                  className={`text-xs px-3 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
                    viewMode === 'diff'
                      ? 'text-blue-600 border-blue-600 dark:text-white dark:border-white'
                      : 'text-slate-500 hover:text-slate-850 border-transparent dark:text-slate-400'
                  }`}
                >
                  ⚖️ Side Diff
                </button>
                <button
                  onClick={() => setViewMode('convert')}
                  className={`text-xs px-3 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
                    viewMode === 'convert'
                      ? 'text-blue-600 border-blue-600 dark:text-white dark:border-white'
                      : 'text-slate-500 hover:text-slate-850 border-transparent dark:text-slate-400'
                  }`}
                >
                  🔄 Converters / Export
                </button>
              </div>

              {/* Utility indent config triggers */}
              {viewMode !== 'diff' && viewMode !== 'convert' && (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">Indent:</span>
                  <select
                    value={indentStyle}
                    onChange={(e) => setIndentStyle(e.target.value as IndentStyle)}
                    className="text-[11px] font-mono border-slate-200 bg-white dark:bg-slate-800 text-slate-750 dark:text-slate-200 border rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="2">2 spaces</option>
                    <option value="4">4 spaces</option>
                    <option value="tabs">Tab style</option>
                  </select>
                </div>
              )}
            </div>

            {/* Secondary Toolbar: Search or Querying */}
            {viewMode === 'formatted' && parsedData && (
              <div className="px-4 py-2 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Query Selector (e.g. $.store.inventory[0].title or items[*].id)"
                    value={queryPath}
                    onChange={(e) => setQueryPath(e.target.value)}
                    className="w-full text-xs font-mono bg-white dark:bg-slate-850 pl-8 pr-12 py-1.5 border border-slate-200 dark:border-slate-720 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-450" />
                  {queryPath && (
                    <button
                      onClick={() => setQueryPath('')}
                      className="absolute right-3 top-2 text-slate-450 hover:text-slate-600 text-xs shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {queryPath && (
                  <span className="text-[10px] shrink-0 font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded dark:bg-blue-950/20 dark:text-blue-400">
                    {filteredData === undefined ? '0 matches' : 'Matched result'}
                  </span>
                )}
              </div>
            )}

            {/* Secondary Toolbar: Tree Search */}
            {viewMode === 'tree' && parsedData && (
              <div className="px-4 py-2 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Filter keys or match item values in tree views..."
                    value={treeSearch}
                    onChange={(e) => setTreeSearch(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-850 pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-720 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-450" />
                  {treeSearch && (
                    <button
                      onClick={() => setTreeSearch('')}
                      className="absolute right-3 top-2 text-slate-450 hover:text-slate-600 text-xs shrink-0"
                      title="Clear filter keywords"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Main Stage Displays depending on current active ViewMode */}
            <div className="flex-1 min-h-0 relative overflow-hidden bg-slate-50/10 dark:bg-slate-900/20">
              
              {/* Output Loading & Empty States */}
              {!rawInput.trim() ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500">
                  <FileJson className="w-12 h-12 mb-3 stroke-1 text-slate-300 dark:text-slate-700" />
                  <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-400 mb-1">Formatted Results Sandbox</h3>
                  <p className="text-xs max-w-xs mb-4">
                    Paste raw text in workspace or choose a preset dataset template to begin formatting.
                  </p>
                  <button
                    onClick={() => handleLoadSample(SAMPLE_DATASETS[0].data)}
                    className="text-xs px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                  >
                    🚀 Populate Sample Data
                  </button>
                </div>
              ) : valError && viewMode !== 'diff' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-450 dark:text-slate-500">
                  <AlertTriangle className="w-10 h-10 mb-3 text-amber-500" />
                  <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-400 mb-1">Invalid JSON Input Detected</h3>
                  <p className="text-xs max-w-xs">
                    Please correct the syntax errors highlighted in the workspace column to view the formatted trees or objects.
                  </p>
                </div>
              ) : (
                <>
                  {/* View: Standard Formatted / Key-highlight Code */}
                  {viewMode === 'formatted' && (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
                        <table className="w-full border-collapse select-text">
                          <tbody>
                            {formatJson(
                              filteredData !== undefined ? filteredData : parsedData,
                              indentStyle,
                              sortAlphabetically
                            )
                              .split('\n')
                              .map((line, idx) => renderHighlightedLine(line, idx))}
                          </tbody>
                        </table>
                      </div>

                      {/* Instant Command Utilities Footer */}
                      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Info className="w-3.5 h-3.5" />
                          <span>Double click lines to select key values</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              clickCopyToClipboard(
                                formatJson(
                                  filteredData !== undefined ? filteredData : parsedData,
                                  indentStyle,
                                  sortAlphabetically
                                )
                              )
                            }
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer transition"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy Code
                              </>
                            )}
                          </button>
                          <button
                            onClick={() =>
                              clickDownloadFile(
                                formatJson(
                                  filteredData !== undefined ? filteredData : parsedData,
                                  indentStyle,
                                  sortAlphabetically
                                ),
                                'beautified-json',
                                'json'
                              )
                            }
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* View: Tree Structured Renderer */}
                  {viewMode === 'tree' && (
                    <JsonTree
                      data={filteredData !== undefined ? filteredData : parsedData}
                      searchTerm={treeSearch}
                    />
                  )}

                  {/* View: Comparator Diff Component */}
                  {viewMode === 'diff' && <JsonDiff />}

                  {/* View: Convert and Exporter utility panel */}
                  {viewMode === 'convert' && (
                    <div className="h-full flex flex-col">
                      <div className="shrink-0 p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Export Format</span>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-800 p-0.5 rounded">
                          {(['yaml', 'xml', 'csv', 'tsv'] as ExportFormat[]).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => setExportFormat(fmt)}
                              className={`text-[10px] px-2.5 py-1 font-bold rounded transition cursor-pointer capitalize ${
                                exportFormat === fmt
                                  ? 'bg-white text-slate-900 dark:bg-slate-700 dark:text-white'
                                  : 'text-slate-550 hover:text-slate-850'
                              }`}
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Display convert panel */}
                      <div className="flex-1 overflow-auto p-4 font-mono text-xs text-left bg-slate-900 dark:bg-slate-950 text-slate-200 select-text leading-relaxed">
                        <pre className="whitespace-pre select-text font-mono">
                          {getExportData() || '// Empty parse payload'}
                        </pre>
                      </div>

                      {/* Copy Download block */}
                      <div className="p-3 bg-white dark:bg-slate-905 border-t border-slate-200 dark:border-slate-850 flex justify-end gap-2 shrink-0">
                        <button
                          onClick={() => clickCopyToClipboard(getExportData())}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer transition"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Code
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => clickDownloadFile(getExportData(), 'converted-export', exportFormat)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-1.5 font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" /> Download File
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Metrics Statistics Pane */}
            {rawInput.trim() && (
              <div className="shrink-0 px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>
                    Size: <strong className="text-slate-705 dark:text-slate-350">{stats.size} B</strong>
                  </span>
                  <span>
                    Lines: <strong className="text-slate-705 dark:text-slate-350">{stats.lines}</strong>
                  </span>
                  <span>
                    Characters: <strong className="text-slate-705 dark:text-slate-350">{stats.chars}</strong>
                  </span>
                  {parsedData && (
                    <span>
                      Object Keys: <strong className="text-blue-600 dark:text-blue-400">{stats.keysCount}</strong>
                    </span>
                  )}
                </div>
                <span>Format Status: Good</span>
              </div>
            )}

          </div>

        </div>

        {/* RIGHT DRAWER: Saved Formatting Logs History Section */}
        {isHistoryOpen && (
          <aside className="w-80 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded hidden lg:flex flex-col h-full shadow-sm">
            <SidebarHistory
              history={history}
              onSelect={(item) => {
                setRawInput(item.content);
                setQueryPath('');
              }}
              onClearAll={() => {
                setHistory([]);
                localStorage.removeItem('json_formatter_logs');
              }}
              onDeleteItem={(id) => {
                const refreshed = history.filter((h) => h.id !== id);
                setHistory(refreshed);
                localStorage.setItem('json_formatter_logs', JSON.stringify(refreshed));
              }}
            />
          </aside>
        )}

      </main>

    </div>
  );
}
