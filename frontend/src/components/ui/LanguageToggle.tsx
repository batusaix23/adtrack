'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
      title={language === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés'}
    >
      <span className={`fi fi-${language === 'en' ? 'us' : 'es'} text-base`} />
      <span className="uppercase">{language}</span>
    </button>
  );
}

export function LanguageToggleSimple() {
  const { language, setLanguage } = useLanguage();

  const handleSetLanguage = (lang: 'en' | 'es') => {
    console.log('Setting language to:', lang);
    setLanguage(lang);
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        type="button"
        onClick={() => handleSetLanguage('en')}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          language === 'en'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => handleSetLanguage('es')}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          language === 'es'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        ES
      </button>
    </div>
  );
}
