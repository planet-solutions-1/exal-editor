import React from 'react';
import { motion } from 'framer-motion';

function JapaneseOrnament() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Bamboo illustration - bottom right */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 0.08, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute bottom-0 right-0 w-64 h-96"
      >
        <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Bamboo stems */}
          <path
            d="M80 300 L80 0"
            stroke="#6B705C"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M120 300 L120 20"
            stroke="#6B705C"
            strokeWidth="6"
            strokeLinecap="round"
          />
          
          {/* Bamboo segments */}
          <line x1="70" y1="250" x2="90" y2="250" stroke="#6B705C" strokeWidth="2" />
          <line x1="70" y1="200" x2="90" y2="200" stroke="#6B705C" strokeWidth="2" />
          <line x1="70" y1="150" x2="90" y2="150" stroke="#6B705C" strokeWidth="2" />
          <line x1="70" y1="100" x2="90" y2="100" stroke="#6B705C" strokeWidth="2" />
          <line x1="70" y1="50" x2="90" y2="50" stroke="#6B705C" strokeWidth="2" />
          
          <line x1="113" y1="270" x2="127" y2="270" stroke="#6B705C" strokeWidth="2" />
          <line x1="113" y1="220" x2="127" y2="220" stroke="#6B705C" strokeWidth="2" />
          <line x1="113" y1="170" x2="127" y2="170" stroke="#6B705C" strokeWidth="2" />
          <line x1="113" y1="120" x2="127" y2="120" stroke="#6B705C" strokeWidth="2" />
          <line x1="113" y1="70" x2="127" y2="70" stroke="#6B705C" strokeWidth="2" />
          
          {/* Bamboo leaves */}
          <ellipse cx="60" cy="40" rx="25" ry="8" fill="#B7B7A4" opacity="0.6" transform="rotate(-30 60 40)" />
          <ellipse cx="100" cy="30" rx="25" ry="8" fill="#B7B7A4" opacity="0.6" transform="rotate(30 100 30)" />
          <ellipse cx="140" cy="50" rx="25" ry="8" fill="#B7B7A4" opacity="0.6" transform="rotate(-20 140 50)" />
          <ellipse cx="70" cy="80" rx="25" ry="8" fill="#B7B7A4" opacity="0.6" transform="rotate(40 70 80)" />
          <ellipse cx="130" cy="90" rx="25" ry="8" fill="#B7B7A4" opacity="0.6" transform="rotate(-40 130 90)" />
        </svg>
      </motion.div>

      {/* Sun/Moon circle - top left */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.06, scale: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="absolute top-10 left-10 w-32 h-32 rounded-full bg-terracotta"
      />

      {/* Decorative circles - scattered */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.03 }}
        transition={{ duration: 1, delay: 0.7 }}
        className="absolute top-40 right-40 w-20 h-20 rounded-full bg-sand"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.04 }}
        transition={{ duration: 1, delay: 0.9 }}
        className="absolute bottom-40 left-40 w-24 h-24 rounded-full bg-stone"
      />
    </div>
  );
}

export default JapaneseOrnament;
