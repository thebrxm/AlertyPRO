import React, { useState } from 'react';
import { AlertData, SeverityLevel } from '../types';

interface Props {
  alert: AlertData;
  onToggleHandled: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updatedData: Partial<AlertData>) => void;
}

export const AlertCard: React.FC<Props> = ({ alert, onToggleHandled, onDelete, onUpdate }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for editing fields
  const [editValues, setEditValues] = useState({
    incident: alert.incident,
    location: alert.location,
    notes: alert.notes || ''
  });

  const isHandled = alert.isHandled;
  const isCritical = !isHandled && alert.severity === SeverityLevel.CRITICAL;

  const handleSaveEdit = () => {
    onUpdate(alert.id, {
      incident: editValues.incident,
      location: editValues.location,
      notes: editValues.notes
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // Revert to original values
    setEditValues({
      incident: alert.incident,
      location: alert.location,
      notes: alert.notes || ''
    });
    setIsEditing(false);
  };

  const getSeverityColor = (severity: SeverityLevel) => {
    if (isHandled) return 'bg-slate-300 dark:bg-slate-600 border-slate-300 dark:border-slate-600';
    switch (severity) {
      case SeverityLevel.CRITICAL: return 'bg-red-600 border-red-600';
      case SeverityLevel.WARNING: return 'bg-amber-500 border-amber-500';
      default: return 'bg-blue-500 border-blue-500';
    }
  };

  const getSeverityBg = (severity: SeverityLevel) => {
    if (isHandled) return 'bg-slate-50 dark:bg-slate-800/40';
    return 'bg-white dark:bg-slate-800';
  };

  const getMapUrl = () => {
    if (alert.coordinates) {
      return `https://www.google.com/maps/search/?api=1&query=${alert.coordinates.lat},${alert.coordinates.lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.location)}`;
  };

  return (
    <div className={`relative flex rounded-lg overflow-hidden shadow-sm transition-all duration-300 
      ${getSeverityBg(alert.severity)} 
      ${isCritical ? 'border-[3px] border-red-600 dark:border-red-500' : 'border border-slate-200 dark:border-slate-700'} 
      ${isHandled ? 'opacity-60' : 'translate-x-0'} 
      ${isCritical ? 'animate-alert-critical' : ''}
    `}>
      
      {/* Confirmation Overlay */}
      {isDeleting && (
        <div className="absolute inset-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center transition-all duration-200 animate-slide-in">
          <p className="text-slate-800 dark:text-slate-200 font-bold mb-3 text-sm">¿Eliminar reporte permanentemente?</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeleting(false)}
              className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              CANCELAR
            </button>
            <button 
              onClick={() => onDelete(alert.id)}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 shadow-lg shadow-red-600/20 transition-colors flex items-center gap-1"
            >
              CONFIRMAR
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Color Indicator */}
      <div className={`w-2 flex-shrink-0 ${getSeverityColor(alert.severity)}`}></div>

      {/* Main Content */}
      <div className="flex-1 p-3 flex flex-col gap-1 min-w-0">
        
        {/* Header Row */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            {!isHandled && alert.severity === SeverityLevel.CRITICAL && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              alert.severity === SeverityLevel.CRITICAL ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 
              alert.severity === SeverityLevel.WARNING ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            }`}>
              {alert.severity}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Edit Mode vs View Mode */}
        {isEditing ? (
          <div className="space-y-2 animate-slide-in">
             {/* Edit Incident */}
             <div className="space-y-1">
               <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Incidente</label>
               <input 
                  type="text" 
                  value={editValues.incident}
                  onChange={(e) => setEditValues({...editValues, incident: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
               />
             </div>
             {/* Edit Location */}
             <div className="space-y-1">
               <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Ubicación</label>
               <input 
                  type="text" 
                  value={editValues.location}
                  onChange={(e) => setEditValues({...editValues, location: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
               />
             </div>
             {/* Edit Notes */}
             <div className="space-y-1">
               <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Notas</label>
               <textarea 
                  value={editValues.notes}
                  onChange={(e) => setEditValues({...editValues, notes: e.target.value})}
                  rows={2}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
               />
             </div>
             
             {/* Save/Cancel Actions */}
             <div className="flex gap-2 pt-1">
               <button 
                onClick={handleSaveEdit}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-1.5 rounded transition-colors"
               >
                 GUARDAR
               </button>
               <button 
                onClick={handleCancelEdit}
                className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold py-1.5 rounded transition-colors"
               >
                 CANCELAR
               </button>
             </div>
          </div>
        ) : (
          /* View Mode */
          <div className="mt-1">
            <h3 className={`font-bold text-lg leading-tight text-slate-900 dark:text-white ${isHandled ? 'line-through decoration-2 decoration-slate-300 dark:decoration-slate-600' : ''}`}>
              {alert.incident}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-slate-600 dark:text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium font-mono uppercase tracking-tight truncate max-w-[200px] sm:max-w-xs">
                {alert.location}
              </p>
            </div>
            
            {/* Notes Section */}
            {alert.notes && (
              <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs italic leading-relaxed break-words">
                  {alert.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions (Vertical) */}
      <div className="flex flex-col border-l border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <label className="flex-1 flex items-center justify-center px-3 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group border-b border-slate-100 dark:border-slate-700">
          <input 
            type="checkbox" 
            className="hidden" 
            checked={isHandled || false} 
            onChange={() => onToggleHandled(alert.id)}
            disabled={isEditing}
          />
           <div className={`transition-all duration-200 ${isHandled ? 'text-emerald-600 dark:text-emerald-400 scale-110' : 'text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400'} ${isEditing ? 'opacity-30' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
           </div>
        </label>
        
        <button 
          onClick={() => {
            setEditValues({
              incident: alert.incident,
              location: alert.location,
              notes: alert.notes || ''
            });
            setIsEditing(true);
          }}
          disabled={isEditing || isHandled}
          className={`flex-1 flex items-center justify-center px-3 transition-colors border-b border-slate-100 dark:border-slate-700 ${
            isEditing || isHandled
            ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' 
            : 'text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }`}
          title="Editar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
             <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>

        <a 
          href={getMapUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 flex items-center justify-center px-3 transition-colors border-b border-slate-100 dark:border-slate-700 ${
            isEditing 
            ? 'text-slate-200 dark:text-slate-700 pointer-events-none' 
            : 'text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }`}
          title="Ver Mapa"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.806-.984A10.324 10.324 0 0118 7.369V2.5" />
          </svg>
        </a>

        <button 
          type="button"
          onClick={() => setIsDeleting(true)}
          disabled={isEditing}
          className={`flex-1 flex items-center justify-center px-3 transition-colors ${
            isEditing 
            ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed'
            : 'text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          }`}
          title="Borrar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};