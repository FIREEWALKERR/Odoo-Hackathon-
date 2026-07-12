import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  CreditCard, 
  FileText, 
  MessageSquare, 
  User as UserIcon, 
  Lock, 
  Plus, 
  CheckCircle2, 
  Navigation, 
  Send, 
  AlertCircle,
  TrendingUp,
  Download,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../lib/storage';
import { Trip, Vehicle } from '../types';

interface CustomerViewProps {
  activeSubTab: string;
}

export default function CustomerView({ activeSubTab }: CustomerViewProps) {
  const { currentUser, updateProfile, changePassword } = useAuth();
  
  // States
  const [trips, setTrips] = useState<Trip[]>(() => dbService.getTrips());
  const [vehicles] = useState<Vehicle[]>(() => dbService.getVehicles());
  const [showBookModal, setShowBookModal] = useState(false);

  // New Booking Form State
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<'Semi-Truck' | 'Box Truck' | 'Delivery Van'>('Box Truck');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Profile Form States
  const [nameInput, setNameInput] = useState(currentUser?.name || '');
  const [phoneInput, setPhoneInput] = useState(currentUser?.phone || '');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Payment states
  const [showPayModal, setShowPayModal] = useState<string | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');

  // Live GPS tracking variables
  const [progress, setProgress] = useState(15);
  const [speed, setSpeed] = useState(82);

  // Support chat states
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    { sender: 'agent', text: 'Hello! Welcome to TransitOps support center. How can we help you with your shipment today?', time: '10:00 AM' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const syncState = () => {
    setTrips(dbService.getTrips());
  };

  // Live GPS Tracking animation loop
  useEffect(() => {
    let interval: any;
    if (activeSubTab === 'tracking') {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) return 0;
          return prev + 1;
        });
        setSpeed(() => Math.floor(75 + Math.random() * 15));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [activeSubTab]);

  // Submit Booking Request
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !destination || !cargoWeight || !startDate || !endDate) {
      alert("Please fill in all details.");
      return;
    }

    try {
      const weightNum = parseFloat(cargoWeight);
      if (isNaN(weightNum)) {
        alert("Please enter a numeric weight value.");
        return;
      }

      // Find available vehicle matching chosen type
      const suitableVehicle = vehicles.find(v => v.type.includes(selectedVehicleType) && v.status === 'Available') || vehicles[0];
      
      // Create a draft trip representing the booking
      const newTrip: Trip = {
        id: 't_b' + Math.random().toString(36).substr(2, 9),
        source,
        destination,
        vehicleId: suitableVehicle?.id || 'v1',
        driverId: 'd1', // Link driver Alexander Mercer
        cargoWeight: weightNum,
        plannedDistance: Math.floor(250 + Math.random() * 400),
        startDate,
        endDate,
        estimatedFuel: Math.floor(80 + Math.random() * 120),
        status: 'Draft'
      };

      // Push trip in DB
      const currentTrips = dbService.getTrips();
      localStorage.setItem('transitops_trips', JSON.stringify([...currentTrips, newTrip]));
      
      dbService.addNotification(
        'Booking Received', 
        `Your delivery request from ${source} to ${destination} is being reviewed.`, 
        'success'
      );

      setShowBookModal(false);
      setSource('');
      setDestination('');
      setCargoWeight('');
      setStartDate('');
      setEndDate('');
      
      syncState();
    } catch (err: any) {
      alert(err.message || "Failed to register booking.");
    }
  };

  // Handle Payment Submit
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName) {
      alert("Please provide valid payment billing card details.");
      return;
    }
    alert(`💳 simulated Gateway Authorized: $${showPayModal} paid successfully.`);
    setShowPayModal(null);
    setCardNumber('');
    setCardName('');
  };

  // Support message sender
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user' as const, text: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');

    // Trigger instant chatbot response
    setTimeout(() => {
      const answers = [
        "Your request is logged. Our Fleet dispatch team is looking into the trip schedule.",
        "Yes, our refrigerated semi-trucks maintain a constant temperature of -18C to ensure cargo preservation.",
        "We are currently verifying GPS transponder coordinate points. Live telemetry is operational on the Tracking page.",
        "Your invoice receipt has been securely registered in your Payments Ledger folder."
      ];
      const botAnswer = answers[Math.floor(Math.random() * answers.length)];
      setMessages(prev => [...prev, {
        sender: 'agent',
        text: botAnswer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1200);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    if (!nameInput.trim()) {
      setProfileMsg({ type: 'error', text: 'Full Name is required.' });
      return;
    }
    try {
      await updateProfile(nameInput.trim(), phoneInput.trim());
      setProfileMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Error updating profile.' });
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!newPassword) {
      setPasswordMsg({ type: 'error', text: 'New password required.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    try {
      await changePassword(newPassword);
      setPasswordMsg({ type: 'success', text: 'Password modified successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Error changing password.' });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* BRAND HEADER */}
      <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Compass className="h-40 w-40 animate-spin-slow" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                Customer Services Panel
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight md:text-2xl">
              Welcome, <span className="text-blue-400">{currentUser?.name}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Private Account ({currentUser?.email}) • Corporate Logistics Client
            </p>
          </div>
          <div>
            <button
              onClick={() => setShowBookModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" /> Book New Shipment
            </button>
          </div>
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Active Bookings</span>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {trips.filter(t => t.status === 'Draft' || t.status === 'Dispatched').length}
                </p>
                <span className="text-[10px] text-emerald-500 font-bold block mt-1">✓ Logged in Schedule</span>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Completed Shipments</span>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {trips.filter(t => t.status === 'Completed').length}
                </p>
                <span className="text-[10px] text-slate-400 block mt-1">Historic records safely archived</span>
              </div>
            </div>

            {/* Shipment list */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white mb-4">Current Delivery Ledger</h3>
              <div className="space-y-3">
                {trips.slice(0, 3).map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs dark:bg-slate-850 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{t.source} ➔ {t.destination}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Delivery Target: {t.endDate} • Weight: {t.cargoWeight.toLocaleString()} kg</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      t.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      t.status === 'Dispatched' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="space-y-6">
            {/* Quick Promo Card */}
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm dark:from-blue-950/10 dark:to-indigo-950/10 dark:border-blue-900/20 text-xs text-blue-800 dark:text-blue-300">
              <h4 className="font-bold text-sm mb-1.5 flex items-center gap-1.5 text-blue-950 dark:text-white">
                <TrendingUp className="h-4.5 w-4.5 text-blue-600" /> Premium SLA Dispatch
              </h4>
              All our client shipments are routed through tier-1 heavy logistic assets equipped with temperature controllers and live telemetry transponders.
            </div>

            {/* Quick Support Launcher */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-xs text-center space-y-3">
              <MessageSquare className="h-8 w-8 text-slate-400 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">Need Delivery Support?</h4>
                <p className="text-[10px] text-slate-400">Our logistics team is online 24/7 to resolve shipment queries.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOOKINGS TAB */}
      {activeSubTab === 'bookings' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black text-slate-950 dark:text-white">Book Delivery shipment</h2>
            <button
              onClick={() => setShowBookModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Schedule Shipment
            </button>
          </div>

          <div className="space-y-3">
            {trips.map(t => (
              <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs dark:bg-slate-850 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">{t.source} to {t.destination}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">SLA target interval: {t.startDate} to {t.endDate} • Planned: {t.plannedDistance} km</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                    t.status === 'Completed' ? 'bg-green-150 text-green-700' :
                    t.status === 'Dispatched' ? 'bg-blue-150 text-blue-700' : 'bg-amber-150 text-amber-700'
                  }`}>
                    {t.status === 'Draft' ? 'Pending Review' : t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MY TRIPS */}
      {activeSubTab === 'my_trips' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-black text-slate-950 dark:text-white mb-4">Trips Ledger Archive</h2>
          <div className="space-y-3">
            {trips.map(t => (
              <div key={t.id} className="p-4 rounded-2xl border border-slate-100 flex justify-between items-center text-xs dark:bg-slate-850 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">{t.source} ➔ {t.destination}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Cargo weight: {t.cargoWeight} kg • Completed: {t.endDate}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                  t.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeSubTab === 'payments' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <h2 className="text-base font-black text-slate-950 dark:text-white">Payments Ledgers</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl dark:bg-slate-850 dark:border-slate-800 text-xs">
              <span className="text-slate-400 block">Outstanding Balance</span>
              <strong className="text-lg font-black text-red-650 block mt-0.5">$1,850.00</strong>
              <button
                onClick={() => setShowPayModal('1850')}
                className="mt-2 bg-slate-900 text-white rounded-lg py-1 px-3 text-[10px] hover:bg-slate-850 font-bold"
              >
                Clear Balance
              </button>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl dark:bg-slate-850 dark:border-slate-800 text-xs">
              <span className="text-slate-400 block">Total Payments Completed</span>
              <strong className="text-lg font-black text-emerald-650 block mt-0.5">$4,200.00</strong>
              <span className="text-[9px] text-emerald-500 mt-1 block">✓ All invoices synced</span>
            </div>
          </div>
        </div>
      )}

      {/* INVOICES */}
      {activeSubTab === 'invoices' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-base font-black text-slate-950 dark:text-white">Logistical Billing Invoices</h2>
          
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center text-xs dark:bg-slate-850 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">Invoice #INV-2026-902</h4>
                <p className="text-[10px] text-slate-400 mt-1">Service description: Shipment delivery TX-CA corridor • Amount: $1,200.00</p>
              </div>
              <button
                onClick={() => alert("Simulated invoice PDF document download started!")}
                className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-300"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE TELEMETRY TRACKER */}
      {activeSubTab === 'tracking' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-950 dark:text-white">Active shipment Live Telemetry GPS Tracking</h2>
            <p className="text-xs text-slate-400">Vessel ID: VOLVO-FH16 (TX-882-AB) • Dispatched Route Houston ➔ Dallas</p>
          </div>

          {/* SIMULATED MAP */}
          <div className="relative h-64 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col justify-between p-4">
            
            {/* GPS Telemetry readouts */}
            <div className="flex justify-between items-start z-10">
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl font-mono text-[9px] text-slate-400 space-y-1">
                <p><span className="text-emerald-500 font-bold">LAT:</span> 32.7767° N</p>
                <p><span className="text-emerald-500 font-bold">LNG:</span> 96.7970° W</p>
                <p><span className="text-blue-500 font-bold">GPS:</span> Operational (12 Satellites)</p>
              </div>
              
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl font-mono text-right text-[9px] text-slate-400 space-y-1">
                <p><span className="text-blue-400 font-bold">SPEED:</span> <strong className="text-xs text-white">{speed}</strong> km/h</p>
                <p><span className="text-blue-400 font-bold">PROGRESS:</span> <strong className="text-xs text-white">{progress}%</strong></p>
              </div>
            </div>

            {/* Stylized Map Line Vector SVG */}
            <div className="absolute inset-0 flex items-center justify-center px-10">
              <div className="relative w-full h-1 bg-slate-800 rounded-full">
                {/* Active progress track */}
                <div 
                  className="absolute left-0 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"
                  style={{ width: `${progress}%` }}
                ></div>
                
                {/* Truck marker */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-950 transition-all duration-300"
                  style={{ left: `calc(${progress}% - 16px)` }}
                >
                  <Navigation className="h-4.5 w-4.5 rotate-90" />
                </div>

                {/* Cities markers */}
                <div className="absolute left-0 -top-6 text-[10px] text-slate-400 font-mono font-bold">Houston</div>
                <div className="absolute right-0 -top-6 text-[10px] text-slate-400 font-mono font-bold">Dallas</div>
              </div>
            </div>

            <div className="z-10 flex justify-between text-[10px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded-xl">
              <span>Status: EN-ROUTE</span>
              <span>Estimated arrival: ~1h 15m</span>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER SUPPORT */}
      {activeSubTab === 'support' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-base font-black text-slate-950 dark:text-white">Customer Support Messaging Portal</h2>
          
          <div className="h-80 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col justify-between dark:bg-slate-950 dark:border-slate-800">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-xs text-xs ${
                    m.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border border-slate-150 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800'
                  }`}>
                    {m.text}
                  </div>
                  <span className="text-[8px] text-slate-400 mt-1 px-1">{m.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-150 flex gap-2 dark:border-slate-800">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Write support request message..."
                className="flex-1 rounded-xl border border-slate-200 text-xs py-2 px-3 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-white"
              />
              <button
                type="submit"
                className="p-2.5 bg-slate-900 text-white rounded-xl dark:bg-white dark:text-slate-950 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE TAB */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile form */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-black text-slate-950 dark:text-white mb-4 flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-blue-500" /> Save Profile Details
            </h2>
            
            {profileMsg.text && (
              <div className={`mb-4 rounded-xl p-3 text-xs font-semibold ${
                profileMsg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-slate-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Registered Account Email</label>
                <input
                  type="email"
                  value={currentUser?.email}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-100 py-2.5 px-3 text-slate-500 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Billing Phone Number</label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+1 (555) 019-4000"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-slate-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-white font-bold py-3 shadow-md cursor-pointer text-xs"
              >
                Save Details
              </button>
            </form>
          </div>

          {/* Password update form */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-black text-slate-950 dark:text-white mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" /> Change Security Password
            </h2>

            {passwordMsg.text && (
              <div className={`mb-4 rounded-xl p-3 text-xs font-semibold ${
                passwordMsg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSave} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-slate-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-slate-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 shadow-md cursor-pointer text-xs"
              >
                Change Security Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL DIALOGS ----------------- */}

      {/* Book Shipment Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl relative">
            <h3 className="text-sm font-black text-slate-950 dark:text-white mb-4">Book New Delivery Shipment</h3>
            <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Source Origin</label>
                  <input
                    type="text"
                    required
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. Houston, TX"
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Destination</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Dallas, TX"
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Cargo Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Truck Profile Class</label>
                  <select
                    value={selectedVehicleType}
                    onChange={(e) => setSelectedVehicleType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="Semi-Truck">Heavy Semi-Truck</option>
                    <option value="Box Truck">Medium Box Truck</option>
                    <option value="Delivery Van">Light Delivery Van</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">SLA Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">SLA End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="rounded-xl border border-slate-200 text-slate-500 py-2 px-4 cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 cursor-pointer"
                >
                  Submit Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Outstanding Balance Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <h3 className="text-sm font-black text-slate-950 dark:text-white mb-4">Clear Outstanding Balance: ${showPayModal}</h3>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Bruce Wayne"
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Card Number</label>
                <input
                  type="text"
                  required
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4000 1234 5678 9010"
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Expiration Date</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Security CVC</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cardCVC}
                    onChange={(e) => setCardCVC(e.target.value)}
                    placeholder="•••"
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  className="rounded-xl border border-slate-200 text-slate-500 py-2 px-4 cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-850 text-white font-bold py-2 px-4 cursor-pointer"
                >
                  Authorize Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
