import { requestNotificationPermission } from "./firebase";
import React, { useState, useEffect } from 'react';
import { IncidentForm } from './components/IncidentForm';
import { AlertCard } from './components/AlertCard';
import { NotificationBell } from './components/NotificationBell';
import { ToastNotification } from './components/ToastNotification';
import { SettingsPanel } from './components/SettingsPanel';
import { AlertData, Coordinates, NotificationSettings, SeverityLevel } from './types';
import { analyzeIncident } from './services/geminiService';

const App: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(true);
  
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'settings'>('send');
  const [toast, setToast] = useState<{message: string, location: string} | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings State with Persistence
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('alertSettings');
    return saved ? JSON.parse(saved) : {
      soundEnabled: true,
      vibrationEnabled: true,
      vibrationPattern: 'default',
      customIconUrl: ''
    };
  });

  // Derived state for Critical Alert Mode
  const hasCriticalAlerts = alerts.some(a => !a.isHandled && a.severity === SeverityLevel.CRITICAL);

  useEffect(() => {
    localStorage.setItem('alertSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    // Check for browser support
    if (!('Notification' in window)) {
      setIsSupported(false);
    } else {
      setPermission(Notification.permission);
      // Auto-request permission on load if default
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(res => setPermission(res));
      }
    }
    
    // Check system preference for dark mode initially
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  // Toggle Dark Mode Class on HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const requestNotificationPermission = async () => {
    if (!isSupported) return;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  const sendPushNotification = async (alert: AlertData) => {
    if (isSupported && permission === 'granted') {
      const title = `🚨 ${alert.incident}`;
      const bodyText = alert.notes 
        ? `${alert.location}\nNota: ${alert.notes}`
        : alert.location;

      // Calculate Vibration Pattern
      let vibratePattern: number[] = [];
      if (settings.vibrationEnabled) {
          switch (settings.vibrationPattern) {
              case 'urgent': vibratePattern = [100, 50, 100, 50, 100, 50]; break;
              case 'long': vibratePattern = [500, 200, 500, 200]; break;
              case 'default': 
              default: vibratePattern = [200, 100, 200]; break;
          }
      }

      // Determine Icon
      const iconUrl = settings.customIconUrl || 'https://cdn-icons-png.flaticon.com/512/564/564619.png';

      const options: any = {
        body: bodyText,
        icon: iconUrl,
        badge: 'https://cdn-icons-png.flaticon.com/512/564/564619.png', // Keep default badge for consistency
        tag: alert.id,
        requireInteraction: alert.severity === 'CRITICAL',
        vibrate: vibratePattern,
        silent: !settings.soundEnabled,
        data: { id: alert.id }
      };

      try {
        // Intentar usar el Service Worker (Mejor para móviles/Android)
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification(title, options);
        } else {
          // Fallback a la API clásica si el SW no está listo
          const notification = new Notification(title, options);
          notification.onclick = () => window.focus();
        }
      } catch (e) {
        console.error("Error enviando notificación:", e);
        // Último intento con API clásica
        new Notification(title, options);
      }
    }
  };

  const handleCreateAlert = async (incident: string, location: string, notes: string, coords?: Coordinates) => {
    setLoading(true);
    
    const analysis = await analyzeIncident(incident, location);

    const newAlert: AlertData = {
      id: Date.now().toString(),
      incident,
      location,
      notes,
      formattedMessage: analysis.formattedMessage,
      severity: analysis.severity,
      timestamp: new Date(),
      coordinates: coords,
      isHandled: false
    };

    setAlerts(prev => [newAlert, ...prev]);
    
    // Trigger Notifications
    sendPushNotification(newAlert);
    
    // Trigger In-App Balloon (Toast)
    setToast({ message: incident, location: location });

    setLoading(false);
  };

  const handleUpdateAlert = (id: string, updatedData: Partial<AlertData>) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, ...updatedData } : alert
    ));
  };

  const toggleAlertHandled = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, isHandled: !alert.isHandled } : alert
    ));
  };

  const deleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const filteredAlerts = alerts.filter(alert => {
    const query = searchQuery.toLowerCase();
    return (
      alert.incident.toLowerCase().includes(query) ||
      alert.location.toLowerCase().includes(query) ||
      (alert.notes && alert.notes.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen pb-20 max-w-md mx-auto sm:max-w-xl md:max-w-2xl bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden border-x border-slate-200 dark:border-slate-800 relative transition-colors duration-300">
      
      {/* Toast / Balloon Notification */}
      {toast && (
        <ToastNotification 
          message={toast.message} 
          subMessage={toast.location}
          onClose={() => setToast(null)} 
        />
      )}

      {/* Medical Header */}
      <header className={`bg-slate-900 dark:bg-slate-950 text-white sticky top-0 z-10 px-6 py-5 flex justify-between items-center shadow-lg border-b-4 transition-colors duration-500 ${hasCriticalAlerts ? 'border-red-600' : 'border-slate-700'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider uppercase font-mono">ALERTY</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Sistema de Respuesta</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          
          {/* Emergency Pulse Icon (Only shows when critical unhandled alerts exist) */}
          {hasCriticalAlerts && (
            <div className="relative mr-2 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <div className="relative bg-red-600 p-1.5 rounded-full shadow-lg shadow-red-600/50 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title={darkMode ? "Modo Claro" : "Modo Oscuro"}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {isSupported && (
            <NotificationBell 
              permission={permission} 
              onRequest={requestNotificationPermission} 
            />
          )}
        </div>
      </header>

      {/* Medical Style Tabs */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1.5 rounded-xl shadow-inner transition-colors duration-300">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'send' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            REPORTE
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'history' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            HISTORIAL
            {alerts.filter(a => !a.isHandled).length > 0 && (
              <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-md font-mono">
                {alerts.filter(a => !a.isHandled).length}
              </span>
            )}
          </button>
           <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'settings' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            AJUSTES
          </button>
        </div>
      </div>

      <main className="p-4 space-y-6">
        {/* Browser Incompatibility Warning */}
        {!isSupported && (
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border-l-4 border-red-500 text-sm text-red-900 dark:text-red-200 flex items-start gap-3 shadow-sm">
             <span className="text-xl">🚫</span>
             <div>
               <p className="font-bold font-mono uppercase">Dispositivo Incompatible</p>
               <p className="text-red-800 dark:text-red-300">Este navegador no soporta notificaciones PUSH web.</p>
             </div>
          </div>
        )}

        {/* Permission Warning (Only if supported) */}
        {isSupported && permission === 'default' && (
          <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg border-l-4 border-amber-500 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm">
             <span className="text-xl">⚠️</span>
             <div>
               <p className="font-bold font-mono uppercase">Sistema Desconectado</p>
               <p className="text-amber-800 dark:text-amber-300">Habilite las notificaciones para sincronizar alertas en tiempo real.</p>
               <button 
                onClick={requestNotificationPermission}
                className="mt-2 text-amber-700 dark:text-amber-400 font-bold text-xs underline uppercase tracking-wide"
               >
                 Conectar Ahora
               </button>
             </div>
          </div>
        )}

        {/* Tab 1: Send Form */}
        {activeTab === 'send' && (
          <div className="animate-slide-in">
             <IncidentForm onSubmit={handleCreateAlert} isLoading={loading} />
          </div>
        )}

        {/* Tab 2: History Feed */}
        {activeTab === 'history' && (
          <div className="animate-slide-in">
            <div className="flex justify-between items-end mb-4 px-1 border-b border-slate-200 dark:border-slate-700 pb-2">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
                Log de Eventos
              </h2>
              {alerts.some(a => a.isHandled) && (
                <button 
                  onClick={() => setAlerts(prev => prev.filter(a => !a.isHandled))}
                  className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:underline font-bold uppercase tracking-wide"
                >
                  Purgar Archivados
                </button>
              )}
            </div>

            {alerts.length > 0 && (
              <div className="relative mb-4 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar evento, ubicación..."
                  className="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            
            {alerts.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center opacity-40 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100/50 dark:bg-slate-800/50">
                <div className="bg-slate-200 dark:bg-slate-700 p-6 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="font-mono font-bold text-slate-500 dark:text-slate-400">SIN REGISTROS</p>
              </div>
            ) : (
              filteredAlerts.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center">
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No hay coincidencias para "{searchQuery}"</p>
                  <button onClick={() => setSearchQuery('')} className="mt-2 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold hover:underline transition-colors">
                    LIMPIAR BÚSQUEDA
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pb-10">
                  {filteredAlerts.map(alert => (
                    <AlertCard 
                      key={alert.id} 
                      alert={alert} 
                      onToggleHandled={toggleAlertHandled}
                      onDelete={deleteAlert}
                      onUpdate={handleUpdateAlert}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Tab 3: Settings */}
        {activeTab === 'settings' && (
          <SettingsPanel settings={settings} onUpdate={setSettings} />
        )}
      </main>
    </div>
  );
};

export default App;
