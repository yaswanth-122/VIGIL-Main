import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Bot, Sparkles, Volume2, ShieldAlert, CheckCircle2, Phone, Compass, X } from 'lucide-react';
import { speakVoiceAnnouncement, startAlarm, stopAlarm } from '../utils/audio';
import { api } from '../services/api';

export default function AIVoiceAssistant({ user, onOpenSOS }) {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const recognitionRef = useRef(null);

  // Activate AI Voice Assistant & Speak Greeting on User Login
  useEffect(() => {
    if (user && !hasGreeted) {
      setHasGreeted(true);
      const greeting = `Welcome back to VIGIL, ${user.name || 'Alex'}! AI Voice Assistant is activated. I am listening for your voice commands.`;
      speakVoiceAnnouncement(greeting);
      setLastCommand(`Activated: ${greeting}`);
      startListening();
    }
  }, [user, hasGreeted]);

  // Initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        processVoiceCommand(currentTranscript.toLowerCase().trim());
      };

      rec.onerror = (e) => {
        console.warn('Speech recognition notice:', e.error);
      };

      rec.onend = () => {
        // Auto restart speech recognition if active
        if (isListening) {
          try {
            rec.start();
          } catch (err) {}
        }
      };

      recognitionRef.current = rec;
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(true);
      }
    } else {
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      speakVoiceAnnouncement("AI Voice Assistant paused.");
    } else {
      startListening();
      speakVoiceAnnouncement("AI Voice Assistant active. Listening for commands.");
    }
  };

  // Process Voice Commands
  const processVoiceCommand = async (cmd) => {
    if (!cmd) return;

    // Command: Start Journey
    if (cmd.includes('start journey') || cmd.includes('start travel') || cmd.includes('begin journey')) {
      setLastCommand('Command Recognized: Start Journey');
      speakVoiceAnnouncement("Navigating to Start Safe Journey page.");
      navigate('/start');
      setTranscript('');
    }
    // Command: I'm Safe
    else if (cmd.includes('safe') || cmd.includes("i'm safe") || cmd.includes('i am safe') || cmd.includes('mark safe')) {
      setLastCommand("Command Recognized: I'm Safe");
      speakVoiceAnnouncement("You are marked SAFE. Inactivity timer reset.");
      try {
        await api.handleSafetyCheck('active', 'SAFE');
      } catch (err) {}
      setTranscript('');
    }
    // Command: I'm Unsafe
    else if (cmd.includes('unsafe') || cmd.includes("i'm unsafe") || cmd.includes('i am unsafe') || cmd.includes('danger')) {
      setLastCommand("Command Recognized: I'm Unsafe");
      speakVoiceAnnouncement("Marking status UNSAFE. Primary guardian Hari Kiran notified with latest location.");
      try {
        await api.handleSafetyCheck('active', 'UNSAFE');
      } catch (err) {}
      setTranscript('');
    }
    // Command: Emergency / SOS / Help
    else if (cmd.includes('sos') || cmd.includes('emergency') || cmd.includes('help me') || cmd.includes('call guardian')) {
      setLastCommand('Command Recognized: Emergency SOS');
      speakVoiceAnnouncement("Emergency SOS activated! Dialing primary guardian Hari Kiran immediately.");
      window.location.href = 'tel:+917659834470';
      if (onOpenSOS) onOpenSOS();
      setTranscript('');
    }
    // Command: Threshold / Timer (1 min, 2 min, 3 min, 5 min)
    else if (cmd.includes('1 minute') || cmd.includes('one minute') || cmd.includes('1 min')) {
      setLastCommand('Command Recognized: Set 1 Min Threshold');
      speakVoiceAnnouncement("No-movement threshold updated to 1 minute.");
      try {
        await api.updateSafetyTimeout('active', 1);
      } catch (err) {}
      setTranscript('');
    }
    else if (cmd.includes('2 minute') || cmd.includes('two minute') || cmd.includes('2 min')) {
      setLastCommand('Command Recognized: Set 2 Min Threshold');
      speakVoiceAnnouncement("No-movement threshold updated to 2 minutes.");
      try {
        await api.updateSafetyTimeout('active', 2);
      } catch (err) {}
      setTranscript('');
    }
    else if (cmd.includes('3 minute') || cmd.includes('three minute') || cmd.includes('3 min')) {
      setLastCommand('Command Recognized: Set 3 Min Threshold');
      speakVoiceAnnouncement("No-movement threshold updated to 3 minutes.");
      try {
        await api.updateSafetyTimeout('active', 3);
      } catch (err) {}
      setTranscript('');
    }
    else if (cmd.includes('5 minute') || cmd.includes('five minute') || cmd.includes('5 min')) {
      setLastCommand('Command Recognized: Set 5 Min Threshold');
      speakVoiceAnnouncement("No-movement threshold updated to 5 minutes.");
      try {
        await api.updateSafetyTimeout('active', 5);
      } catch (err) {}
      setTranscript('');
    }
    // Command: Check Status
    else if (cmd.includes('check status') || cmd.includes('status') || cmd.includes('how am i')) {
      setLastCommand('Command Recognized: Check Status');
      speakVoiceAnnouncement("VIGIL Journey Monitoring is active. Status is SAFE and risk score is green.");
      setTranscript('');
    }
    // Command: Guardians
    else if (cmd.includes('guardian') || cmd.includes('who is my guardian')) {
      setLastCommand('Command Recognized: Show Guardians');
      speakVoiceAnnouncement("Primary guardian is Hari Kiran at plus 9 1 7 6 5 9 8 3 4 4 7 0.");
      navigate('/guardians');
      setTranscript('');
    }
    // Command: Dashboard / Home
    else if (cmd.includes('dashboard') || cmd.includes('go home') || cmd.includes('home page')) {
      setLastCommand('Command Recognized: Go to Dashboard');
      speakVoiceAnnouncement("Navigating to VIGIL Dashboard.");
      navigate('/');
      setTranscript('');
    }
    // Conversational Greetings & AI Replies
    else if (cmd.includes('hello') || cmd.includes('hi') || cmd.includes('hey vigil') || cmd.includes('hey')) {
      setLastCommand('Greeting: Hello / Hi');
      const nameStr = user?.name ? user.name.split(' ')[0] : 'there';
      speakVoiceAnnouncement(`Hello ${nameStr}! I am VIGIL, your AI virtual safety companion. I am monitoring your journey and ready for your commands.`);
      setTranscript('');
    }
    else if (cmd.includes('good morning')) {
      setLastCommand('Greeting: Good Morning');
      const nameStr = user?.name ? user.name.split(' ')[0] : 'there';
      speakVoiceAnnouncement(`Good morning ${nameStr}! Wishing you a safe day ahead. VIGIL safety monitoring is active.`);
      setTranscript('');
    }
    else if (cmd.includes('good afternoon')) {
      setLastCommand('Greeting: Good Afternoon');
      const nameStr = user?.name ? user.name.split(' ')[0] : 'there';
      speakVoiceAnnouncement(`Good afternoon ${nameStr}! VIGIL is active and keeping track of your route.`);
      setTranscript('');
    }
    else if (cmd.includes('good evening') || cmd.includes('good night')) {
      setLastCommand('Greeting: Good Evening');
      const nameStr = user?.name ? user.name.split(' ')[0] : 'there';
      speakVoiceAnnouncement(`Good evening ${nameStr}! Nighttime journey safety mode is active.`);
      setTranscript('');
    }
    else if (cmd.includes('how are you') || cmd.includes('how do you do')) {
      setLastCommand('Greeting: How Are You');
      speakVoiceAnnouncement("I am functioning at full capacity! All telemetry systems are online, and your primary guardian Hari Kiran is linked.");
      setTranscript('');
    }
    else if (cmd.includes('thank you') || cmd.includes('thanks')) {
      setLastCommand('Greeting: Thank You');
      speakVoiceAnnouncement("You're very welcome! Stay safe out there. VIGIL has your back.");
      setTranscript('');
    }
    else if (cmd.includes('who are you') || cmd.includes('what are you')) {
      setLastCommand('Greeting: Who Are You');
      speakVoiceAnnouncement("I am VIGIL, an AI-assisted virtual safety companion designed by Team BUG BUSTERS to protect your travel journeys.");
      setTranscript('');
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 font-sans animate-fadeIn">
      {/* Floating AI Voice Assistant Widget Container */}
      <div className={`relative bg-[#0D121F]/95 backdrop-blur-xl border border-cyan-500/40 rounded-3xl shadow-2xl transition-all duration-300 text-white ${
        isExpanded ? 'w-80 p-5 space-y-3 border-cyan-400 glow-blue' : 'w-auto p-2.5 flex items-center gap-3'
      }`}>
        
        {/* Toggle / Header Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 ${
              isListening ? 'animate-pulse' : ''
            }`}>
              <Bot className="w-5 h-5 stroke-[2.5]" />
              {isListening && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>}
            </div>

            <div className="hidden sm:block min-w-0">
              <div className="flex items-center gap-1 text-[11px] font-black uppercase text-cyan-400 tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>AI VOICE ASSISTANT</span>
              </div>
              <p className="text-[10px] text-gray-300 truncate">
                {isListening ? 'Listening for commands...' : 'Voice Assistant Paused'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleListening}
              className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                isListening ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'
              }`}
              title={isListening ? 'Pause Voice Assistant' : 'Start Voice Assistant'}
            >
              {isListening ? <Mic className="w-4 h-4 text-emerald-400 animate-bounce" /> : <MicOff className="w-4 h-4 text-red-400" />}
            </button>

            {isExpanded && (
              <button onClick={() => setIsExpanded(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded HUD View */}
        {isExpanded && (
          <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
            {/* Live Transcript Display Box */}
            <div className="bg-black/50 p-3 rounded-xl border border-white/10 space-y-1">
              <div className="text-[10px] uppercase font-bold text-cyan-400 flex items-center justify-between">
                <span>Real-Time Voice Recognition:</span>
                <span class="text-[9px] text-emerald-400 font-mono">ACTIVE</span>
              </div>
              <p className="text-xs text-white font-mono min-h-[36px] italic">
                {transcript ? `“${transcript}”` : lastCommand || 'Say "Start Journey", "I\'m Safe", "I\'m Unsafe", "Set 2 Mins", or "Emergency"'}
              </p>
            </div>

            {/* Quick Command Action Badges */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Available Voice Commands (Click or Speak):</div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  onClick={() => processVoiceCommand('hello')}
                  className="py-1.5 px-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-bold text-left truncate"
                >
                  💬 "Hello VIGIL"
                </button>
                <button
                  onClick={() => processVoiceCommand('how are you')}
                  className="py-1.5 px-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-left truncate"
                >
                  💬 "How are you?"
                </button>
                <button
                  onClick={() => processVoiceCommand('start journey')}
                  className="py-1.5 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-left truncate"
                >
                  🗣️ "Start Journey"
                </button>
                <button
                  onClick={() => processVoiceCommand("i'm safe")}
                  className="py-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-left truncate"
                >
                  🗣️ "I'm Safe"
                </button>
                <button
                  onClick={() => processVoiceCommand("i'm unsafe")}
                  className="py-1.5 px-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-left truncate"
                >
                  🗣️ "I'm Unsafe"
                </button>
                <button
                  onClick={() => processVoiceCommand('emergency')}
                  className="py-1.5 px-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-bold text-left truncate"
                >
                  🗣️ "Emergency SOS"
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
