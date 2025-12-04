import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

function Toast({ message, type = 'success' }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-2xl min-w-[200px] ${
        type === 'success'
          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
          : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle size={20} />
      ) : (
        <XCircle size={20} />
      )}
      <span className="font-medium">{message}</span>
    </motion.div>
  );
}

export default Toast;
