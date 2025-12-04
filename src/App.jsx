import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
  Upload, Download, Undo, Redo, Plus, History, 
  Grid, CreditCard, Search, Trash2, X 
} from 'lucide-react';
import SuggestionInput from './components/SuggestionInput';
import Toast from './components/Toast';
import JapaneseOrnament from './components/JapaneseOrnament';

function App() {
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [formulas, setFormulas] = useState({}); // Store formulas separately
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardView, setIsCardView] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [currentFileName, setCurrentFileName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null); // {row, col}
  const [formulaBarValue, setFormulaBarValue] = useState('');

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Auto-save
  useEffect(() => {
    if (autoSaveEnabled && data.length > 0 && currentFileName) {
      const timer = setTimeout(() => saveToStorage(), 1000);
      return () => clearTimeout(timer);
    }
  }, [data, autoSaveEnabled, currentFileName]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToStorage();
        showToast('Saved successfully');
      } else if (isCardView && !e.target.matches('input, textarea, select')) {
        if (e.key === 'ArrowLeft' && currentCardIndex > 0) {
          e.preventDefault();
          navigateCard(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateCard(1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, isCardView, currentCardIndex]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCurrentFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer);
      setWorkbook(wb);
      const sheetNames = wb.SheetNames;
      setSheets(sheetNames);

      if (sheetNames.length > 0) {
        loadSheet(wb, 0, sheetNames);
        saveFileHistory(file.name, sheetNames);
        showToast('File uploaded successfully');
      }
    } catch (error) {
      showToast('Error loading file', 'error');
    }
  };

  const loadSheet = (wb, index, sheetNames) => {
    const ws = wb.Sheets[sheetNames[index]];
    const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (jsonData.length > 0) {
      const cols = Object.keys(jsonData[0]);
      setHeaders(cols);
      setData(jsonData);
      setActiveSheet(index);
      setHistory([JSON.parse(JSON.stringify(jsonData))]);
      setHistoryIndex(0);
      setFilters({});
      setSearchTerm('');
      setCurrentCardIndex(0);
    }
  };

  const saveFileHistory = (fileName, sheetNames) => {
    const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
    const fileEntry = {
      fileName,
      timestamp: new Date().toISOString(),
      sheets: sheetNames.length,
      rows: data.length,
      state: {
        sheets: sheetNames,
        activeSheet,
        data,
        headers,
        filters,
        searchTerm,
        currentCardIndex,
        isCardView
      }
    };

    const existingIndex = fileHistory.findIndex(f => f.fileName === fileName);
    if (existingIndex >= 0) fileHistory.splice(existingIndex, 1);
    fileHistory.unshift(fileEntry);
    localStorage.setItem('excelFileHistory', JSON.stringify(fileHistory.slice(0, 10)));
  };

  const loadFromStorage = () => {
    try {
      const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
      if (fileHistory.length > 0) {
        const lastFile = fileHistory[0];
        loadFileFromHistory(lastFile.state, lastFile.fileName);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const saveToStorage = () => {
    if (currentFileName && data.length > 0) {
      saveFileHistory(currentFileName, sheets);
    }
  };

  const loadFileFromHistory = (state, fileName) => {
    setCurrentFileName(fileName);
    setSheets(state.sheets || []);
    setActiveSheet(state.activeSheet || 0);
    setData(state.data || []);
    setHeaders(state.headers || []);
    setFilters(state.filters || {});
    setSearchTerm(state.searchTerm || '');
    setCurrentCardIndex(state.currentCardIndex || 0);
    setIsCardView(state.isCardView || false);
    setHistory([JSON.parse(JSON.stringify(state.data || []))]);
    setHistoryIndex(0);
    setShowHistory(false);
    showToast(`Loaded: ${fileName}`);
  };

  const handleDownload = () => {
    if (data.length === 0) return;

    const wb = XLSX.utils.book_new();
    sheets.forEach((sheetName, idx) => {
      const wsData = idx === activeSheet ? data : [];
      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const fileName = currentFileName
      ? currentFileName.replace('.xlsx', `_edited_${Date.now()}.xlsx`)
      : `edited_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast('File downloaded');
  };

  const updateCell = (rowIndex, header, value) => {
    if (rowIndex < 0 || rowIndex >= data.length) return;

    const newData = [...data];
    
    // Check if this is the Input column and contains dash-separated values
    const isInputColumn = header.toLowerCase().includes('input') || 
                          header === headers[0] || 
                          header.toLowerCase().includes('ll-ch-sl');
    
    if (isInputColumn && value && String(value).includes('-')) {
      // First, set the input value (preserve it)
      newData[rowIndex][header] = value;
      
      // Then apply auto-fill to other columns
      applyAutoFillFormulas(newData, rowIndex, value);
    } else {
      // Normal cell update
      newData[rowIndex][header] = value;
    }
    
    setData(newData);
    addToHistory(newData);
  };

  const applyAutoFillFormulas = (dataArray, rowIndex, inputValue) => {
    // Parse input format like "44-89-77", "7-8-9", "98-56-22"
    const parts = String(inputValue).split('-').map(p => p.trim());
    
    if (parts.length >= 3) {
      const [ll, chest, sleeve] = parts;
      
      // Find the input column first
      const inputCol = headers.find(h => 
        h.toLowerCase().includes('input') || 
        h.toLowerCase().includes('ll-ch-sl')
      );
      
      // Find LL column - must be exactly "LL" or close match, but NOT the input column
      const llCol = headers.find(h => {
        const lower = h.toLowerCase().trim();
        return (lower === 'll' || h.trim() === 'LL') && h !== inputCol;
      });
      
      // Find Chest column - must include "chest" but NOT be input column
      const chestCol = headers.find(h => {
        const lower = h.toLowerCase();
        return lower.includes('chest') && h !== inputCol;
      });
      
      // Find Sleeve column - must include "sleeve" but NOT be input column  
      const sleeveCol = headers.find(h => {
        const lower = h.toLowerCase();
        return lower.includes('sleeve') && h !== inputCol;
      });
      
      // Find Output column - must include "output" or "final" but NOT be input column
      const outputCol = headers.find(h => {
        const lower = h.toLowerCase();
        return (lower.includes('output') || lower.includes('final')) && h !== inputCol;
      });
      
      // Debug logging (will be removed in production)
      console.log('Auto-fill detected:', {
        inputValue,
        parts: [ll, chest, sleeve],
        columns: {
          input: inputCol,
          ll: llCol,
          chest: chestCol,
          sleeve: sleeveCol,
          output: outputCol
        }
      });
      
      // Auto-fill the columns with proper zero-padding (2 digits minimum)
      if (llCol) {
        dataArray[rowIndex][llCol] = ll.padStart(2, '0');
        console.log(`Set ${llCol} = ${ll.padStart(2, '0')}`);
      } else {
        console.warn('LL column not found!');
      }
      
      if (chestCol) {
        dataArray[rowIndex][chestCol] = chest.padStart(2, '0');
        console.log(`Set ${chestCol} = ${chest.padStart(2, '0')}`);
      } else {
        console.warn('Chest column not found!');
      }
      
      if (sleeveCol) {
        dataArray[rowIndex][sleeveCol] = sleeve.padStart(2, '0');
        console.log(`Set ${sleeveCol} = ${sleeve.padStart(2, '0')}`);
      } else {
        console.warn('Sleeve column not found!');
      }
      
      // Generate final output format: LLxCHxSL (e.g., 44x89x77)
      if (outputCol) {
        const formattedLL = ll.padStart(2, '0');
        const formattedChest = chest.padStart(2, '0');
        const formattedSleeve = sleeve.padStart(2, '0');
        dataArray[rowIndex][outputCol] = `${formattedLL}x${formattedChest}x${formattedSleeve}`;
        console.log(`Set ${outputCol} = ${formattedLL}x${formattedChest}x${formattedSleeve}`);
      } else {
        console.warn('Output column not found!');
      }
      
      showToast('Auto-filled from input!');
    } else {
      console.warn('Invalid input format. Expected: XX-XX-XX, got:', inputValue);
    }
  };

  const evaluateFormula = (formula, rowIndex) => {
    try {
      // Support Excel-style formulas like =B2+C2, =SUM(B2:D2), etc.
      if (!formula.startsWith('=')) return formula;
      
      let expr = formula.substring(1);
      
      // Replace cell references with actual values
      // Support formats: B2, C3, etc.
      expr = expr.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
        const colIndex = col.charCodeAt(0) - 65; // A=0, B=1, etc.
        const rowIdx = parseInt(row) - 2; // -2 because row 1 is header, array is 0-indexed
        
        if (rowIdx >= 0 && rowIdx < data.length && colIndex < headers.length) {
          const value = data[rowIdx][headers[colIndex]];
          return isNaN(value) ? `"${value}"` : value;
        }
        return '0';
      });
      
      // Handle SUM function: SUM(B2:D2)
      expr = expr.replace(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/gi, (match, startCol, startRow, endCol, endRow) => {
        const startColIdx = startCol.charCodeAt(0) - 65;
        const endColIdx = endCol.charCodeAt(0) - 65;
        const rowIdx = parseInt(startRow) - 2;
        
        let sum = 0;
        if (rowIdx >= 0 && rowIdx < data.length) {
          for (let i = startColIdx; i <= endColIdx; i++) {
            if (i < headers.length) {
              const val = parseFloat(data[rowIdx][headers[i]]) || 0;
              sum += val;
            }
          }
        }
        return sum;
      });
      
      // Handle CONCAT function: CONCAT(B2,"-",C2)
      expr = expr.replace(/CONCAT\((.*?)\)/gi, (match, args) => {
        return args.split(',').map(arg => {
          arg = arg.trim();
          if (arg.startsWith('"') && arg.endsWith('"')) {
            return arg.slice(1, -1);
          }
          const cellMatch = arg.match(/([A-Z]+)(\d+)/);
          if (cellMatch) {
            const colIdx = cellMatch[1].charCodeAt(0) - 65;
            const rowIdx = parseInt(cellMatch[2]) - 2;
            if (rowIdx >= 0 && rowIdx < data.length && colIdx < headers.length) {
              return data[rowIdx][headers[colIdx]];
            }
          }
          return arg;
        }).join('');
      });
      
      // Evaluate the expression safely
      // eslint-disable-next-line no-eval
      const result = eval(expr);
      return result;
    } catch (error) {
      return formula; // Return original if evaluation fails
    }
  };

  const addRow = () => {
    const newRow = {};
    headers.forEach(h => (newRow[h] = ''));
    const newData = [...data, newRow];
    setData(newData);
    addToHistory(newData);
    showToast('Row added');

    if (isCardView) {
      const filteredData = getFilteredData(newData);
      setCurrentCardIndex(filteredData.length - 1);
    }
  };

  const deleteRow = (index) => {
    if (index < 0 || index >= data.length) return;

    const newData = data.filter((_, i) => i !== index);
    setData(newData);
    addToHistory(newData);
    showToast('Row deleted');

    const filteredData = getFilteredData(newData);
    if (currentCardIndex >= filteredData.length) {
      setCurrentCardIndex(Math.max(0, filteredData.length - 1));
    }
  };

  const addToHistory = (newData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    setHistory(newHistory.slice(-50));
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setData(JSON.parse(JSON.stringify(history[historyIndex - 1])));
      showToast('Undo successful');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setData(JSON.parse(JSON.stringify(history[historyIndex + 1])));
      showToast('Redo successful');
    }
  };

  const getFilteredData = (dataToFilter = data) => {
    return dataToFilter.filter(row => {
      const matchesFilters = Object.entries(filters).every(
        ([key, value]) => String(row[key]) === String(value)
      );
      const matchesSearch = searchTerm === '' || 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchesFilters && matchesSearch;
    });
  };

  const navigateCard = (direction) => {
    const filteredData = getFilteredData();
    const newIndex = currentCardIndex + direction;
    setCurrentCardIndex(Math.max(0, Math.min(newIndex, filteredData.length - 1)));
  };

  const clearAllHistory = () => {
    if (window.confirm('Clear all saved files? This cannot be undone.')) {
      localStorage.removeItem('excelFileHistory');
      showToast('History cleared');
      setShowHistory(false);
    }
  };

  const filteredData = getFilteredData();
  const hasData = data.length > 0;

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6 relative overflow-hidden paper-texture">
      <JapaneseOrnament />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl shadow-2xl p-4 md:p-6 mb-4 md:mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-sage mb-1">
                Excel Editor Pro
              </h1>
              <p className="text-terracotta text-sm">Professional Data Management System</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-sage font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded"
                />
                <span>Auto-save</span>
              </label>

              <div className="inline-flex bg-white rounded-xl p-1 shadow-md">
                <button
                  onClick={() => setIsCardView(false)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    !isCardView
                      ? 'bg-gradient-to-r from-terracotta to-sand text-white shadow-lg'
                      : 'text-terracotta'
                  }`}
                >
                  <Grid className="inline-block" size={16} />
                  <span className="ml-1 hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setIsCardView(true)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    isCardView
                      ? 'bg-gradient-to-r from-terracotta to-sand text-white shadow-lg'
                      : 'text-terracotta'
                  }`}
                >
                  <CreditCard className="inline-block" size={16} />
                  <span className="ml-1 hidden sm:inline">Card</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="fileInput"
            />
            <button
              onClick={() => document.getElementById('fileInput').click()}
              className="btn-primary text-white px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2"
            >
              <Upload size={16} />
              <span>Upload</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={!hasData}
              className="btn-secondary px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={16} />
              <span>Download</span>
            </button>

            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="bg-white text-terracotta px-3 py-2 md:py-3 rounded-lg shadow-md border-2 border-cream disabled:opacity-50"
              title="Undo"
            >
              <Undo size={16} />
            </button>

            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="bg-white text-terracotta px-3 py-2 md:py-3 rounded-lg shadow-md border-2 border-cream disabled:opacity-50"
              title="Redo"
            >
              <Redo size={16} />
            </button>

            <button
              onClick={addRow}
              disabled={!hasData}
              className="btn-primary text-white px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={16} />
              <span>Add Row</span>
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="bg-white text-terracotta px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-md border-2 border-cream font-medium text-sm flex items-center gap-2"
            >
              <History size={16} />
              <span>Files</span>
            </button>
          </div>
        </motion.div>

        {/* Sheets Navigation */}
        <AnimatePresence>
          {sheets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass rounded-xl shadow-lg p-3 mb-4"
            >
              <div className="flex gap-2 overflow-x-auto pb-2">
                {sheets.map((sheet, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (workbook) {
                        loadSheet(workbook, idx, sheets);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap text-sm transition-all ${
                      activeSheet === idx
                        ? 'bg-gradient-to-r from-terracotta to-sand text-white shadow-lg'
                        : 'bg-white text-terracotta hover:bg-cream border-2 border-cream'
                    }`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <AnimatePresence>
          {hasData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass rounded-xl shadow-lg p-4 mb-4"
            >
              {/* Formula Bar */}
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm font-semibold text-sage min-w-[60px]">
                  Formula:
                </label>
                <input
                  type="text"
                  value={formulaBarValue}
                  onChange={(e) => {
                    setFormulaBarValue(e.target.value);
                    if (selectedCell) {
                      updateCell(selectedCell.row, selectedCell.col, e.target.value);
                    }
                  }}
                  placeholder="Enter value or formula (e.g., =B2+C2, =SUM(B2:D2), =CONCAT(B2,&quot;x&quot;,C2))"
                  className="flex-1 px-3 py-2 border-2 border-cream rounded-lg focus:border-terracotta focus:outline-none font-mono text-sm"
                />
                <button
                  onClick={() => {
                    if (selectedCell && formulaBarValue) {
                      const evaluated = evaluateFormula(formulaBarValue, selectedCell.row);
                      showToast(`Result: ${evaluated}`);
                    }
                  }}
                  className="btn-primary text-white px-4 py-2 rounded-lg text-sm"
                  disabled={!selectedCell}
                >
                  Evaluate
                </button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-terracotta" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search across all columns..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-cream rounded-lg focus:border-terracotta focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {headers.map(header => {
                  const uniqueValues = [...new Set(data.map(row => row[header]))]
                    .filter(v => v !== '' && v !== '-')
                    .sort();

                  return (
                    <div key={header}>
                      <label className="block text-xs font-medium text-sage mb-1.5 truncate" title={header}>
                        {header}
                      </label>
                      <select
                        value={filters[header] || ''}
                        onChange={(e) => {
                          const newFilters = { ...filters };
                          if (e.target.value === '') {
                            delete newFilters[header];
                          } else {
                            newFilters[header] = e.target.value;
                          }
                          setFilters(newFilters);
                          setCurrentCardIndex(0);
                        }}
                        className="w-full px-2 py-2 border-2 border-cream rounded-lg focus:border-terracotta focus:outline-none text-xs"
                      >
                        <option value="">All ({uniqueValues.length})</option>
                        {uniqueValues.slice(0, 100).map(val => (
                          <option key={val} value={val}>
                            {val}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass rounded-xl shadow-lg p-4 mb-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-sage">Saved Files</h3>
                <button
                  onClick={clearAllHistory}
                  className="text-red-500 text-sm font-medium hover:text-red-700 px-3 py-1 hover:bg-red-50 rounded"
                >
                  Clear All
                </button>
              </div>
              <HistoryList onLoad={loadFileFromHistory} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Views */}
        {!hasData ? (
          <EmptyState />
        ) : isCardView ? (
          <CardView
            data={filteredData}
            headers={headers}
            currentIndex={currentCardIndex}
            onNavigate={navigateCard}
            onUpdate={updateCell}
            onDelete={deleteRow}
            allData={data}
            onCellSelect={(row, col, value) => {
              setSelectedCell({ row, col });
              setFormulaBarValue(value);
            }}
            evaluateFormula={evaluateFormula}
          />
        ) : (
          <TableView
            data={filteredData}
            headers={headers}
            onUpdate={updateCell}
            onDelete={deleteRow}
            originalData={data}
            allData={data}
            onCellSelect={(row, col, value) => {
              setSelectedCell({ row, col });
              setFormulaBarValue(value);
            }}
            evaluateFormula={evaluateFormula}
          />
        )}
      </div>

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-xl shadow-2xl p-8 text-center"
    >
      <Upload className="mx-auto text-stone mb-4" size={48} />
      <h2 className="text-2xl font-bold text-sage mb-2">No Data Yet</h2>
      <p className="text-terracotta mb-4">Upload an Excel file to start editing</p>
      <button
        onClick={() => document.getElementById('fileInput').click()}
        className="btn-primary text-white px-6 py-3 rounded-lg shadow-lg font-medium"
      >
        Choose File
      </button>
    </motion.div>
  );
}

// History List Component
function HistoryList({ onLoad }) {
  const [fileHistory, setFileHistory] = useState([]);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
    setFileHistory(history);
  }, []);

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  };

  if (fileHistory.length === 0) {
    return <p className="text-terracotta text-center py-4">No saved files</p>;
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {fileHistory.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          onClick={() => onLoad(item.state, item.fileName)}
          className="p-3 bg-white rounded-lg border-2 border-cream hover:border-terracotta cursor-pointer transition-all hover:transform hover:translate-x-1"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sage text-sm truncate">{item.fileName}</p>
              <p className="text-xs text-terracotta">
                {item.sheets} sheet{item.sheets > 1 ? 's' : ''} • {item.rows} rows
              </p>
            </div>
            <span className="text-xs text-stone whitespace-nowrap ml-2">
              {getTimeAgo(item.timestamp)}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Table View Component
function TableView({ data, headers, onUpdate, onDelete, originalData, allData, onCellSelect, evaluateFormula }) {
  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-xl shadow-2xl p-8 text-center"
      >
        <p className="text-terracotta text-lg">No data matches your filters</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-terracotta to-sand text-white sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-xs">Actions</th>
              {headers.map(h => (
                <th key={h} className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap" title={h}>
                  <div className="min-w-[80px] max-w-[150px] truncate">{h}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => {
              const originalIndex = originalData.indexOf(row);
              return (
                <motion.tr
                  key={originalIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rowIdx * 0.02 }}
                  className="border-b border-cream hover:bg-cream hover:bg-opacity-50"
                >
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onDelete(originalIndex)}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                  {headers.map(header => {
                    const cellValue = row[header];
                    const displayValue = String(cellValue).startsWith('=') 
                      ? evaluateFormula(cellValue, originalIndex) 
                      : cellValue;
                    
                    return (
                      <td 
                        key={header} 
                        className="px-3 py-2 cursor-pointer hover:bg-sand hover:bg-opacity-30"
                        onClick={() => onCellSelect(originalIndex, header, cellValue)}
                      >
                        <div title={cellValue} className="min-w-[80px] max-w-[150px]">
                          <SuggestionInput
                            value={displayValue}
                            column={header}
                            rowIndex={originalIndex}
                            onChange={(value) => onUpdate(originalIndex, header, value)}
                            allData={allData}
                            isCard={false}
                          />
                        </div>
                      </td>
                    );
                  })}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// Card View Component
function CardView({ data, headers, currentIndex, onNavigate, onUpdate, onDelete, allData, onCellSelect, evaluateFormula }) {
  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-xl shadow-2xl p-8 text-center"
      >
        <p className="text-terracotta text-lg mb-4">No data matches your filters</p>
      </motion.div>
    );
  }

  const row = data[currentIndex];
  const originalIndex = allData.indexOf(row);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-center gap-3 glass rounded-xl p-4 shadow-lg mb-4"
      >
        <div className="text-sage font-semibold text-sm">
          Card {currentIndex + 1} of {data.length}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => onNavigate(-1)}
            disabled={currentIndex === 0}
            className="flex-1 sm:flex-none bg-white text-terracotta px-4 py-2 rounded-lg shadow-md border-2 border-cream text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => onDelete(originalIndex)}
            className="flex-1 sm:flex-none bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 text-sm"
          >
            Delete
          </button>
          <button
            onClick={() => onNavigate(1)}
            disabled={currentIndex === data.length - 1}
            className="flex-1 sm:flex-none btn-primary text-white px-4 py-2 rounded-lg shadow-lg text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </motion.div>

      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="glass rounded-xl shadow-2xl p-4 md:p-8"
      >
        <div className="space-y-3">
          {headers.map((header, idx) => {
            const cellValue = row[header];
            const displayValue = String(cellValue).startsWith('=') 
              ? evaluateFormula(cellValue, originalIndex) 
              : cellValue;
            
            return (
              <motion.div
                key={header}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="border-b border-cream pb-3 p-2 rounded-lg hover:bg-ivory transition-all"
                onClick={() => onCellSelect && onCellSelect(originalIndex, header, cellValue)}
              >
                <label className="block text-sm font-semibold text-sage mb-2">{header}</label>
                <SuggestionInput
                  value={displayValue}
                  column={header}
                  rowIndex={originalIndex}
                  onChange={(value) => onUpdate(originalIndex, header, value)}
                  allData={allData}
                  isCard={true}
                />
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

export default App;
