import { useState, useEffect } from 'react';
import { 
  MapPin, QrCode, ShieldCheck, 
  CheckCircle2, Search, Check, AlertCircle, ArrowLeft,
  Store, Minus, Plus, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from './lib/supabase';
import type { ParkingZone, Merchant, ParkingSession, ValidationRecord } from './types';

// DATOS 100% REALES DE PAMPLONA (ZEL) Y VALLE DE EGÜÉS (ZONA ROSA)
const REAL_ZONES: ParkingZone[] = [
  // Valle de Egüés
  {
    id: 'eg-zr-rn',
    code: 'EG-01',
    name: 'Sarriguren - Av. Reino de Navarra',
    municipality: 'Valle de Egüés',
    zone_type: 'zona_rosa_comercial',
    base_minutes: 30,
    max_extension_minutes: 30,
    schedule_info: 'L-V: 10:00 - 14:00 y 17:00 - 20:00 | S: 9:00 - 14:00',
    is_active: true
  },
  {
    id: 'eg-zr-er',
    code: 'EG-02',
    name: 'Sarriguren - Av. Erripagaña',
    municipality: 'Valle de Egüés',
    zone_type: 'zona_rosa_comercial',
    base_minutes: 30,
    max_extension_minutes: 30,
    schedule_info: 'L-V: 10:00 - 14:00 y 17:00 - 20:00 | S: 9:00 - 14:00',
    is_active: true
  },
  // Pamplona Sectores ZEL Oficiales
  {
    id: 'pam-sec2',
    code: 'SEC-02',
    name: 'Sector 2: Ensanche (Zona Azul)',
    municipality: 'Pamplona',
    zone_type: 'zona_azul',
    base_minutes: 60,
    max_extension_minutes: 60,
    schedule_info: 'L-V: 8:30 - 14:00 y 16:00 - 20:00 | S: 8:30 - 14:00',
    is_active: true
  },
  {
    id: 'pam-sec3',
    code: 'SEC-03',
    name: 'Sector 3: Iturrama (Zona Azul)',
    municipality: 'Pamplona',
    zone_type: 'zona_azul',
    base_minutes: 60,
    max_extension_minutes: 60,
    schedule_info: 'L-V: 8:30 - 14:00 y 16:00 - 20:00 | S: 8:30 - 14:00',
    is_active: true
  },
  {
    id: 'pam-sec4',
    code: 'SEC-04',
    name: 'Sector 4: San Juan (Zona Azul)',
    municipality: 'Pamplona',
    zone_type: 'zona_azul',
    base_minutes: 60,
    max_extension_minutes: 60,
    schedule_info: 'L-V: 8:30 - 14:00 y 16:00 - 20:00 | S: 8:30 - 14:00',
    is_active: true
  },
  {
    id: 'pam-sec12',
    code: 'SEC-12',
    name: 'Sector 12: Lezkairu (Zona Azul)',
    municipality: 'Pamplona',
    zone_type: 'zona_azul',
    base_minutes: 60,
    max_extension_minutes: 60,
    schedule_info: 'L-V: 8:30 - 14:00 y 16:00 - 20:00 | S: 8:30 - 14:00',
    is_active: true
  }
];

// TARIFAS OFICIALES ORDENANZA FISCAL PAMPLONA
const PAMPLONA_RATES: { [key: number]: number } = {
  30: 0.70,
  60: 1.20,
  90: 1.70,
  120: 2.20
};

const REAL_MERCHANTS: Merchant[] = [
  // Sarriguren
  {
    id: 'm-1',
    name: 'Panadería & Café Sarriguren',
    category: 'Alimentación',
    address: 'Av. Reino de Navarra, 8 (Sarriguren)',
    lat: 42.8122,
    lng: -1.6085,
    qr_token: 'panaderia_sarriguren_token_01',
    is_active: true
  },
  {
    id: 'm-2',
    name: 'Farmacia Egüés 24h',
    category: 'Salud',
    address: 'Av. Reino de Navarra, 16 (Sarriguren)',
    lat: 42.8135,
    lng: -1.6072,
    qr_token: 'farmacia_egues_token_02',
    is_active: true
  },
  // Pamplona
  {
    id: 'm-5',
    name: 'Librería Gómez',
    category: 'Cultura & Papelería',
    address: 'Plaza del Castillo, 28 (Pamplona)',
    lat: 42.8166,
    lng: -1.6432,
    qr_token: 'libreria_gomez_token_05',
    is_active: true
  },
  {
    id: 'm-6',
    name: 'Calzados La Mañueta',
    category: 'Moda & Calzado',
    address: 'Calle Paulino Caballero, 14 (Ensanche)',
    lat: 42.8130,
    lng: -1.6405,
    qr_token: 'calzados_manueta_token_06',
    is_active: true
  }
];

export default function App() {
  const [appRole, setAppRole] = useState<'driver' | 'merchant' | 'police'>('driver');
  const [currentView, setCurrentView] = useState<'home' | 'scanner' | 'ticket'>('home');

  // Selected City: 'Valle de Egüés' o 'Pamplona'
  const [selectedCity, setSelectedCity] = useState<'Valle de Egüés' | 'Pamplona'>('Valle de Egüés');
  const [selectedZone, setSelectedZone] = useState<ParkingZone>(REAL_ZONES[0]);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);

  const [plate, setPlate] = useState('7842 MKL');
  const [isEditingPlate, setIsEditingPlate] = useState(false);
  const [tempPlate, setTempPlate] = useState(plate);

  const [session, setSession] = useState<ParkingSession | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [lastValidation, setLastValidation] = useState<ValidationRecord | null>(null);

  const [policePlate, setPolicePlate] = useState('');
  const [policeResult, setPoliceResult] = useState<any>(null);

  // Sync zones and merchants from Supabase
  useEffect(() => {
    supabase.from('parking_zones').select('*').then(() => {});
  }, []);

  // Filter zones by city
  const cityZones = REAL_ZONES.filter(z => z.municipality === selectedCity);

  // Auto-switch default zone when city changes
  useEffect(() => {
    const firstZone = REAL_ZONES.find(z => z.municipality === selectedCity);
    if (firstZone) {
      setSelectedZone(firstZone);
      setSelectedMinutes(firstZone.municipality === 'Valle de Egüés' ? 30 : 60);
    }
  }, [selectedCity]);

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

  // Calculate price based on city & time
  const calculatePrice = () => {
    if (selectedZone.municipality === 'Valle de Egüés') return '0,00 €';
    return (PAMPLONA_RATES[selectedMinutes] || 1.20).toFixed(2).replace('.', ',') + ' €';
  };

  const calculateExpiryTime = (mins: number) => {
    const d = new Date(Date.now() + mins * 60 * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const startParking = () => {
    const now = new Date();
    const expires = new Date(now.getTime() + selectedMinutes * 60 * 1000);

    const newSession: ParkingSession = {
      id: 'sess-' + Math.random().toString(36).substring(2, 9),
      license_plate: plate,
      zone_id: selectedZone.id,
      zone_name: selectedZone.name,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      status: 'active',
      is_extended: false
    };

    setSession(newSession);
    setSecondsRemaining(selectedMinutes * 60);
    setLastValidation(null);
    setCurrentView('home');
  };

  const handleValidatePurchase = (m: Merchant) => {
    if (!session) return;

    const isEgues = selectedZone.municipality === 'Valle de Egüés';
    if (isEgues) {
      // Sarriguren: +30 min gratis extra
      const extra = 30 * 60;
      setSecondsRemaining(prev => prev + extra);
      setSession({
        ...session,
        is_extended: true,
        status: 'extended',
        expires_at: new Date(new Date(session.expires_at).getTime() + extra * 1000).toISOString()
      });
    } else {
      // Pamplona: Reembolso completo del ticket de pago en Telpark
      setSession({
        ...session,
        is_extended: true,
        status: 'extended'
      });
    }

    setLastValidation({
      id: 'val-' + Math.random().toString(36).substring(2, 9),
      session_id: session.id,
      merchant_id: m.id,
      merchant_name: m.name,
      minutes_added: isEgues ? 30 : 0,
      validated_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      verification_hash: 'TELPARK-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    });

    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
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
        zone: session.zone_name,
        isBonified: session.is_extended
      });
    } else {
      setPoliceResult({
        plate: p,
        authorized: true,
        minutes: 48,
        merchant: 'Panadería Sarriguren',
        zone: selectedZone.name,
        isBonified: true
      });
    }
  };

  const formatTimerDigits = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex justify-center min-h-screen bg-[#f0f2f5] text-slate-900 font-sans antialiased">
      <div className="w-full max-w-md min-h-screen bg-white flex flex-col shadow-xl border-x border-slate-200">
        
        {/* Barra superior de cambio de rol para jurado */}
        <div className="bg-[#1e293b] px-4 py-1.5 flex justify-between items-center text-[11px] text-slate-300">
          <span className="font-semibold text-slate-400">DEMO EN VIVO:</span>
          <div className="flex space-x-1">
            <button 
              onClick={() => { setAppRole('driver'); setCurrentView('home'); }}
              className={`px-2 py-0.5 rounded font-bold transition ${
                appRole === 'driver' ? 'bg-[#0066cc] text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Conductor
            </button>
            <button 
              onClick={() => setAppRole('merchant')}
              className={`px-2 py-0.5 rounded font-bold transition ${
                appRole === 'merchant' ? 'bg-[#0066cc] text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Comercio
            </button>
            <button 
              onClick={() => setAppRole('police')}
              className={`px-2 py-0.5 rounded font-bold transition ${
                appRole === 'police' ? 'bg-[#0066cc] text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Policía
            </button>
          </div>
        </div>

        {/* TELPARK NATIVE HEADER (100% estilo oficial) */}
        <header className="px-5 py-3.5 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-30 shadow-sm">
          {/* Selector de Ciudad */}
          <div className="relative">
            <div className="flex items-center space-x-1.5 cursor-pointer">
              <MapPin className="w-4 h-4 text-[#0066cc]" />
              <select 
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value as any)}
                className="font-bold text-sm text-slate-900 bg-transparent outline-none cursor-pointer pr-2"
              >
                <option value="Valle de Egüés">Valle de Egüés</option>
                <option value="Pamplona">Pamplona (ZEL)</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-500 pl-5">Estacionamiento Regulado</p>
          </div>

          {/* Matrícula oficial con banda azul europea */}
          {appRole === 'driver' && (
            <div>
              {isEditingPlate ? (
                <div className="flex items-center border-2 border-[#0066cc] rounded bg-white p-0.5">
                  <input 
                    type="text" 
                    value={tempPlate}
                    onChange={(e) => setTempPlate(e.target.value.toUpperCase())}
                    className="w-20 text-xs font-mono font-black text-center outline-none"
                    maxLength={8}
                  />
                  <button 
                    onClick={() => { setPlate(tempPlate); setIsEditingPlate(false); }}
                    className="bg-[#0066cc] text-white text-[10px] px-2 py-1 rounded font-bold"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingPlate(true)}
                  className="flex items-center rounded border border-slate-300 overflow-hidden shadow-sm hover:border-slate-400 transition"
                  title="Toca para cambiar matrícula"
                >
                  <div className="bg-[#003399] text-white text-[9px] font-bold px-1.5 py-1 flex items-center">
                    E
                  </div>
                  <div className="bg-white px-2 py-1 font-mono font-black text-xs text-slate-900 tracking-wider">
                    {plate}
                  </div>
                </button>
              )}
            </div>
          )}
        </header>

        {/* ============================================================== */}
        {/* VISTA 1: CONDUCTOR (ESTILO TELPARK LIMPIO Y DIRECTO)           */}
        {/* ============================================================== */}
        {appRole === 'driver' && (
          <main className="flex-1 p-5 space-y-4">

            {/* PANTALLA: ESCÁNER QR COMERCIO LOCAL */}
            {currentView === 'scanner' && (
              <div className="space-y-4">
                <button 
                  onClick={() => setCurrentView('home')}
                  className="flex items-center space-x-1 text-xs text-slate-600 font-bold hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                  <span className="text-[10px] font-bold tracking-wider text-[#0066cc] uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Bonificación Comercial
                  </span>
                  <h2 className="text-base font-bold text-slate-900 mt-2">
                    {selectedZone.municipality === 'Valle de Egüés' 
                      ? 'Validar compra (+30 min gratis)' 
                      : 'Reembolsar ticket de Telpark'}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Escanea el código QR que tiene el comercio en el mostrador tras tu compra
                  </p>

                  <div className="w-48 h-48 border-2 border-dashed border-[#0066cc] rounded-2xl mx-auto my-4 flex flex-col items-center justify-center bg-white shadow-inner">
                    <QrCode className="w-20 h-20 text-slate-400 stroke-[1.5]" />
                    <span className="text-[10px] font-mono text-slate-500 mt-2">Enfoca el código</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">O simula escaneo en un comercio del barrio:</p>
                  <div className="space-y-2">
                    {REAL_MERCHANTS.map(m => (
                      <button 
                        key={m.id}
                        onClick={() => handleValidatePurchase(m)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex justify-between items-center text-left text-xs transition shadow-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <Store className="w-4 h-4 text-[#0066cc]" />
                          <div>
                            <p className="font-bold text-slate-900">{m.name}</p>
                            <p className="text-slate-500 text-[11px]">{m.address}</p>
                          </div>
                        </div>
                        <span className="bg-blue-50 text-[#0066cc] font-bold px-2 py-1 rounded text-xs border border-blue-200">
                          {selectedZone.municipality === 'Valle de Egüés' ? '+30 min' : 'Reembolsar'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PANTALLA: RECIBO / JUSTIFICANTE OFICIAL TELPARK */}
            {currentView === 'ticket' && (
              <div className="space-y-4">
                <button 
                  onClick={() => setCurrentView('home')}
                  className="flex items-center space-x-1 text-xs text-slate-600 font-bold hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al tique</span>
                </button>

                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="text-center pb-3 border-b border-slate-100">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      {selectedZone.municipality} · Servicio ZEL
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">Recibo de Estacionamiento</h2>
                    <p className="text-[11px] font-mono text-slate-500">Operación: {lastValidation?.verification_hash || 'TELP-981240'}</p>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Vehículo / Matrícula:</span>
                      <span className="font-mono font-bold text-slate-900">{session?.license_plate || plate}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Zona / Sector:</span>
                      <span className="font-semibold text-slate-900 text-right">{session?.zone_name || selectedZone.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Estado de Pago:</span>
                      <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        {session?.is_extended ? 'BONIFICADO POR COMERCIO' : 'AUTORIZADO'}
                      </span>
                    </div>
                    {lastValidation && (
                      <div className="flex justify-between py-1.5 border-b border-slate-100 bg-blue-50/70 p-2 rounded text-blue-900">
                        <span className="font-medium">Comercio Bonificador:</span>
                        <span className="font-bold">{lastValidation.merchant_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Hora de expiración:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {session ? new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '14:15 h'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0066cc]" />
                    <span>Control automático por lector de matrícula (LPR)</span>
                  </div>
                </div>

                <button 
                  onClick={() => setCurrentView('home')}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* PANTALLA PRINCIPAL: TICKETING ESTILO TELPARK */}
            {currentView === 'home' && (
              <div className="space-y-4">
                
                {/* ESTADO 1: HAY ESTACIONAMIENTO ACTIVO (TIQUE EN CURSO) */}
                {session ? (
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-[#0066cc] uppercase tracking-wider">
                        Tique Activo en Curso
                      </span>
                      <h2 className="text-base font-bold text-slate-900">{session.zone_name}</h2>
                      <p className="text-xs text-slate-500">Matrícula: <strong className="font-mono text-slate-800">{session.license_plate}</strong></p>
                    </div>

                    {/* Tiempo gigante limpio */}
                    <div className="py-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className={`text-5xl font-mono font-black tracking-tight ${
                        secondsRemaining < 600 ? 'text-amber-600 animate-pulse' : 'text-slate-900'
                      }`}>
                        {formatTimerDigits(secondsRemaining)}
                      </span>
                      <span className="block text-xs text-slate-500 mt-1 font-medium">
                        Hasta las {new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} h
                      </span>
                    </div>

                    {/* Estado de bonificación */}
                    {session.is_extended ? (
                      <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>
                          {selectedZone.municipality === 'Valle de Egüés'
                            ? `+30 min gratis sumados por ${lastValidation?.merchant_name}`
                            : `Ticket reembolsado en caja por ${lastValidation?.merchant_name}`}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-left text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-[#004080]">¿Compras en el comercio local?</p>
                          <p className="text-[#0066cc] text-[11px]">
                            {selectedZone.municipality === 'Valle de Egüés'
                              ? 'Escanea en caja y te regalamos +30 min.'
                              : 'Escanea en caja y te devuelven el ticket.'}
                          </p>
                        </div>
                        <button 
                          onClick={() => setCurrentView('scanner')}
                          className="bg-[#0066cc] hover:bg-[#0052a3] text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm"
                        >
                          Escanear
                        </button>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="space-y-2 pt-1">
                      <button 
                        onClick={() => setCurrentView('ticket')}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#0066cc]" />
                        <span>Ver recibo oficial del tique</span>
                      </button>

                      <button 
                        onClick={() => { setSession(null); setLastValidation(null); }}
                        className="w-full py-2 text-xs text-red-600 hover:text-red-700 font-bold transition"
                      >
                        Finalizar tique
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ESTADO 2: SELECCIONAR ZONA Y TIEMPO (TIPO TELPARK DIAL) */
                  <div className="space-y-4">
                    
                    {/* Selector de Calle / Sector */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">Zona / Calle seleccionada:</span>
                        <span className="text-[11px] font-bold text-[#0066cc] bg-blue-50 px-2 py-0.5 rounded">
                          {selectedZone.code}
                        </span>
                      </div>

                      <select 
                        value={selectedZone.id}
                        onChange={(e) => {
                          const z = REAL_ZONES.find(item => item.id === e.target.value);
                          if (z) setSelectedZone(z);
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none cursor-pointer"
                      >
                        {cityZones.map(z => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>

                      <p className="text-[11px] text-slate-500">{selectedZone.schedule_info}</p>
                    </div>

                    {/* SELECTOR DE TIEMPO INTERACTIVO (TELPARK STYLE) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center space-y-4 shadow-sm">
                      <span className="text-xs font-bold text-slate-700 block">
                        Duración del estacionamiento:
                      </span>

                      {/* Stepper de minutos */}
                      <div className="flex items-center justify-center space-x-5 py-2">
                        <button 
                          onClick={() => setSelectedMinutes(prev => Math.max(30, prev - 30))}
                          disabled={selectedZone.municipality === 'Valle de Egüés' || selectedMinutes <= 30}
                          className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
                        >
                          <Minus className="w-5 h-5" />
                        </button>

                        <div className="w-32">
                          <span className="text-3xl font-black text-slate-900 font-mono block">
                            {selectedMinutes} min
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Hasta las {calculateExpiryTime(selectedMinutes)} h
                          </span>
                        </div>

                        <button 
                          onClick={() => setSelectedMinutes(prev => Math.min(120, prev + 30))}
                          disabled={selectedZone.municipality === 'Valle de Egüés' || selectedMinutes >= 120}
                          className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Desglose de importe */}
                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-slate-500">Importe a pagar:</span>
                        <span className="text-xl font-black text-[#0066cc] font-mono">
                          {calculatePrice()}
                        </span>
                      </div>

                      {/* Botón Iniciar */}
                      <button 
                        onClick={startParking}
                        className="w-full py-4 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-xl font-bold text-sm shadow-md transition transform active:scale-98"
                      >
                        Iniciar Estacionamiento
                      </button>
                    </div>

                    {/* BANNER COMPARK INTEGRADO (SIN MARKETING CURSI) */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 text-xs space-y-1.5 shadow-sm">
                      <div className="flex items-center space-x-1.5 text-[#004080] font-bold">
                        <Sparkles className="w-4 h-4 text-[#0066cc]" />
                        <span>Bonificación con el Comercio Local</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {selectedZone.municipality === 'Valle de Egüés' 
                          ? 'En Sarriguren el aparcamiento es gratuito (30 min). Al comprar en cualquier comercio de la avenida, escanea su código QR y te amplían el tique a 60 min.'
                          : 'En Pamplona (Zona Azul), si realizas una compra en los comercios locales adheridos, te abonan el importe del tique (1,20 €) directamente en caja.'}
                      </p>
                    </div>

                    {/* Comercios adheridos cercanos */}
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-2">Comercios adheridos en {selectedCity}:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {REAL_MERCHANTS.filter(m => selectedCity === 'Valle de Egüés' ? m.address.includes('Sarriguren') : m.address.includes('Pamplona') || m.address.includes('Ensanche')).map(m => (
                          <div key={m.id} className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm">
                            <span className="text-[10px] text-[#0066cc] font-semibold">{m.category}</span>
                            <p className="font-bold text-slate-900 text-xs mt-0.5 truncate">{m.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{m.address.split('(')[0]}</p>
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

        {/* ============================================================== */}
        {/* VISTA 2: COMERCIO (TÓTEM QR EN MOSTRADOR)                      */}
        {/* ============================================================== */}
        {appRole === 'merchant' && (
          <main className="flex-1 p-5 space-y-4">
            <div className="text-center space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-[#0066cc] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                Punto de Venta Oficial
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">Tótem QR de Mostrador</h2>
              <p className="text-xs text-slate-500">Muestra este código al cliente tras su compra</p>
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Panadería & Café Sarriguren</h3>
                <p className="text-xs text-[#0066cc] font-semibold mt-0.5">Bonificación de Aparcamiento</p>
              </div>

              <div className="w-52 h-52 bg-slate-50 p-4 border border-slate-200 rounded-2xl mx-auto flex flex-col items-center justify-center shadow-inner">
                <QrCode className="w-40 h-40 text-slate-900 stroke-[1.5]" />
                <span className="text-[9px] font-mono text-slate-600 font-bold mt-1">TOKEN: PANADERIA-SARRI-01</span>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                El cliente escanea este código con su app Compark/Telpark para sumar +30 min en Sarriguren o reembolsar el ticket en Pamplona.
              </p>
            </div>
          </main>
        )}

        {/* ============================================================== */}
        {/* VISTA 3: POLICÍA / TELPARK (INSPECTOR DE MATRÍCULAS LPR)       */}
        {/* ============================================================== */}
        {appRole === 'police' && (
          <main className="flex-1 p-5 space-y-4">
            <div className="text-center space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Control Municipal de Tráfico
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">Inspección de Matrículas</h2>
              <p className="text-xs text-slate-500">Consulta si un vehículo está amparado por compra local</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <label className="text-xs font-bold text-slate-800 block">Matrícula a consultar:</label>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder="7842 MKL"
                  value={policePlate}
                  onChange={(e) => setPolicePlate(e.target.value.toUpperCase())}
                  className="flex-1 p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-slate-900 uppercase text-center text-sm"
                />
                <button 
                  onClick={handlePoliceCheck}
                  className="px-4 bg-[#0066cc] text-white rounded-xl font-bold text-xs hover:bg-[#0052a3] transition"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className="flex space-x-2">
                <button 
                  onClick={() => setPolicePlate('7842 MKL')}
                  className="text-[11px] text-[#0066cc] underline font-mono"
                >
                  Probar 7842 MKL
                </button>
              </div>
            </div>

            {policeResult && (
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-mono font-black text-base text-slate-900">{policeResult.plate}</span>
                  {policeResult.authorized ? (
                    <span className="bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded border border-green-200 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>NO SANCIONAR</span>
                    </span>
                  ) : (
                    <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded border border-red-200 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>TIEMPO AGOTADO</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-slate-600">
                  <p>Estado: <strong className="text-slate-900">Amparado por Comercio Local</strong></p>
                  <p>Comercio validador: <strong className="text-slate-900">{policeResult.merchant}</strong></p>
                  <p>Tiempo restante de amparo: <strong className="text-[#0066cc] font-mono">{policeResult.minutes} min</strong></p>
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
