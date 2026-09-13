import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Clock, Battery, Wifi, ShieldAlert, CheckCircle, Coffee, AlertOctagon, RefreshCw, StopCircle, Radio } from 'lucide-react';
import { api } from '../services/api';
import GoogleMapView from '../components/GoogleMapView';
import RiskMeter from '../components/RiskMeter';
import SafetyCheckModal from '../components/SafetyCheckModal';
import SafetyEventLog from '../components/SafetyEventLog';
import DemoControlCenterBar from '../components/DemoControlCenterBar';
import { useImpactSensor } from '../hooks/useImpactSensor';

export default function ActiveJourneyPage({ onOpenSOS }) {
  const navigate = useNavigate();
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // High Impact Phone Fall Sensor Handler
  const handleImpactFall = (accG) => {
    alert(`💥 HIGH IMPACT DETECTED (${accG.toFixed(1)} m/s²)! Emergency SOS activated automatically.`);
    onOpenSOS();
  };

  const { triggerSimulatedFall } = useImpactSensor(handleImpactFall);

  // Live Location State
  const [currentLoc, setCurrentLoc] = useState({ lat: 12.9716, lng: 77.5946, name: 'Live GPS Point' });
  const [locationHistory, setLocationHistory] = useState([]);
  const [telemetry, setTelemetry] = useState({ speed: 28, battery: 94, network: 'online' });

  // Polling & Simulation Timer Ref
  const pollTimer = useRef(null);
  const simStep = useRef(0);

  useEffect(() => {
    fetchActiveJourney();

    // Start 3-second polling interval for real-time backend updates
    pollTimer.current = setInterval(() => {
      fetchActiveJourneySilently();
    }, 3000);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const fetchActiveJourney = async () => {
    try {
      setLoading(true);
      const res = await api.getActiveJourney();
      if (res.success && res.journey) {
        setJourney(res.journey);
        if (res.journey.current_location) {
          setCurrentLoc({
            lat: res.journey.current_location.latitude || res.journey.start_location.lat,
            lng: res.journey.current_location.longitude || res.journey.start_location.lng,
            name: res.journey.current_location.name || 'Live GPS Telemetry'
          });
        }
        if (res.journey.active_safety_check) {
          setShowSafetyModal(true);
        }
      }
    } catch (err) {
      console.error('Error fetching active journey:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveJourneySilently = async () => {
    try {
      const res = await api.getActiveJourney();
      if (res.success && res.journey) {
        setJourney(res.journey);
        if (res.journey.current_location) {
          setCurrentLoc({
            lat: res.journey.current_location.latitude || res.journey.start_location.lat,
            lng: res.journey.current_location.longitude || res.journey.start_location.lng,
            name: res.journey.current_location.name || 'Live GPS Telemetry'
          });
        }
        if (res.journey.active_safety_check) {
          setShowSafetyModal(true);
        }
      }
    } catch (err) {
      console.error('Silent refresh error:', err);
    }
  };

  // Demo Control Handlers
  const handleTriggerSimEvent = async (eventType) => {
    if (!journey) return;
    try {
      setSimulating(true);
      
      // Calculate shifted coordinates based on anomaly event
      let newLat = currentLoc.lat;
      let newLng = currentLoc.lng;

      if (eventType === 'ROUTE_DEVIATION') {
        newLat += 0.008;
        newLng += 0.009;
      } else if (eventType === 'DIRECTION_CHANGE') {
        newLat -= 0.005;
        newLng -= 0.006;
      } else if (eventType === 'MULTIPLE_ANOMALIES') {
        newLat += 0.012;
        newLng += 0.015;
      }

      // Update location on backend
      await api.postLocation(journey.id, {
        latitude: newLat,
        longitude: newLng,
        speed: eventType === 'PROLONGED_STOP' ? 0 : 32,
        battery: telemetry.battery,
        network: telemetry.network
      });

      // Post simulation event payload
      const simRes = await api.triggerSimulation(journey.id, eventType);
      if (simRes.success) {
        setJourney(simRes.journey);
        setCurrentLoc({ lat: newLat, lng: newLng, name: `Simulated Anomaly (${eventType})` });
        if (simRes.journey.risk_level === 'AMBER' || simRes.journey.risk_level === 'RED') {
          setShowSafetyModal(true);
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateOffline = async () => {
    if (!journey) return;
    try {
      const res = await api.simulateOffline(journey.id);
      if (res.success) {
        fetchActiveJourneySilently();
      }
    } catch (err) {
      console.error('Error simulating offline:', err);
    }
  };

  const handleManualSafetyCheck = async () => {
    if (!journey) return;
    try {
      await api.handleSafetyCheck(journey.id, 'TRIGGER');
      setShowSafetyModal(true);
    } catch (err) {
      console.error('Error dispatching safety check:', err);
    }
  };

  const handleRespondSafe = async () => {
    if (!journey) return;
    try {
      await api.handleSafetyCheck(journey.id, 'SAFE');
      setShowSafetyModal(false);
      fetchActiveJourneySilently();
    } catch (err) {
      console.error('Error responding safe:', err);
    }
  };

  const handleRespondUnsafe = async () => {
    if (!journey) return;
    try {
      await api.handleSafetyCheck(journey.id, 'UNSAFE');
      setShowSafetyModal(false);
      fetchActiveJourneySilently();
    } catch (err) {
      console.error('Error responding unsafe:', err);
    }
  };

  const handleNoResponse = async () => {
    if (!journey) return;
    try {
      await api.handleSafetyCheck(journey.id, 'NO_RESPONSE');
      fetchActiveJourneySilently();
    } catch (err) {
      console.error('Error handling no response timeout:', err);
    }
  };

  const handleRespondBreak = async (mins) => {
    if (!journey) return;
    try {
      await api.handleSafetyCheck(journey.id, 'BREAK', mins);
      setShowSafetyModal(false);
      fetchActiveJourneySilently();
    } catch (err) {
      console.error('Error handling break:', err);
    }
  };

  const handleEndJourney = async () => {
    if (!journey) return;
    if (window.confirm('Are you sure you want to end this safe journey?')) {
      try {
        await api.endJourney(journey.id);
        navigate('/history');
      } catch (err) {
        console.error('Error ending journey:', err);
      }
    }
  };

  const handleUpdateTimeoutMins = async (mins) => {
    if (!journey) return;
    try {
      const res = await api.updateSafetyTimeout(journey.id, mins);
      if (res.success) {
        setJourney(prev => prev ? { ...prev, safety_timeout_mins: mins } : prev);
      }
    } catch (err) {
      console.error('Error updating safety timeout:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
        <p className="text-gray-300 font-bold text-base font-outfit">LOADING LIVE ACTIVE JOURNEY TELEMETRY...</p>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4 glass-panel rounded-3xl m-8">
        <Navigation className="w-12 h-12 text-gray-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Active Journey Found</h2>
        <p className="text-xs text-gray-400">Start a new journey to monitor live GPS, route deviations, and explainable AI risk scores.</p>
        <button
          onClick={() => navigate('/start')}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
        >
          START SAFE JOURNEY
        </button>
      </div>
    );
  }

  const isDeviated = journey?.simulated_anomalies?.includes('ROUTE_DEVIATION') || journey?.simulated_anomalies?.includes('MULTIPLE_ANOMALIES');
  const riskEval = journey?.risk_evaluation || { riskScore: 10, riskLevel: 'GREEN', reasons: [] };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
      
      {/* Top Demo Simulation Bar */}
      <DemoControlCenterBar
        activeJourneyId={journey.id}
        onTriggerEvent={handleTriggerSimEvent}
        onReset={() => handleTriggerSimEvent('RESET')}
        onSimulateOffline={handleSimulateOffline}
        onTriggerSafetyCheck={handleManualSafetyCheck}
        onTriggerSOS={onOpenSOS}
        onTriggerImpact={triggerSimulatedFall}
      />

      {/* Active Journey Top Banner Info */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              SAFETY MODE ACTIVE
            </span>
            {journey.is_offline && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                ⚠️ DEVICE OFFLINE
              </span>
            )}
          </div>
          <h2 className="text-xl font-extrabold text-white font-outfit">{journey.name}</h2>
          <p className="text-xs text-gray-300">
            From <strong className="text-emerald-400">{journey.start_location?.name}</strong> to <strong className="text-red-400">{journey.destination?.name}</strong>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRespondSafe}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>I'M SAFE</span>
          </button>

          <button
            onClick={() => setShowSafetyModal(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>SAFETY CHECK</span>
          </button>

          <button
            onClick={handleEndJourney}
            className="px-3.5 py-2 rounded-xl bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/40 text-gray-300 font-bold text-xs flex items-center gap-1.5"
          >
            <StopCircle className="w-4 h-4" />
            <span>END JOURNEY</span>
          </button>

          <button
            onClick={onOpenSOS}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-extrabold text-xs shadow-lg shadow-red-600/40 flex items-center gap-1.5 animate-pulse-glow"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>SOS</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Google Map + AI Risk Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Large Google Map (2 Columns) */}
        <div className="lg:col-span-2 min-h-[460px] h-[520px]">
          <GoogleMapView
            startLocation={journey.start_location}
            destination={journey.destination}
            currentLocation={currentLoc}
            locationHistory={journey.location_history || []}
            isDeviated={isDeviated}
            isOffline={journey.is_offline}
            riskLevel={riskEval.riskLevel}
            eta="18 Mins"
            distance="5.2 km"
            speed={`${telemetry.speed} km/h`}
          />
        </div>

        {/* Explainable AI Risk Score Gauge & Telemetry Sidebar */}
        <div className="space-y-6 flex flex-col justify-between">
          <RiskMeter
            riskScore={riskEval.riskScore}
            riskLevel={riskEval.riskLevel}
            reasons={riskEval.reasons}
            recommendedAction={riskEval.recommendedAction}
          />

          {/* Telemetry Hardware Stats */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Device Telemetry</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 space-y-1">
                <div className="text-gray-400">GPS Accuracy</div>
                <div className="font-bold text-emerald-400">± 8 Meters</div>
              </div>

              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 space-y-1">
                <div className="text-gray-400">Battery Status</div>
                <div className="font-bold text-white flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{telemetry.battery}%</span>
                </div>
              </div>

              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 space-y-1">
                <div className="text-gray-400">Network Signal</div>
                <div className="font-bold text-blue-400 flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-blue-400" />
                  <span>5G Cellular</span>
                </div>
              </div>

              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 space-y-1">
                <div className="text-gray-400">Movement Speed</div>
                <div className="font-bold text-cyan-400">{telemetry.speed} km/h</div>
              </div>
            </div>

            {/* Prolonged Activity Safety Check Duration Quick Switcher */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-300 font-bold">Safety Check Popup Interval:</span>
                <span className="text-cyan-400 font-extrabold font-mono">{journey.safety_timeout_mins || 10} Mins</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                {[2, 5, 10, 15].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleUpdateTimeoutMins(m)}
                    className={`py-1 rounded-lg font-bold border transition-colors ${
                      (journey.safety_timeout_mins || 10) === m
                        ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Safety Check Modal */}
      <SafetyCheckModal
        isOpen={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        triggerReason={riskEval.reasons?.map(r => r.text).join(', ')}
        timeoutMinutes={journey.safety_timeout_mins || 10}
        onRespondSafe={handleRespondSafe}
        onRespondUnsafe={handleRespondUnsafe}
        onRespondBreak={handleRespondBreak}
        onRespondExtend={(mins) => alert(`Journey extended by ${mins} minutes.`)}
        onTriggerSOS={onOpenSOS}
        onNoResponse={handleNoResponse}
        onUpdateTimeoutMins={handleUpdateTimeoutMins}
      />

    </div>
  );
}
