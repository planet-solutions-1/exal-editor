import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

function SuggestionInput({ value, column, rowIndex, onChange, allData, isCard }) {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState({ backend: [], common: [], all: [] });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          column,
          value: inputValue,
          allData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      // Fallback to local suggestions only
      generateLocalSuggestions();
    } finally {
      setIsLoading(false);
    }
  };

  const generateLocalSuggestions = () => {
    const columnValues = allData
      .map(row => row[column])
      .filter(v => v !== '' && v !== null && v !== undefined);

    // Frequency analysis
    const frequency = {};
    columnValues.forEach(val => {
      const key = String(val).toLowerCase();
      frequency[key] = (frequency[key] || 0) + 1;
    });

    // Get top common values
    const commonValues = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([val]) => columnValues.find(v => String(v).toLowerCase() === val));

    // Filter by search term
    const searchTerm = String(inputValue || '').toLowerCase();
    const filtered = commonValues.filter(s =>
      String(s).toLowerCase().includes(searchTerm)
    );

    setSuggestions({
      backend: [],
      common: filtered,
      all: filtered
    });
  };

  const handleFocus = () => {
    setShowSuggestions(true);
    fetchSuggestions();
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    fetchSuggestions();
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, 200);
  };

  const selectSuggestion = (suggestion) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    const totalSuggestions = suggestions.all.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < totalSuggestions - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions.all[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const inputType = detectInputType(column, allData);
  const inputClass = `w-full px-3 py-2 border-2 border-cream rounded-lg ${
    isCard ? 'text-base' : 'text-xs'
  } focus:border-terracotta focus:outline-none transition-all`;

  return (
    <div className="relative">
      {inputType === 'number' ? (
        <input
          ref={inputRef}
          type="number"
          step="any"
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={inputClass}
          placeholder={`Enter ${column}`}
        />
      ) : inputType === 'date' ? (
        <input
          ref={inputRef}
          type="date"
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={inputClass}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={inputClass}
          placeholder={`Enter ${column}`}
        />
      )}

      <AnimatePresence>
        {showSuggestions && suggestions.all.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full bg-white border-2 border-terracotta rounded-lg shadow-2xl max-h-64 overflow-y-auto"
            style={{ minWidth: '200px' }}
          >
            {isLoading && (
              <div className="px-3 py-2 text-xs text-terracotta">Loading suggestions...</div>
            )}

            {suggestions.backend.length > 0 && (
              <>
                <div className="sticky top-0 bg-gradient-to-r from-terracotta to-sand text-white px-3 py-2 text-xs font-semibold">
                  From Server
                </div>
                {suggestions.backend.map((suggestion, idx) => (
                  <SuggestionItem
                    key={`backend-${idx}`}
                    suggestion={suggestion}
                    isSelected={selectedIndex === idx}
                    onClick={() => selectSuggestion(suggestion)}
                    badge="Server"
                    searchTerm={inputValue}
                  />
                ))}
              </>
            )}

            {suggestions.common.length > 0 && (
              <>
                <div className="sticky top-0 bg-gradient-to-r from-stone to-cream text-sage px-3 py-2 text-xs font-semibold">
                  Common Values
                </div>
                {suggestions.common.map((suggestion, idx) => {
                  const globalIndex = suggestions.backend.length + idx;
                  return (
                    <SuggestionItem
                      key={`common-${idx}`}
                      suggestion={suggestion}
                      isSelected={selectedIndex === globalIndex}
                      onClick={() => selectSuggestion(suggestion)}
                      badge="Common"
                      searchTerm={inputValue}
                    />
                  );
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SuggestionItem({ suggestion, isSelected, onClick, badge, searchTerm }) {
  const highlightMatch = (text, search) => {
    if (!search) return text;
    
    const searchLower = search.toLowerCase();
    const textStr = String(text);
    const textLower = textStr.toLowerCase();
    const index = textLower.indexOf(searchLower);
    
    if (index === -1) return textStr;
    
    return (
      <>
        {textStr.substring(0, index)}
        <span className="bg-sand font-semibold">
          {textStr.substring(index, index + search.length)}
        </span>
        {textStr.substring(index + search.length)}
      </>
    );
  };

  return (
    <motion.div
      whileHover={{ paddingLeft: '16px' }}
      onClick={onClick}
      className={`px-3 py-2 cursor-pointer border-b border-cream last:border-b-0 flex justify-between items-center transition-all text-sm ${
        isSelected ? 'bg-cream' : 'hover:bg-cream'
      }`}
    >
      <span className="font-medium text-sage truncate">
        {highlightMatch(suggestion, searchTerm)}
      </span>
      <span className="text-xs px-2 py-0.5 rounded-full bg-terracotta text-white ml-2 whitespace-nowrap">
        {badge}
      </span>
    </motion.div>
  );
}

function detectInputType(column, allData) {
  const columnLower = column.toLowerCase();
  
  // Check for numeric keywords
  const numericKeywords = [
    'height', 'weight', 'chest', 'hip', 'bmi', 'age', 'size',
    'number', 'count', 'amount', 'price', 'cost', 'total', 'score',
    'quantity', 'value', 'rate', 'percent', 'id'
  ];
  
  if (numericKeywords.some(keyword => columnLower.includes(keyword))) {
    const values = allData.map(row => row[column]).filter(v => v !== '' && v !== null);
    const numericValues = values.filter(v => !isNaN(v));
    if (numericValues.length / values.length > 0.5) {
      return 'number';
    }
  }
  
  // Check for date keywords
  const dateKeywords = ['date', 'time', 'day', 'month', 'year', 'dob', 'birthday'];
  if (dateKeywords.some(keyword => columnLower.includes(keyword))) {
    return 'date';
  }
  
  return 'text';
}

export default SuggestionInput;
