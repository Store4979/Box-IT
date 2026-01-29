import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import Home from '@/pages/Home';
import Settings from '@/pages/Settings';
import defaultBoxes from '@/data/defaultBoxes.json';
import defaultGuidelines from '@/data/defaultGuidelines.json';
import { ensureSeeded } from '@/lib/storage';
import { initConfigSync } from '@/lib/configSync';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  useEffect(() => {
    // Ensure the app always has usable defaults, even offline.
    ensureSeeded({ defaultBoxes, defaultGuidelines });

    // Sync shared config across devices (Netlify Functions + Blobs).
    initConfigSync({ defaultBoxes, defaultGuidelines, queryClient: queryClientInstance });
  }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
