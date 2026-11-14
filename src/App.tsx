import { useState, useEffect } from 'react';
import { 
  Car, MapPin, QrCode, ShieldCheck, 
  CheckCircle2, 
  Search, Check, AlertCircle, ArrowLeft, Receipt
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from './lib/supabase';
import type { ParkingZone, Merchant, ParkingSession, ValidationRecord } from './types';

const DEFAULT_ZONES: ParkingZone[] = [
  {
    id: 'zr-rn',
    code: 'ZR-RN',
    name: 'Avda. Reino de Navarra',
    municipality: 'Sarriguren',
    zone_type: 'zona_rosa_comercial',
    base_minutes: 30,
    max_extension_minutes: 30,
    schedule_info: 'L-V: 10:00 - 14:00 y 17:00 - 20:00 | S: 9:00 - 14:00',
    is_active: true
  },
  {
    id: 'zr-er',
    code: 'ZR-ER',
    name: 'Avda. Erripagaña',
    municipality: 'Sarriguren',
    zone_type: 'zona_rosa_comercial',
    base_minutes: 30,
    max_extension_minutes: 30,
    schedule_info: 'L-V: 10:00 - 14:00 y 17:00 - 20:00 | S: 9:00 - 14:00',
    is_active: true
  },
  {
    id: 'zr-cs',
    code: 'ZR-CS',
    name: 'Centro de Salud / Ayto',
    municipality: 'Sarriguren',
    zone_type: 'zona_rosa_servicios',
    base_minutes: 90,
    max_extension_minutes: 0,
    schedule_info: 'L-V: 7:30 - 14:30',
    is_active: true
  }
];

const DEFAULT_MERCHANTS: Merchant[] = [
  {
    id: 'm-1',
    name: 'Panadería Sarriguren',
    category: 'Alimentación',
    address: 'Av. Reino de Navarra, 8',
    lat: 42.8122,
    lng: -1.6085,
    qr_token: 'panaderia_sarriguren_token_01',
    is_active: true
  },
  {
    id: 'm-2',
    name: 'Farmacia Egüés',
    category: 'Salud',
    address: 'Av. Reino de Navarra, 16',
    lat: 42.8135,
    lng: -1.6072,
    qr_token: 'farmacia_egues_token_02',
    is_active: true
  },
  {
    id: 'm-3',
    name: 'Óptica y Visión Valle',
    category: 'Servicios',
    address: 'Av. Erripagaña, 24',
    lat: 42.8180,
    lng: -1.6150,
    qr_token: 'optica_valle_token_03',
    is_active: true
  },
  {
    id: 'm-4',
    name: 'Carnicería Tradición',
    category: 'Alimentación',
    address: 'Bardenas Reales, 12',
    lat: 42.8115,
    lng: -1.6095,
    qr_token: 'carniceria_navarra_token_04',
    is_active: true
  }
];

export default function App() {
  const [appRole, setAppRole] = useState<'driver' | 'merchant' | 'police'>('driver');
  const [currentView, setCurrentView] = useState<'home' | 'scanner' | 'ticket'>('home');

  const [plate, setPlate] = useState('7842 MKL');
  const [isEditingPlate, setIsEditingPlate] = useState(false);
  const [tempPlate, setTempPlate] = useState(plate);

  const [zones] = useState<ParkingZone[]>(DEFAULT_ZONES);
  const [merchants] = useState<Merchant[]>(DEFAULT_MERCHANTS);
  const [selectedZone, setSelectedZone] = useState<ParkingZone>(DEFAULT_ZONES[0]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant>(DEFAULT_MERCHANTS[0]);

  const [session, setSession] = useState<ParkingSession | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [lastValidation, setLastValidation] = useState<ValidationRecord | null>(null);

  const [policePlate, setPolicePlate] = useState('');
  const [policeResult, setPoliceResult] = useState<any>(null);

  // Sync with Supabase if online
  useEffect(() => {
    supabase.from('parking_zones').select('*').then(() => {});
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!session || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session, secondsRemaining]);

  const startParking = (zone: ParkingZone) => {
    const mins = zone.base_minutes;
    const now = new Date();
    const expires = new Date(now.getTime() + mins * 60 * 1000);

    const newSession: ParkingSession = {
      id: 'sess-' + Math.random().toString(36).substring(2, 9),
      license_plate: plate,
      zone_id: zone.id,
      zone_name: zone.name,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      status: 'active',
      is_extended: false
    };

    setSession(newSession);
    setSecondsRemaining(mins * 60);
    setCurrentView('home');
  };

  const validateInStore = (m: Merchant) => {
    if (!session) return;
    const extra = 30 * 60;
    setSecondsRemaining(prev => prev + extra);
    setSession({
      ...session,
      is_extended: true,
      status: 'extended',
      expires_at: new Date(new Date(session.expires_at).getTime() + extra * 1000).toISOString()
    });

    setLastValidation({
      id: 'val-' + Math.random().toString(36).substring(2, 9),
      session_id: session.id,
      merchant_id: m.id,
      merchant_name: m.name,
      minutes_added: 30,
      validated_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      verification_hash: 'CPK-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    });

    confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    setCurrentView('ticket');
  };

  const handlePoliceCheck = () => {
    const p = policePlate.trim().toUpperCase();
    if (!p) return;
    if (session && p === session.license_plate) {
      setPoliceResult({
        plate: p,
        authorized: secondsRemaining > 0,
        minutes: Math.ceil(secondsRemaining / 60),
        merchant: lastValidation?.merchant_name,
        zone: session.zone_name
      });
    } else {
      setPoliceResult({
        plate: p,
        authorized: true,
        minutes: 38,
        merchant: 'Panadería Sarriguren',
        zone: 'Avda. Reino de Navarra'
      });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex justify-center min-h-screen bg-slate-100 text-slate-800 font-sans">
      <div className="w-full max-w-md min-h-screen bg-white flex flex-col shadow-lg border-x border-slate-200">
        
        {/* Top Minimal Role Switcher (para la demo) */}
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium text-[11px]">Modo:</span>
          <div className="flex space-x-1">
            <button 
              onClick={() => { setAppRole('driver'); setCurrentView('home'); }}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                appRole === 'driver' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Conductor
            </button>
            <button 
              onClick={() => setAppRole('merchant')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                appRole === 'merchant' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Comercio
            </button>
            <button 
              onClick={() => setAppRole('police')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                appRole === 'police' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Policía
            </button>
          </div>
        </div>

        {/* Header estilo Telpark / Utilidad Limpia */}
        <header className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-20">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-900 leading-none">Compark</h1>
              <p className="text-[11px] text-slate-500 mt-0.5">Valle de Egüés</p>
            </div>
          </div>

          {appRole === 'driver' && (
            <div>
              {isEditingPlate ? (
                <div className="flex items-center border border-blue-600 rounded p-0.5 bg-white">
                  <input 
                    type="text" 
                    value={tempPlate}
                    onChange={(e) => setTempPlate(e.target.value.toUpperCase())}
                    className="w-20 text-xs font-mono font-bold text-center outline-none"
                    maxLength={8}
                  />
                  <button 
                    onClick={() => { setPlate(tempPlate); setIsEditingPlate(false); }}
                    className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingPlate(true)}
                  className="bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded border border-slate-300 font-mono text-xs font-bold text-slate-800 transition flex items-center space-x-1"
                >
                  <span className="text-[9px] text-slate-500">ES</span>
                  <span>{plate}</span>
                </button>
              )}
            </div>
          )}
        </header>

        {/* ========================================================= */}
        {/* VISTA 1: CONDUCTOR (ESTILO TELPARK / SIMPLE Y LIMPIO)     */}
        {/* ========================================================= */}
        {appRole === 'driver' && (
          <main className="flex-1 p-5 space-y-4">
            
            {/* SUB-VISTA: ESCÁNER / VALIDACIÓN */}
            {currentView === 'scanner' && (
              <div className="space-y-4">
                <button 
                  onClick={() => setCurrentView('home')}
                  className="flex items-center space-x-1 text-xs text-slate-600 font-medium hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al estacionamiento</span>
                </button>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <h2 className="text-base font-bold text-slate-900">Validar compra en comercio local</h2>
                  <p className="text-xs text-slate-600 mt-1">Escanea el código del mostrador para sumar +30 minutos</p>

                  <div className="w-44 h-44 border-2 border-dashed border-blue-500 rounded-xl mx-auto my-4 flex items-center justify-center bg-white">
                    <QrCode className="w-16 h-16 text-slate-400" />
                  </div>
                  <span className="text-[11px] text-slate-500 block">Enfoca el código del comercio</span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    O selecciona el comercio para simular:
                  </p>
                  <div className="space-y-2">
                    {merchants.map(m => (
                      <button 
                        key={m.id}
                        onClick={() => validateInStore(m)}
                        className="w-full p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex justify-between items-center text-left text-xs transition"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{m.name}</p>
                          <p className="text-slate-500 text-[11px]">{m.address}</p>
                        </div>
                        <span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded text-xs border border-blue-200">
                          +30 min
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VISTA: COMPROBANTE OFICIAL (ESTILO RECIBO TELPARK) */}
            {currentView === 'ticket' && (
              <div className="space-y-4">
                <button 
                  onClick={() => setCurrentView('home')}
                  className="flex items-center space-x-1 text-xs text-slate-600 font-medium hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>

                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="text-center pb-3 border-b border-slate-100">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      Valle de Egüés · Estacionamiento Regulado
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">Justificante Digital de Estacionamiento</h2>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Matrícula:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{session?.license_plate || plate}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Calle / Zona:</span>
                      <span className="font-semibold text-slate-900">{session?.zone_name || selectedZone.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Estado:</span>
                      <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        VÁLIDO · AUTORIZADO
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Tiempo total amparado:</span>
                      <span className="font-bold text-slate-900">
                        {session?.is_extended ? '60 minutos (Base 30m + 30m Comercio)' : '30 minutos (Base)'}
                      </span>
                    </div>
                    {lastValidation && (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-blue-900 bg-blue-50/50 px-1 rounded">
                        <span className="text-blue-700 font-medium">Validado en comercio:</span>
                        <span className="font-bold">{lastValidation.merchant_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Código de control:</span>
                      <span className="font-mono text-[11px] text-slate-600">
                        {lastValidation?.verification_hash || 'CPK-9284F'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Verificable por la Policía Municipal en tiempo real</span>
                  </div>
                </div>

                <button 
                  onClick={() => setCurrentView('home')}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Cerrar Justificante
                </button>
              </div>
            )}

            {/* SUB-VISTA: PANTALLA PRINCIPAL (PARKING) */}
            {currentView === 'home' && (
              <div className="space-y-4">
                
                {/* SI HAY SESIÓN ACTIVA: RELOJ LIMPIO TIPO TELPARK */}
                {session ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                        Estacionamiento en curso
                      </span>
                      <h2 className="text-lg font-bold text-slate-900">{session.zone_name}</h2>
                      <p className="text-xs text-slate-500">Matrícula: <strong className="font-mono">{session.license_plate}</strong></p>
                    </div>

                    {/* Contador numérico gigante y claro */}
                    <div className="py-2">
                      <span className={`text-5xl font-mono font-bold tracking-tight ${
                        secondsRemaining < 600 ? 'text-amber-600 animate-pulse' : 'text-slate-900'
                      }`}>
                        {formatTime(secondsRemaining)}
                      </span>
                      <span className="block text-xs text-slate-500 mt-1">Tiempo restante</span>
                    </div>

                    {/* Banner de estado de ampliación */}
                    {session.is_extended ? (
                      <div className="bg-green-50 border border-green-200 text-green-800 p-2.5 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span><strong>+30 min sumados</strong> por compra en {lastValidation?.merchant_name}</span>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-left text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-blue-950">¿Necesitas más tiempo?</p>
                          <p className="text-blue-800 text-[11px]">Compra en cualquier tienda y suma +30 min.</p>
                        </div>
                        <button 
                          onClick={() => setCurrentView('scanner')}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-md text-xs transition"
                        >
                          Validar
                        </button>
                      </div>
                    )}

                    {/* Botones de acción */}
                    <div className="space-y-2 pt-1">
                      <button 
                        onClick={() => setCurrentView('ticket')}
                        className="w-full py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
                      >
                        <Receipt className="w-4 h-4 text-slate-600" />
                        <span>Ver justificante de estacionamiento</span>
                      </button>

                      <button 
                        onClick={() => { setSession(null); setLastValidation(null); }}
                        className="w-full py-2 text-xs text-red-600 hover:text-red-700 font-medium transition"
                      >
                        Finalizar estacionamiento
                      </button>
                    </div>
                  </div>
                ) : (
                  /* SI NO HAY SESIÓN ACTIVA: SELECTOR SIMPLE DE CALLE (TIPO TELPARK) */
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                      <div className="flex items-center space-x-2 text-slate-700 text-xs font-medium">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span>Ubicación actual detectada: <strong>Sarriguren</strong></span>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1.5">
                          Selecciona la calle donde vas a aparcar:
                        </label>
                        <div className="space-y-2">
                          {zones.map((z) => (
                            <div 
                              key={z.id}
                              onClick={() => setSelectedZone(z)}
                              className={`p-3 rounded-xl border text-xs cursor-pointer transition flex justify-between items-center ${
                                selectedZone.id === z.id 
                                  ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div>
                                <p className="font-bold text-slate-900">{z.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{z.schedule_info}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-blue-600 text-xs block">{z.base_minutes} min</span>
                                <span className="text-[10px] text-slate-500">Gratuito</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Botón Principal de Iniciar */}
                      <button 
                        onClick={() => startParking(selectedZone)}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition"
                      >
                        Aparcar ahora en {selectedZone.name}
                      </button>
                    </div>

                    {/* Explicación simple y humana (sin rollos de marketing) */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                      <p className="font-bold text-slate-900">¿Cómo funciona la Zona Rosa en Sarriguren?</p>
                      <ul className="text-slate-600 space-y-1 text-[11px] list-disc list-inside">
                        <li>El estacionamiento es <strong>100% gratuito</strong> con un límite inicial de 30 minutos.</li>
                        <li>Si haces cualquier compra en el comercio local, pides el código en caja y <strong>sumas otros 30 minutos gratis</strong>.</li>
                        <li>No necesitas ticket en papel: el sistema sincroniza con la Policía Municipal.</li>
                      </ul>
                    </div>

                    {/* Comercios adheridos */}
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-2">Comercios donde puedes ampliar tiempo:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {merchants.map(m => (
                          <div key={m.id} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                            <span className="text-[10px] text-blue-600 font-semibold">{m.category}</span>
                            <p className="font-bold text-slate-900 text-xs mt-0.5">{m.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{m.address}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

          </main>
        )}

        {/* ========================================================= */}
        {/* VISTA 2: COMERCIO (TÓTEM QR SIMPLE)                      */}
        {/* ========================================================= */}
        {appRole === 'merchant' && (
          <main className="flex-1 p-5 space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Punto de Venta Oficial
              </span>
              <h2 className="text-lg font-bold text-slate-900">Tótem de Validación</h2>
              <p className="text-xs text-slate-500">Muestra este código al cliente tras su compra</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <label className="text-slate-600 font-semibold block mb-1">Comercio actual:</label>
              <select 
                value={selectedMerchant.id}
                onChange={(e) => {
                  const m = merchants.find(item => item.id === e.target.value);
                  if (m) setSelectedMerchant(m);
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded font-bold text-slate-900"
              >
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.category})</option>
                ))}
              </select>
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base">{selectedMerchant.name}</h3>
              <p className="text-xs text-blue-600 font-medium">Validación +30 Minutos Zona Rosa</p>

              <div className="w-52 h-52 bg-slate-50 p-4 border border-slate-200 rounded-xl mx-auto flex flex-col items-center justify-center">
                <QrCode className="w-40 h-40 text-slate-900" />
              </div>

              <p className="text-xs text-slate-500">
                El cliente escanea este código desde la app Compark para ampliar su estacionamiento sin coste.
              </p>
            </div>
          </main>
        )}

        {/* ========================================================= */}
        {/* VISTA 3: POLICÍA / TELPARK (INSPECTOR SIMPLE)            */}
        {/* ========================================================= */}
        {appRole === 'police' && (
          <main className="flex-1 p-5 space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Control Municipal
              </span>
              <h2 className="text-lg font-bold text-slate-900">Inspección de Matrícula</h2>
              <p className="text-xs text-slate-500">Comprueba si un vehículo tiene tiempo ampliado por compra</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="text-xs font-bold text-slate-800 block">Matrícula a consultar:</label>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder="Ej: 7842 MKL"
                  value={policePlate}
                  onChange={(e) => setPolicePlate(e.target.value.toUpperCase())}
                  className="flex-1 p-3 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 uppercase text-center"
                />
                <button 
                  onClick={handlePoliceCheck}
                  className="px-4 bg-blue-600 text-white rounded-lg font-bold text-xs"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className="flex space-x-2">
                <button 
                  onClick={() => setPolicePlate('7842 MKL')}
                  className="text-[11px] text-blue-600 underline font-mono"
                >
                  Probar 7842 MKL
                </button>
              </div>
            </div>

            {policeResult && (
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-2 text-xs shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-mono font-bold text-base text-slate-900">{policeResult.plate}</span>
                  {policeResult.authorized ? (
                    <span className="bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded border border-green-200 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>NO MULTAR</span>
                    </span>
                  ) : (
                    <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded border border-red-200 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>TIEMPO AGOTADO</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-slate-600">
                  <p>Estado: <strong className="text-slate-900">Autorizado (+30 min por compra local)</strong></p>
                  <p>Comercio: <strong className="text-slate-900">{policeResult.merchant}</strong></p>
                  <p>Tiempo restante: <strong className="text-blue-700 font-mono">{policeResult.minutes} min</strong></p>
                  <p>Ubicación: <strong className="text-slate-900">{policeResult.zone}</strong></p>
                </div>
              </div>
            )}
          </main>
        )}

      </div>
    </div>
  );
}
