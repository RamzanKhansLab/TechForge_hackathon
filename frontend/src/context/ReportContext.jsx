import { createContext, useContext, useState } from 'react';
import { readReports, writeReports } from '../services/storage.js';
import './ReportContext.css';
const Context = createContext(null);
export function ReportProvider({children}) {
  const [reports,setReports] = useState(readReports);
  const [storageWarning,setStorageWarning] = useState(false);
  const remember = report => {
    const next = [ { ...readReports().find(r => r.id === report.id && r.type === report.type), ...report }, ...readReports().filter(r => !(r.id === report.id && r.type === report.type)) ];
    setStorageWarning(!writeReports(next)); setReports(next);
  };
  const forget = (type,id) => { const next = readReports().filter(r => r.type !== type || r.id !== id); writeReports(next); setReports(next); };
  return <Context.Provider value={{ reports,remember,forget,storageWarning }}>{children}</Context.Provider>;
}
export const useReports = () => useContext(Context);
