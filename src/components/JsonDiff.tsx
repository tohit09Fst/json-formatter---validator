/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Columns, Play, Trash2, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { formatJson, parseAndValidate } from '../utils/jsonUtils';

interface DiffLine {
  type: 'equal' | 'added' | 'removed';
  text: string;
  num?: number;
}

export default function JsonDiff() {
  const [leftRaw, setLeftRaw] = useState<string>('');
  const [rightRaw, setRightRaw] = useState<string>('');
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);
  const [isCompared, setIsCompared] = useState(false);

  // Resulting formatted lines list
  const [leftLines, setLeftLines] = useState<DiffLine[]>([]);
  const [rightLines, setRightLines] = useState<DiffLine[]>([]);

  // Format inputs automatically
  const handleFormatInputs = () => {
    setLeftError(null);
    setRightError(null);

    let leftFormatted = '';
    let rightFormatted = '';

    if (leftRaw.trim()) {
      const { data, error } = parseAndValidate(leftRaw);
      if (error) {
        setLeftError(`Left JSON error: ${error.message} (Line ${error.line})`);
        return;
      }
      leftFormatted = formatJson(data, '2');
      setLeftRaw(leftFormatted);
    }

    if (rightRaw.trim()) {
      const { data, error } = parseAndValidate(rightRaw);
      if (error) {
        setRightError(`Right JSON error: ${error.message} (Line ${error.line})`);
        return;
      }
      rightFormatted = formatJson(data, '2');
      setRightRaw(rightFormatted);
    }
  };

  const handleCompare = () => {
    setLeftError(null);
    setRightError(null);

    const leftCheck = parseAndValidate(leftRaw.trim() || '{}');
    const rightCheck = parseAndValidate(rightRaw.trim() || '{}');

    if (leftCheck.error) {
      setLeftError(`Left error: ${leftCheck.error.message}`);
      return;
    }
    if (rightCheck.error) {
      setRightError(`Right error: ${rightCheck.error.message}`);
      return;
    }

    const docA = formatJson(leftCheck.data, '2').split('\n');
    const docB = formatJson(rightCheck.data, '2').split('\n');

    const { diffA, diffB } = computeDiff(docA, docB);
    setLeftLines(diffA);
    setRightLines(diffB);
    setIsCompared(true);
  };

  const handleClear = () => {
    setLeftRaw('');
    setRightRaw('');
    setLeftError(null);
    setRightError(null);
    setLeftLines([]);
    setRightLines([]);
    setIsCompared(false);
  };

  const loadSample = () => {
    const original = {
      name: "Acme Web Services",
      version: "2.1.0",
      status: "live",
      features: {
        oauth: true,
        logging: false,
        cacheLimitGb: 2.5
      },
      servers: ["SF-01", "NY-02"]
    };

    const modified = {
      name: "Acme Cloud Services", // edited
      version: "2.2.0-beta",       // edited
      status: "live",
      features: {
        oauth: true,
        logging: true,             // edited
        cacheLimitGb: 4.0          // edited
      },
      // servers: deleted NY-02, added LN-03
      servers: ["SF-01", "LN-03"]
    };

    setLeftRaw(JSON.stringify(original, null, 2));
    setRightRaw(JSON.stringify(modified, null, 2));
    setIsCompared(false);
  };

  /**
   * Simple and effective Longest Common Subsequence based Diff.
   */
  function computeDiff(linesA: string[], linesB: string[]) {
    const M = linesA.length;
    const N = linesB.length;
    const dp: number[][] = Array.from({ length: M + 1 }, () => Array(N + 1).fill(0));

    for (let i = 1; i <= M; i++) {
      for (let j = 1; j <= N; j++) {
        if (linesA[i - 1] === linesB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const diffA: DiffLine[] = [];
    const diffB: DiffLine[] = [];

    let i = M, j = N;
    let lineNumA = M;
    let lineNumB = N;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
        diffA.unshift({ type: 'equal', text: linesA[i - 1], num: lineNumA });
        diffB.unshift({ type: 'equal', text: linesB[j - 1], num: lineNumB });
        i--;
        j--;
        lineNumA--;
        lineNumB--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        // insertion on right side
        diffA.unshift({ type: 'equal', text: '', num: undefined });
        diffB.unshift({ type: 'added', text: linesB[j - 1], num: lineNumB });
        j--;
        lineNumB--;
      } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
        // deletion from left side
        diffA.unshift({ type: 'removed', text: linesA[i - 1], num: lineNumA });
        diffB.unshift({ type: 'equal', text: '', num: undefined });
        i--;
        lineNumA--;
      }
    }

    return { diffA, diffB };
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-sm">
      {/* Diff Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Side-by-Side JSON Comparator</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSample}
            className="text-xs px-3 py-1.5 font-semibold rounded text-slate-600 dark:text-slate-300 hover:bg-slate-150 dark:hover:bg-slate-805 transition"
          >
            📋 Load Test Samples
          </button>
          <button
            onClick={handleFormatInputs}
            className="text-xs px-3 py-1.5 font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded transition"
          >
            ✨ Auto-Format Inputs
          </button>
          <button
            onClick={handleCompare}
            className="text-xs px-3.5 py-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Compare
          </button>
          <button
            onClick={handleClear}
            className="text-xs px-2 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition"
            title="Clear All"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {leftError && (
        <div className="m-3 p-3 text-xs flex items-start gap-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded border border-red-100 dark:border-red-900/40">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{leftError}</span>
        </div>
      )}
      {rightError && (
        <div className="m-3 p-3 text-xs flex items-start gap-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/40">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{rightError}</span>
        </div>
      )}

      {/* Editor & Diff Stage */}
      <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 min-h-0 overflow-y-auto">
        
        {/* Source Left Pane */}
        <div className="flex-1 flex flex-col min-h-[250px] md:min-h-0">
          <div className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border-b border-rose-200/50 dark:border-rose-950/20 font-semibold text-rose-600 flex items-center justify-between">
            <span>Original Payload (Left)</span>
          </div>
          {!isCompared ? (
            <textarea
              value={leftRaw}
              onChange={(e) => setLeftRaw(e.target.value)}
              placeholder="Paste original JSON here..."
              className="flex-1 p-4 font-mono text-sm bg-slate-50/50 dark:bg-slate-900/30 text-slate-850 dark:text-slate-200 focus:outline-none resize-none placeholder-slate-400"
            />
          ) : (
            <div className="flex-1 font-mono text-xs overflow-y-auto bg-rose-50/10 dark:bg-slate-950/30 p-2 leading-relaxed">
              <table className="w-full border-collapse">
                <tbody>
                  {leftLines.map((line, idx) => (
                    <tr
                      key={idx}
                      className={
                        line.type === 'removed'
                          ? 'bg-red-150/40 dark:bg-red-950/30 text-red-900 dark:text-red-300'
                          : line.text === ''
                          ? 'bg-slate-100/50 dark:bg-slate-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/10 text-slate-700 dark:text-slate-300'
                      }
                    >
                      <td className="w-10 text-right pr-3 select-none text-slate-400 border-r border-slate-100 dark:border-slate-800 pl-1 text-[10px]">
                        {line.num}
                      </td>
                      <td className="w-5 font-bold select-none text-center pl-1">
                        {line.type === 'removed' ? '-' : ''}
                      </td>
                      <td className="pl-3 whitespace-pre break-all select-text align-top">
                        {line.text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Source Right Pane */}
        <div className="flex-1 flex flex-col min-h-[250px] md:min-h-0">
          <div className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border-b border-emerald-200/50 dark:border-emerald-950/20 font-semibold text-emerald-600 flex items-center justify-between">
            <span>Modified Payload (Right)</span>
          </div>
          {!isCompared ? (
            <textarea
              value={rightRaw}
              onChange={(e) => setRightRaw(e.target.value)}
              placeholder="Paste modified JSON here..."
              className="flex-1 p-4 font-mono text-sm bg-slate-50/50 dark:bg-slate-900/30 text-slate-850 dark:text-slate-200 focus:outline-none resize-none placeholder-slate-400"
            />
          ) : (
            <div className="flex-1 font-mono text-xs overflow-y-auto bg-emerald-50/10 dark:bg-slate-950/30 p-2 leading-relaxed">
              <table className="w-full border-collapse">
                <tbody>
                  {rightLines.map((line, idx) => (
                    <tr
                      key={idx}
                      className={
                        line.type === 'added'
                          ? 'bg-green-150/40 dark:bg-green-950/30 text-green-900 dark:text-green-300'
                          : line.text === ''
                          ? 'bg-slate-100/50 dark:bg-slate-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/10 text-slate-700 dark:text-slate-300'
                      }
                    >
                      <td className="w-10 text-right pr-3 select-none text-slate-400 border-r border-slate-100 dark:border-slate-800 pl-1 text-[10px]">
                        {line.num}
                      </td>
                      <td className="w-5 font-bold select-none text-center pl-1 text-emerald-650">
                        {line.type === 'added' ? '+' : ''}
                      </td>
                      <td className="pl-3 whitespace-pre break-all select-text align-top">
                        {line.text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isCompared && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>Comparing files recursively line by line</span>
          <button
            onClick={() => setIsCompared(false)}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Modify Payloads
          </button>
        </div>
      )}
    </div>
  );
}
