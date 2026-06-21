/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface JsonTreeProps {
  data: any;
  searchTerm?: string;
}

export default function JsonTree({ data, searchTerm = '' }: JsonTreeProps) {
  const [globalExpanded, setGlobalExpanded] = useState<boolean | null>(true);

  const handleExpandAll = () => setGlobalExpanded(true);
  const handleCollapseAll = () => setGlobalExpanded(false);

  return (
    <div className="font-mono text-sm leading-relaxed p-4 h-full overflow-y-auto select-text">
      {/* Universal controls */}
      <div className="flex items-center gap-2 mb-4 border-b pb-2 border-slate-200 dark:border-slate-800">
        <button
          onClick={handleExpandAll}
          className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition"
        >
          📂 Expand All
        </button>
        <button
          onClick={handleCollapseAll}
          className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition"
        >
          📁 Collapse All
        </button>
      </div>

      <div className="space-y-1">
        <TreeNode
          name="root"
          val={data}
          depth={0}
          globalExpanded={globalExpanded}
          setGlobalExpanded={setGlobalExpanded}
          searchTerm={searchTerm.toLowerCase()}
        />
      </div>
    </div>
  );
}

interface TreeNodeProps {
  name: string;
  val: any;
  depth: number;
  globalExpanded: boolean | null;
  setGlobalExpanded: (val: boolean | null) => void;
  searchTerm: string;
  isLast?: boolean;
  key?: string | number;
}

function TreeNode({
  name,
  val,
  depth,
  globalExpanded,
  setGlobalExpanded,
  searchTerm,
  isLast = true,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  // Sync to global expanded trigger
  useEffect(() => {
    if (globalExpanded !== null) {
      setIsExpanded(globalExpanded);
    }
  }, [globalExpanded]);

  const toggle = () => {
    setGlobalExpanded(null); // break binding to global
    setIsExpanded(!isExpanded);
  };

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isObject = val !== null && typeof val === 'object';
  const isArray = Array.isArray(val);

  // Search filter check for matching content or keys
  const renderedName = name !== 'root' ? name : '';
  const isMatch =
    searchTerm &&
    (String(renderedName).toLowerCase().includes(searchTerm) ||
      (!isObject && String(val).toLowerCase().includes(searchTerm)));

  const highlightClass = isMatch
    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold px-0.5 rounded'
    : '';

  // Element counters
  let childCount = 0;
  if (isObject) {
    childCount = isArray ? val.length : Object.keys(val).length;
  }

  // Bracket renders
  const bracketOpen = isArray ? '[' : '{';
  const bracketClose = isArray ? ']' : '}';

  // Indentation
  const indentStyle = { paddingLeft: `${depth * 16}px` };

  // Render for Leaf Nodes (primitive types)
  if (!isObject) {
    let valColor = 'text-sky-700 dark:text-sky-400'; // default for numbers, etc
    let valStr = String(val);

    if (val === null) {
      valColor = 'text-red-500 font-semibold';
      valStr = 'null';
    } else if (typeof val === 'string') {
      valColor = 'text-emerald-700 dark:text-emerald-400';
      valStr = `"${val}"`;
    } else if (typeof val === 'boolean') {
      valColor = 'text-purple-600 dark:text-purple-400 font-medium';
    }

    return (
      <div
        style={indentStyle}
        className="group flex items-center hover:bg-slate-50 dark:hover:bg-slate-900/40 py-0.5 rounded transition-colors"
      >
        <span className="w-4 h-4" /> {/* align spaced */}
        <div className="flex items-center flex-wrap gap-x-1.5">
          {name && name !== 'root' && (
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              "{name}":
            </span>
          )}
          <span className={`${valColor} ${highlightClass} break-all select-text`}>
            {valStr}
          </span>
          {!isLast && <span className="text-slate-400">,</span>}

          {/* Micro Action Button */}
          <button
            onClick={(e) => copyToClipboard(e, typeof val === 'string' ? val : valStr)}
            className="opacity-0 group-hover:opacity-100 ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title="Copy value"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // Render for Objects / Arrays
  const keys = isArray ? [] : Object.keys(val);

  return (
    <div className="select-none">
      <div
        style={indentStyle}
        onClick={toggle}
        className="group flex items-center hover:bg-slate-50 dark:hover:bg-slate-900/40 py-1 rounded cursor-pointer transition-colors"
      >
        <button className="text-slate-400 dark:text-slate-500 mr-0.5 focus:outline-none">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center flex-wrap gap-x-1.5 text-sm">
          {name && name !== 'root' && (
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              "{name}":
            </span>
          )}

          <span className="text-slate-400">{bracketOpen}</span>

          {!isExpanded && (
            <>
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                {childCount} {isArray ? 'items' : 'keys'}
              </span>
              <span className="text-slate-400">{bracketClose}</span>
            </>
          )}

          {isExpanded && (
            <span className="text-xs text-slate-400 font-light font-mono">
              // {childCount} {isArray ? 'items' : 'fields'}
            </span>
          )}

          {!isExpanded && !isLast && <span className="text-slate-400">,</span>}

          {/* Micro Action Button to Copy Whole subtree */}
          <button
            onClick={(e) => copyToClipboard(e, JSON.stringify(val, null, 2))}
            className="opacity-0 group-hover:opacity-100 ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title="Copy subtree"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-l border-slate-200 dark:border-slate-800 ml-[11px] pl-[10px] my-0.5">
          {isArray
            ? (val as any[]).map((v, i) => (
                <TreeNode
                  key={i}
                  name=""
                  val={v}
                  depth={0} // depth relative to border line indent
                  globalExpanded={globalExpanded}
                  setGlobalExpanded={setGlobalExpanded}
                  searchTerm={searchTerm}
                  isLast={i === val.length - 1}
                />
              ))
            : keys.map((k, i) => (
                <TreeNode
                  key={k}
                  name={k}
                  val={val[k]}
                  depth={0}
                  globalExpanded={globalExpanded}
                  setGlobalExpanded={setGlobalExpanded}
                  searchTerm={searchTerm}
                  isLast={i === keys.length - 1}
                />
              ))}
        </div>
      )}

      {isExpanded && (
        <div style={indentStyle} className="text-slate-400 py-0.5 pl-4">
          {bracketClose}
          {!isLast && <span>,</span>}
        </div>
      )}
    </div>
  );
}
