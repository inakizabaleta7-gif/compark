import { useState, useEffect } from 'react';
import { 
  Car, Clock, MapPin, QrCode, ShieldCheck, BarChart3, 
  Store, CheckCircle2, ChevronRight, 
  Sparkles, Compass, Building2, Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from './lib/supabase';
import type { ParkingZone, Merchant, ParkingSession, ValidationRecord } from './types';

// Fallback initial data
const DEFAULT_ZONES: ParkingZone[] = [
  {
    id: 'zr-rn',
    code: 'ZR-RN',
    name: 'Avda. Reino de Navarra',
    municipality: 'Valle de Egüés',
    zone_type: 'zona_rosa_comercial',
    base_minutes: 30,
    max_extension_minutes: 30,
    schedule_info: 'L-V: 10-14h y 17-20h | S: 9-14h',
    is_active: true
  },
  {
    id: 'zr-er',
    code: 'ZR-ER',
    name: 'Avda. Erripagaña',
    municipality: 'Valle de Egüés',
    zone_type: 'zona_rosa_comercial',
    base_minutes: 30,
    max_extension_minutes: 30,
    schedule_info: 'L-V: 10-14h y 17-20h | S: 9-14h',
    is_active: true
  },
  {
    id: 'zr-cs',
    code: 'ZR-CS',
    name: 'Centro de Salud / Ayto',
    municipality: 'Valle de Egüés',
    zone_type: 'zona_rosa_servicios',
    base_minutes: 90,
    max_extension_minutes: 0,
    schedule_info: 'L-V: 7:30-14:30h',
    is_active: true
  }
];

const DEFAULT_MERCHANTS: Merchant[] = [
  {
    id: 'm-1',
    name: 'Panadería & Café Sarriguren',
    category: 'Alimentación & Café',
    address: 'Av. Reino de Navarra, 8',
    lat: 42.8122,
    lng: -1.6085,
    qr_token: 'panaderia_sarriguren_token_01',
    is_active: true
  },
  {
    id: 'm-2',
    name: 'Farmacia Egüés 24h',
    category: 'Salud & Bienestar',
    address: 'Av. Reino de Navarra, 16',
    lat: 42.8135,
    lng: -1.6072,
    qr_token: 'farmacia_egues_token_02',
    is_active: true
  },
  {
    id: 'm-3',
    name: 'Óptica y Visión Valle',
    category: 'Servicios Ópticos',
    address: 'Av. Erripagaña, 24',
    lat: 42.8180,
    lng: -1.6150,
    qr_token: 'optica_valle_token_03',
    is_active: true
  },
  {
    id: 'm-4',
    name: 'Carnicería Tradición Navarra',
    category: 'Alimentación local',
    address: 'Bardenas Reales, 12',
    lat: 42.8115,
    lng: -1.6095,
    qr_token: 'carniceria_navarra_token_04',
    is_active: true
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'timer' | 'qr' | 'pass' | 'analytics'>('map');
  const [plate, setPlate] = useState('7842 MKL');
  const [isEditingPlate, setIsEditingPlate] = useState(false);
  const [newPlateInput, setNewPlateInput] = useState(plate);

  const [zones, setZones] = useState<ParkingZone[]>(DEFAULT_ZONES);
  const [merchants, setMerchants] = useState<Merchant[]>(DEFAULT_MERCHANTS);
  const [selectedZone, setSelectedZone] = useState<ParkingZone>(DEFAULT_ZONES[0]);

  // Parking session state
  const [session, setSession] = useState<ParkingSession | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [lastValidation, setLastValidation] = useState<ValidationRecord | null>(null);

  // Fetch real data from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data: zonesData } = await supabase.from('parking_zones').select('*');
        if (zonesData && zonesData.length > 0) setZones(zonesData);

        const { data: merchantsData } = await supabase.from('merchants').select('*');
        if (merchantsData && merchantsData.length > 0) setMerchants(merchantsData);
      } catch (err) {
        console.log('Using local seed data:', err);
      }
    }
    loadData();
  }, []);

  // Timer interval countdown
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
    const totalMinutes = zone.base_minutes;
    const now = new Date();
    const expires = new Date(now.getTime() + totalMinutes * 60 * 1000);

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
    setSecondsRemaining(totalMinutes * 60);
    setActiveTab('timer');

    // Trigger subtle haptic / alert
    if (navigator.vibrate) navigator.vibrate([100]);
  };

  const handleValidatePurchase = (merchant: Merchant) => {
    if (!session) return;

    // Add 30 minutes (1800 seconds)
    const extraSeconds = 30 * 60;
    setSecondsRemaining(prev => prev + extraSeconds);
    
    const updatedExpires = new Date(new Date(session.expires_at).getTime() + extraSeconds * 1000);
    setSession({
      ...session,
      is_extended: true,
      status: 'extended',
      expires_at: updatedExpires.toISOString()
    });

    const valRecord: ValidationRecord = {
      id: 'val-' + Math.random().toString(36).substring(2, 9),
      session_id: session.id,
      merchant_id: merchant.id,
      merchant_name: merchant.name,
      minutes_added: 30,
      validated_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      verification_hash: 'CPK-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    };
    setLastValidation(valRecord);

    // Fire confetti celebration
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7', '#38bdf8']
    });

    setActiveTab('pass');
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = session ? Math.min(100, (secondsRemaining / (session.is_extended ? 3600 : 1800)) * 100) : 0;
  const isUrgent = secondsRemaining < 600 && secondsRemaining > 0; // Less than 10 mins

  return (
    <div className="flex justify-center min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile Device Frame */}
      <div className="w-full max-w-md min-h-screen bg-slate-900 flex flex-col shadow-2xl relative border-x border-slate-800">
        
        {/* Top Android Status Bar Simulation */}
        <div className="px-6 pt-3 pb-2 flex justify-between items-center text-xs text-slate-400 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
          <span className="font-semibold text-slate-300">11:42</span>
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">Valle de Egüés</span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          </div>
        </div>

        {/* Brand App Bar */}
        <header className="px-5 py-3.5 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 flex justify-between items-center sticky top-7 z-40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="font-bold text-lg tracking-tight text-white">Compark</h1>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">Beta</span>
              </div>
              <p className="text-[11px] text-slate-400">Sarriguren & Comercio Local</p>
            </div>
          </div>

          {/* Vehicle License Plate Pill */}
          <div className="relative">
            {isEditingPlate ? (
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-emerald-500">
                <input 
                  type="text" 
                  value={newPlateInput}
                  onChange={(e) => setNewPlateInput(e.target.value.toUpperCase())}
                  className="bg-transparent w-20 text-xs font-mono font-bold text-center outline-none text-white"
                  maxLength={8}
                />
                <button 
                  onClick={() => { setPlate(newPlateInput); setIsEditingPlate(false); }}
                  className="bg-emerald-500 text-slate-950 text-xs px-2 py-0.5 rounded font-bold"
                >
                  OK
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditingPlate(true)}
                className="flex items-center space-x-1.5 bg-slate-800/90 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs font-mono font-semibold transition"
                title="Toca para cambiar matrícula"
              >
                <span className="text-[10px] text-slate-400">ES</span>
                <span className="text-emerald-400 font-bold">{plate}</span>
              </button>
            )}
          </div>
        </header>

        {/* MAIN BODY CONTENT AREA */}
        <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">

          {/* TAB 1: EXPLORAR / MAPA */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              
              {/* Active Banner if parked */}
              {session && (
                <div 
                  onClick={() => setActiveTab('timer')}
                  className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer shadow-lg hover:border-emerald-400 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Clock className="w-5 h-5 animate-spin-slow" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-emerald-300">Aparcamiento Activo</span>
                        {session.is_extended && (
                          <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 rounded font-bold">+30 min extra</span>
                        )}
                      </div>
                      <p className="text-lg font-mono font-bold text-white">{formatTimer(secondsRemaining)}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-emerald-400" />
                </div>
              )}

              {/* Sarriguren Interactive Map Mockup */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-56 flex flex-col justify-between p-4 shadow-inner">
                {/* Visual grid / road simulation */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="w-full h-full bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -translate-y-1/2 rotate-12"></div>
                  <div className="absolute top-0 bottom-0 left-1/3 w-4 bg-slate-700 rotate-6"></div>
                </div>

                {/* Map status chip */}
                <div className="relative z-10 flex justify-between items-start">
                  <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-xs font-medium text-slate-200">Sarriguren Centro</span>
                  </div>

                  <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-lg text-xs flex items-center space-x-1.5 font-medium">
                    <Flame className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Alta rotación</span>
                  </div>
                </div>

                {/* Hotspot pins on map */}
                <div className="relative z-10 space-y-2">
                  <div className="bg-slate-900/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-700 text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="font-semibold text-slate-200">Zona detectada por GPS:</p>
                        <p className="text-[11px] text-slate-400">{selectedZone.name}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {selectedZone.base_minutes} min gratis
                    </span>
                  </div>
                </div>
              </div>

              {/* Zone Selector */}
              <div>
                <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-2 px-1">
                  Zonas Reguladas en Valle de Egüés
                </h2>
                <div className="space-y-2">
                  {zones.map((zone) => (
                    <div 
                      key={zone.id}
                      onClick={() => setSelectedZone(zone)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        selectedZone.id === zone.id 
                          ? 'bg-slate-800/90 border-emerald-500 shadow-md shadow-emerald-950/50' 
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          zone.zone_type === 'zona_rosa_comercial'
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {zone.code.split('-')[1]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{zone.name}</p>
                          <p className="text-xs text-slate-400">{zone.schedule_info}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-emerald-400 block">{zone.base_minutes} min</span>
                        {zone.max_extension_minutes > 0 ? (
                          <span className="text-[10px] text-slate-400">+30 min con compra</span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Sin ampliación</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Park Button CTA */}
              <button 
                onClick={() => startParking(selectedZone)}
                className="w-full py-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 text-base transition transform active:scale-98"
              >
                <Car className="w-5 h-5 text-slate-950" />
                <span>Iniciar Estacionamiento en {selectedZone.name.split('(')[0]}</span>
              </button>

              {/* Local Merchants Showcase */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2 px-1">
                  <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                    Comercios que amplían tu tiempo (+30m)
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {merchants.map((m) => (
                    <div key={m.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-semibold">{m.category}</span>
                        <p className="text-xs font-bold text-white leading-snug mt-0.5">{m.name}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 truncate">{m.address}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MI PARKING (TEMPORIZADOR CIRCULAR) */}
          {activeTab === 'timer' && (
            <div className="space-y-5 text-center pt-2">
              {!session ? (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
                  <Clock className="w-12 h-12 text-slate-500 mx-auto" />
                  <div>
                    <h3 className="font-bold text-white text-lg">No tienes estacionamiento activo</h3>
                    <p className="text-xs text-slate-400 mt-1">Selecciona una zona en el mapa para iniciar tu reloj de Zona Rosa.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('map')}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Ir al Mapa
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                      {session.zone_name}
                    </span>
                    <h2 className="text-2xl font-bold text-white">Tiempo de Estacionamiento</h2>
                  </div>

                  {/* Circular Timer Visual */}
                  <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle 
                        cx="50" cy="50" r="42" 
                        className="text-slate-800 stroke-current" 
                        strokeWidth="8" fill="transparent" 
                      />
                      {/* Active progress circle */}
                      <circle 
                        cx="50" cy="50" r="42" 
                        className={`${isUrgent ? 'text-amber-500' : 'text-emerald-500'} stroke-current transition-all duration-1000`} 
                        strokeWidth="8" 
                        strokeDasharray="264" 
                        strokeDashoffset={264 - (264 * progressPercentage) / 100}
                        strokeLinecap="round" 
                        fill="transparent" 
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Restante</span>
                      <span className={`text-5xl font-mono font-black my-1 ${isUrgent ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                        {formatTimer(secondsRemaining)}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                        {session.license_plate}
                      </span>
                    </div>
                  </div>

                  {/* Alert Pill if extended or warning */}
                  {session.is_extended ? (
                    <div className="bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-xl flex items-center justify-center space-x-2 text-emerald-300 text-xs">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span><strong>¡Ampliación aplicada!</strong> +30 minutos validados en comercio local.</span>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-left text-xs">
                      <div className="flex items-center space-x-2.5">
                        <Store className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="font-semibold text-white">¿Necesitas más tiempo?</p>
                          <p className="text-slate-400 text-[11px]">Compra en cualquier tienda local y suma +30 min.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('qr')}
                        className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-400 transition"
                      >
                        Validar
                      </button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    {!session.is_extended && (
                      <button 
                        onClick={() => setActiveTab('qr')}
                        className="w-full py-3.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center space-x-2 text-sm transition"
                      >
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        <span>Escanear QR de Comercio (+30 min)</span>
                      </button>
                    )}

                    <button 
                      onClick={() => setActiveTab('pass')}
                      className="w-full py-3.5 rounded-xl font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 flex items-center justify-center space-x-2 text-sm transition shadow-lg shadow-emerald-500/20"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-950" />
                      <span>Ver Justificante Oficial de Estacionamiento</span>
                    </button>

                    <button 
                      onClick={() => { setSession(null); setActiveTab('map'); }}
                      className="w-full py-2.5 text-xs text-red-400 hover:text-red-300 transition"
                    >
                      Finalizar y liberar plaza
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: ESCÁNER QR (PROOF OF SHOPPING) */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white">Validar en Comercio Local</h2>
                <p className="text-xs text-slate-400">Escanea el código QR en caja al realizar cualquier compra.</p>
              </div>

              {/* Simulated Camera Viewfinder */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-slate-950 h-64 flex flex-col items-center justify-center p-4">
                {/* Viewfinder borders */}
                <div className="w-44 h-44 border-2 border-emerald-400 rounded-xl relative flex items-center justify-center bg-slate-900/40">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400"></div>

                  <div className="w-full h-0.5 bg-emerald-400/80 animate-bounce"></div>
                  <QrCode className="w-20 h-20 text-slate-700 absolute opacity-30" />
                </div>
                <p className="text-[11px] text-slate-400 mt-3 font-mono">Enfoca el QR del mostrador</p>
              </div>

              {/* Fast test simulators for hackathon demo */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Simular escaneo en comercios del Valle:
                </p>
                <div className="space-y-2">
                  {merchants.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleValidatePurchase(m)}
                      className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between text-left transition"
                    >
                      <div className="flex items-center space-x-3">
                        <Store className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="text-xs font-bold text-white">{m.name}</p>
                          <p className="text-[10px] text-slate-400">{m.address}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                        +30 min
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: JUSTIFICANTE OFICIAL (AMPARO POLICIAL / TELPARK) */}
          {activeTab === 'pass' && (
            <div className="space-y-4 pt-1">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Ayuntamiento del Valle de Egüés
                </span>
                <h2 className="text-xl font-bold text-white">Justificante Digital de Estacionamiento</h2>
                <p className="text-xs text-slate-400">Válido ante agentes de Policía Municipal y control Telpark</p>
              </div>

              {/* Official Ticket Card */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Matrícula amparada</span>
                    <p className="text-2xl font-mono font-black text-white tracking-wider">{session?.license_plate || plate}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Estado</span>
                    <p className="text-xs font-bold text-emerald-400 flex items-center justify-end space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>AUTORIZADO</span>
                    </p>
                  </div>
                </div>

                <div className="py-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Zona de Estacionamiento:</span>
                    <span className="font-semibold text-white">{session?.zone_name || selectedZone.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Límite Oficial Máximo:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {session?.is_extended ? '60 minutos (Ampliado)' : '30 minutos (Estándar)'}
                    </span>
                  </div>
                  {lastValidation && (
                    <div className="flex justify-between border-t border-slate-800/80 pt-2 text-emerald-400">
                      <span>Comercio Validador:</span>
                      <span className="font-semibold text-right">{lastValidation.merchant_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hash Criptográfico de Control:</span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {lastValidation?.verification_hash || 'CPK-981F42A'}
                    </span>
                  </div>
                </div>

                {/* QR Code Validation representation */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 bg-white p-1 rounded-lg flex items-center justify-center">
                      <QrCode className="w-10 h-10 text-slate-950" />
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      <p className="font-bold text-slate-200">Verificable por OCR / LPR</p>
                      <p>Protocolo APDS v2.4</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Sello {new Date().toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setActiveTab('timer')}
                className="w-full py-3 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 transition"
              >
                Volver al Temporizador
              </button>
            </div>
          )}

          {/* TAB 5: PANEL AYUNTAMIENTO & ANALÍTICA */}
          {activeTab === 'analytics' && (
            <div className="space-y-4 pt-1">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                  Panel de Movilidad Inteligente
                </span>
                <h2 className="text-xl font-bold text-white">Valle de Egüés / Smart City</h2>
                <p className="text-xs text-slate-400">Telemetría en tiempo real de rotación y comercio</p>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Vehículos rotados hoy</span>
                  <span className="text-2xl font-black text-white">418</span>
                  <span className="text-[10px] text-emerald-400 block mt-1">+24% vs semana pasada</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Validaciones de comercio</span>
                  <span className="text-2xl font-black text-emerald-400">182</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Ticket medio 18,40 €</span>
                </div>
              </div>

              {/* Congestion by Street Bar Chart */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Nivel de Saturación por Eje Comercial
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300">Av. Reino de Navarra (Tramos 1-4)</span>
                      <span className="text-amber-400 font-bold">68% ocupación</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full w-[68%] rounded-full"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300">Av. Erripagaña</span>
                      <span className="text-emerald-400 font-bold">42% ocupación</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full w-[42%] rounded-full"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300">Entorno Centro de Salud</span>
                      <span className="text-red-400 font-bold">89% ocupación</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-red-400 h-full w-[89%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Economic impact badge */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 text-xs text-slate-300 flex items-center space-x-3">
                <Building2 className="w-6 h-6 text-blue-400 flex-shrink-0" />
                <p>
                  <strong>Impacto municipal:</strong> El 43% de los usuarios de Gorraiz y pueblos del valle declaran haber comprado en Sarriguren gracias a los +30 min extra.
                </p>
              </div>
            </div>
          )}

        </main>

        {/* BOTTOM ANDROID NAVIGATION BAR */}
        <nav className="fixed bottom-0 w-full max-w-md bg-slate-950/90 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex justify-around items-center z-50">
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition ${
              activeTab === 'map' ? 'text-emerald-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px]">Explorar</span>
          </button>

          <button 
            onClick={() => setActiveTab('timer')}
            className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition relative ${
              activeTab === 'timer' ? 'text-emerald-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px]">Mi Parking</span>
            {session && (
              <span className="w-2 h-2 bg-emerald-400 rounded-full absolute top-1 right-2"></span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('qr')}
            className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition ${
              activeTab === 'qr' ? 'text-emerald-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span className="text-[10px]">Validar QR</span>
          </button>

          <button 
            onClick={() => setActiveTab('pass')}
            className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition ${
              activeTab === 'pass' ? 'text-emerald-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px]">Justificante</span>
          </button>

          <button 
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition ${
              activeTab === 'analytics' ? 'text-blue-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px]">Ayto.</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
