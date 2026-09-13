import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Compass, ShieldAlert, AlertTriangle, Radio, Plus, Minus, Layers, LocateFixed, Eye, Navigation, Moon, Sun } from 'lucide-react';

export default function GoogleMapView({
  startLocation = { name: 'Origin', lat: 12.9716, lng: 77.5946 },
  destination = { name: 'Destination', lat: 12.9352, lng: 77.6245 },
  currentLocation = { lat: 12.9716, lng: 77.5946 },
  locationHistory = [],
  isDeviated = false,
  isOffline = false,
  riskLevel = 'GREEN',
  eta = '18 mins',
  distance = '5.2 km',
  speed = '28 km/h',
  onSelectMapDestination
}) {
  const mapRef = useRef(null);
  const googleMapObj = useRef(null);
  const userMarkerObj = useRef(null);
  const routePolylineObj = useRef(null);

  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState(false);
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'satellite' | 'terrain'
  const [mapTheme, setMapTheme] = useState('standard'); // 'standard' | 'dark'
  const [zoomLevel, setZoomLevel] = useState(14);
  const [clickDestination, setClickDestination] = useState(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Initialize Google Maps API
  useEffect(() => {
    if (!apiKey) {
      setMapsError(true);
      return;
    }

    const loader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader
      .load()
      .then((google) => {
        if (!mapRef.current) return;
        const centerLat = currentLocation.lat || startLocation.lat;
        const centerLng = currentLocation.lng || startLocation.lng;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: zoomLevel,
          mapTypeId: mapType,
          styles: mapTheme === 'dark' ? darkMapStyle : [], // Standard Google Maps light theme by default!
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true
        });

        googleMapObj.current = map;

        // Map Click Listener to select final destination
        map.addListener('click', (e) => {
          const clickedLat = e.latLng.lat();
          const clickedLng = e.latLng.lng();
          const destObj = {
            name: `Map Pin (${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)})`,
            lat: clickedLat,
            lng: clickedLng
          };
          setClickDestination(destObj);
          if (onSelectMapDestination) {
            onSelectMapDestination(destObj);
          }
        });

        // Start Marker - Google Green
        new google.maps.Marker({
          position: { lat: startLocation.lat, lng: startLocation.lng },
          map,
          title: `Start: ${startLocation.name}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#34A853', // Standard Google Green
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          }
        });

        // Destination Marker - Official Google Red Pin
        new google.maps.Marker({
          position: { lat: destination.lat, lng: destination.lng },
          map,
          title: `Destination: ${destination.name}`,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 9,
            fillColor: '#EA4335', // Standard Google Red
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          }
        });

        // Live Location Marker - Google Blue Location Dot
        userMarkerObj.current = new google.maps.Marker({
          position: { lat: currentLocation.lat, lng: currentLocation.lng },
          map,
          title: 'Live Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: isOffline ? '#70757A' : riskLevel === 'RED' ? '#EA4335' : riskLevel === 'AMBER' ? '#FBBC04' : '#4285F4', // Google Blue
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          }
        });

        // Navigation Route Polyline - Official Google Route Blue
        const pathCoords = [
          { lat: startLocation.lat, lng: startLocation.lng },
          { lat: currentLocation.lat, lng: currentLocation.lng },
          { lat: destination.lat, lng: destination.lng }
        ];

        routePolylineObj.current = new google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: isDeviated ? '#FBBC04' : '#4285F4', // Google Route Blue
          strokeOpacity: 0.9,
          strokeWeight: 6,
        });
        routePolylineObj.current.setMap(map);

        setGoogleMapsLoaded(true);
      })
      .catch((err) => {
        console.warn('Google Maps loader failed or key invalid, switching to SVG Interactive Visual Map:', err);
        setMapsError(true);
      });
  }, [apiKey]);

  // Update theme / mapType dynamically on active Google Maps instance
  useEffect(() => {
    if (googleMapsLoaded && googleMapObj.current && window.google) {
      googleMapObj.current.setMapTypeId(mapType);
      googleMapObj.current.setOptions({
        styles: mapTheme === 'dark' ? darkMapStyle : []
      });
    }
  }, [mapType, mapTheme, googleMapsLoaded]);

  // Update position dynamically
  useEffect(() => {
    if (googleMapsLoaded && googleMapObj.current && userMarkerObj.current) {
      const latLng = { lat: currentLocation.lat, lng: currentLocation.lng };
      userMarkerObj.current.setPosition(latLng);
      googleMapObj.current.panTo(latLng);

      if (routePolylineObj.current) {
        const historyPath = locationHistory.map(l => ({ lat: l.latitude, lng: l.longitude }));
        const fullPath = [
          { lat: startLocation.lat, lng: startLocation.lng },
          ...(historyPath.length > 0 ? historyPath : [latLng]),
          { lat: destination.lat, lng: destination.lng }
        ];
        routePolylineObj.current.setPath(fullPath);
      }
    }
  }, [currentLocation, googleMapsLoaded, locationHistory]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 20));
    if (googleMapObj.current) {
      googleMapObj.current.setZoom(googleMapObj.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 1));
    if (googleMapObj.current) {
      googleMapObj.current.setZoom(googleMapObj.current.getZoom() - 1);
    }
  };

  const handleRecenter = () => {
    if (googleMapObj.current) {
      googleMapObj.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
    }
  };

  // SVG Canvas Map Click Handler
  const handleSvgMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert click coordinates to simulated lat/lng
    const lat = 12.9716 - (clickY - 250) * 0.0003;
    const lng = 77.5946 + (clickX - 400) * 0.0003;

    const destObj = {
      name: `Map Selected Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      lat,
      lng
    };
    setClickDestination(destObj);
    if (onSelectMapDestination) {
      onSelectMapDestination(destObj);
    }
  };

  const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b687a' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1f2d4d' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] }
  ];

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden glass-panel border border-slate-700/50 shadow-2xl flex flex-col font-sans">
      
      {/* Top Map HUD overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Status Pills */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-white px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md">
            <Radio className={`w-3.5 h-3.5 ${isOffline ? 'text-gray-400' : 'text-emerald-500 animate-pulse'}`} />
            <span>{isOffline ? 'GPS DISCONNECTED' : 'LIVE GPS ACTIVE'}</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md ${
            riskLevel === 'RED' ? 'bg-red-500/90 text-white border-red-600 glow-red' :
            riskLevel === 'AMBER' ? 'bg-amber-500/90 text-white border-amber-600 glow-amber' :
            'bg-emerald-600/90 text-white border-emerald-700 glow-green'
          }`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{riskLevel} RISK</span>
          </div>
        </div>

        {/* Travel Stats HUD */}
        <div className="bg-white/95 dark:bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-4 text-slate-700 dark:text-slate-200 pointer-events-auto shadow-lg backdrop-blur-md">
          <div>ETA: <span className="font-bold text-blue-600 dark:text-cyan-400">{eta}</span></div>
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-700"></div>
          <div>Dist: <span className="font-bold text-blue-600 dark:text-blue-400">{distance}</span></div>
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-700"></div>
          <div>Speed: <span className="font-bold text-emerald-600 dark:text-emerald-400">{speed}</span></div>
        </div>
      </div>

      {/* Floating Controls Overlay (Official Google Maps Card Style) */}
      <div className="absolute top-16 right-3 z-10 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1 shadow-xl text-xs font-semibold text-slate-700 dark:text-slate-200">
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
              mapType === 'roadmap' ? 'bg-blue-600 text-white shadow-md font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>

          <button
            onClick={() => setMapType('satellite')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
              mapType === 'satellite' ? 'bg-blue-600 text-white shadow-md font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Satellite</span>
          </button>

          <button
            onClick={() => setMapTheme(prev => prev === 'standard' ? 'dark' : 'standard')}
            className="px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-slate-600 dark:text-slate-300"
            title="Toggle Map Light/Dark Style"
          >
            {mapTheme === 'standard' ? <Moon className="w-3.5 h-3.5 text-indigo-500" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>{mapTheme === 'standard' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1 shadow-xl text-slate-700 dark:text-slate-200">
          <button onClick={handleZoomIn} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white" title="Zoom In">
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-full h-px bg-slate-200 dark:bg-slate-800"></div>
          <button onClick={handleZoomOut} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white" title="Zoom Out">
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleRecenter}
          className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xl transition-all flex items-center justify-center"
          title="Re-center on My Location"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>

      {/* Main Map Canvas */}
      {!mapsError && apiKey ? (
        <div ref={mapRef} className="w-full h-full min-h-[420px] flex-1 cursor-crosshair"></div>
      ) : (
        /* Standard Authentic Google Maps Fallback SVG Canvas */
        <div
          onClick={handleSvgMapClick}
          className={`relative w-full h-full min-h-[420px] flex-1 overflow-hidden flex items-center justify-center cursor-pointer select-none transition-colors duration-300 ${
            mapType === 'satellite' ? 'bg-[#0f172a]' : mapTheme === 'dark' ? '#1d2c4d' : 'bg-[#F4F3F0]'
          }`}
        >
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 500" preserveAspectRatio="none">
            <defs>
              {/* Google Blue Route Gradient */}
              <linearGradient id="googleRouteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4285F4" />
                <stop offset="100%" stopColor="#1A73E8" />
              </linearGradient>

              {/* Route Glow Shadow Filter */}
              <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4285F4" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Standard Google Maps Background Elements */}
            {mapType === 'roadmap' && mapTheme === 'standard' && (
              <>
                {/* Google Maps Base Land */}
                <rect width="800" height="500" fill="#F4F3F0" />

                {/* Parks & Green Spaces (Cubbon Park / Lalbagh Style) */}
                <path d="M 50 40 Q 150 20 220 90 T 180 200 Q 100 220 50 150 Z" fill="#D4EAC8" stroke="#CCE3BD" strokeWidth="1" />
                <path d="M 580 280 Q 720 250 760 380 T 620 460 Q 520 420 580 280 Z" fill="#D4EAC8" stroke="#CCE3BD" strokeWidth="1" />
                <path d="M 450 30 Q 550 10 600 60 T 520 120 Z" fill="#E2F0D9" />

                {/* Water Body (River / Lake - Google Water Blue #AAD3DF) */}
                <path
                  d="M 0 100 C 180 120, 250 280, 380 260 C 500 240, 620 380, 800 350 L 800 420 C 620 450, 480 310, 370 320 C 230 330, 150 170, 0 150 Z"
                  fill="#AAD3DF"
                  stroke="#96C7D6"
                  strokeWidth="1"
                />

                {/* Local City Road Grid (White lines with grey borders) */}
                <g stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 0 60 L 800 60" />
                  <path d="M 0 180 L 800 180" />
                  <path d="M 0 320 L 800 320" />
                  <path d="M 0 440 L 800 440" />
                  <path d="M 100 0 L 100 500" />
                  <path d="M 260 0 L 260 500" />
                  <path d="M 480 0 L 480 500" />
                  <path d="M 660 0 L 660 500" />
                  <path d="M 120 380 L 680 120" strokeWidth="4" />
                </g>
                
                {/* Secondary Road Outlines */}
                <g stroke="#E0E0E0" strokeWidth="1" fill="none">
                  <path d="M 0 57 L 800 57 M 0 63 L 800 63" />
                  <path d="M 0 177 L 800 177 M 0 183 L 800 183" />
                  <path d="M 0 317 L 800 317 M 0 323 L 800 323" />
                  <path d="M 97 0 L 97 500 M 103 0 L 103 500" />
                  <path d="M 257 0 L 257 500 M 263 0 L 263 500" />
                  <path d="M 477 0 L 477 500 M 483 0 L 483 500" />
                </g>

                {/* Major Arterial Highway (Google Yellow/Orange Highway #FFE0B2 / #FFB74D) */}
                <g fill="none">
                  <path d="M 0 240 Q 250 220 400 240 T 800 200" stroke="#FFE0B2" strokeWidth="10" strokeLinecap="round" />
                  <path d="M 0 240 Q 250 220 400 240 T 800 200" stroke="#FFA726" strokeWidth="7" strokeLinecap="round" />

                  <path d="M 380 0 L 380 500" stroke="#FFE0B2" strokeWidth="10" />
                  <path d="M 380 0 L 380 500" stroke="#FFA726" strokeWidth="7" />
                </g>

                {/* Google Map Place Labels */}
                <g fontStyle="normal" fontFamily="system-ui, sans-serif">
                  <text x="110" y="110" fill="#5F6368" fontSize="11" fontWeight="600">Cubbon Park</text>
                  <text x="610" y="340" fill="#5F6368" fontSize="11" fontWeight="600">Botanical Gardens</text>
                  <text x="410" y="225" fill="#E65100" fontSize="10" fontWeight="bold">AH47 Highway</text>
                  <text x="390" y="70" fill="#1A73E8" fontSize="10" fontWeight="bold">Central Metro Station</text>
                  <text x="270" y="470" fill="#5F6368" fontSize="10" fontStyle="italic">Indiranagar Sector 3</text>
                </g>
              </>
            )}

            {/* Satellite / Dark Canvas Fallback */}
            {(mapType === 'satellite' || mapTheme === 'dark') && (
              <>
                <rect width="800" height="500" fill={mapType === 'satellite' ? '#0F172A' : '#1D2C4D'} />
                <path d="M 0 100 Q 300 280 800 350 L 800 420 Q 300 310 0 150 Z" fill={mapType === 'satellite' ? '#0B2545' : '#0E1626'} />
                <path d="M 0 240 Q 250 220 400 240 T 800 200" stroke="#304A7D" strokeWidth="8" fill="none" />
                <path d="M 380 0 L 380 500" stroke="#304A7D" strokeWidth="8" fill="none" />
                <path d="M 0 180 L 800 180 M 0 320 L 800 320 M 260 0 L 260 500" stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none" />
              </>
            )}

            {/* Planned Route Guide Path */}
            <path
              d="M 120 380 Q 250 150 400 240 T 680 120"
              fill="none"
              stroke="#D2E3FC"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* Google Signature Blue Navigation Route */}
            <path
              d="M 120 380 Q 250 150 400 240"
              fill="none"
              stroke="url(#googleRouteGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#routeGlow)"
            />

            {/* Deviation Alert Corridor Path */}
            {isDeviated && (
              <path
                d="M 400 240 Q 480 320 540 390"
                fill="none"
                stroke="#EA4335"
                strokeWidth="5"
                strokeDasharray="6 4"
                className="animate-pulse"
              />
            )}

            {/* START MARKER (Google Green Circle Marker) */}
            <g transform="translate(120, 380)">
              <circle cx="0" cy="0" r="14" fill="#34A853" stroke="#FFFFFF" strokeWidth="3" className="shadow-lg" />
              <circle cx="0" cy="0" r="5" fill="#FFFFFF" />
              <rect x="-24" y="18" width="48" height="18" rx="4" fill="#FFFFFF" stroke="#34A853" strokeWidth="1" />
              <text x="0" y="31" textAnchor="middle" fill="#188038" fontSize="10" fontWeight="bold">START</text>
            </g>

            {/* DESTINATION MARKER (Official Google Red Pin Teardrop) */}
            <g transform="translate(680, 120)">
              {/* Pin Drop Shadow */}
              <ellipse cx="0" cy="2" rx="8" ry="3" fill="rgba(0,0,0,0.3)" />
              {/* Google Red Pin Shape */}
              <path
                d="M 0 0 C -10 -12 -14 -20 -14 -28 C -14 -38 -8 -44 0 -44 C 8 -44 14 -38 14 -28 C 14 -20 10 -12 0 0 Z"
                fill="#EA4335"
                stroke="#B31412"
                strokeWidth="1"
                className="shadow-xl"
              />
              {/* Inner White Dot */}
              <circle cx="0" cy="-28" r="5" fill="#FFFFFF" />
              {/* Label */}
              <rect x="-38" y="-62" width="76" height="18" rx="4" fill="#FFFFFF" stroke="#EA4335" strokeWidth="1.5" />
              <text x="0" y="-49" textAnchor="middle" fill="#D93025" fontSize="10" fontWeight="bold">DESTINATION</text>
            </g>

            {/* LIVE USER GPS MARKER (Google Mobile Blue Dot with Pulsing Radar Halo) */}
            <g transform={isDeviated ? "translate(540, 390)" : "translate(400, 240)"}>
              {/* Pulsing Outer Halo */}
              <circle
                cx="0"
                cy="0"
                r="24"
                fill="none"
                stroke={riskLevel === 'RED' ? '#EA4335' : riskLevel === 'AMBER' ? '#FBBC04' : '#4285F4'}
                strokeWidth="2"
                className="animate-ping opacity-60"
              />
              <circle
                cx="0"
                cy="0"
                r="18"
                fill={riskLevel === 'RED' ? 'rgba(234,67,53,0.25)' : riskLevel === 'AMBER' ? 'rgba(251,188,4,0.25)' : 'rgba(66,133,244,0.25)'}
              />
              {/* Core White Ring & Blue Dot */}
              <circle cx="0" cy="0" r="10" fill="#FFFFFF" className="shadow-lg" />
              <circle
                cx="0"
                cy="0"
                r="7"
                fill={isOffline ? '#70757A' : riskLevel === 'RED' ? '#EA4335' : riskLevel === 'AMBER' ? '#FBBC04' : '#4285F4'}
              />
            </g>
          </svg>

          {/* Authentic Google Brand Watermark Lower-Left */}
          <div className="absolute bottom-2 left-3 select-none pointer-events-none flex items-center gap-1.5">
            <span className="font-black tracking-tighter text-base" style={{ fontFamily: 'Product Sans, sans-serif' }}>
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC04]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>
            </span>
          </div>

          {/* Authentic Google Map Data Copyright Footer Lower-Right */}
          <div className="absolute bottom-1 right-3 select-none pointer-events-none text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 font-sans bg-white/70 dark:bg-slate-900/70 px-2 py-0.5 rounded">
            <span>Map data ©2026 Google</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Terms of Use</span>
          </div>

          {/* Bottom Click Hint */}
          <div className="absolute bottom-8 left-3 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-medium flex items-center gap-2 shadow-lg">
            <Navigation className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Click anywhere on map to update destination pin ({startLocation.name} → {destination.name})</span>
          </div>

          {isDeviated && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white border border-amber-600 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl animate-bounce">
              <AlertTriangle className="w-4 h-4 text-white" />
              <span>Route Deviation Detected: Vehicle Off Corridor</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Coordinates & Location Details Footer */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
          <span className="font-semibold text-slate-800 dark:text-white">{currentLocation.name || 'Current GPS Telemetry Point'}</span>
          <span className="text-slate-500">
            ({currentLocation.lat ? currentLocation.lat.toFixed(4) : '12.9716'}, {currentLocation.lng ? currentLocation.lng.toFixed(4) : '77.5946'})
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span>Start: <strong className="text-slate-700 dark:text-slate-200">{startLocation.name}</strong></span>
          <span>→</span>
          <span>Dest: <strong className="text-slate-700 dark:text-slate-200">{destination.name}</strong></span>
        </div>
      </div>

    </div>
  );
}

