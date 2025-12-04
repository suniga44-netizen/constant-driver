import React, { useState, useMemo, useCallback, useEffect, createContext, useContext, useRef } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Entry, EntryType, Shift, Filter, Period, ExpenseCategory, FuelType, FuelDetails, Platform, Goals } from './types';
import { getPeriodRange, formatCurrency, calculateShiftDuration, formatNumber, formatHoursMinutes, calculatePauseDuration, toNaiveUTCISOString, formatDateFromNaiveUTC, formatTimeFromNaiveUTC, getLocalDateISOString } from './utils/date';
import { HomeIcon, ListIcon, SettingsIcon, PlusIcon, XMarkIcon, CurrencyDollarIcon, ArrowDownIcon, ArrowUpIcon, ClockIcon, TrashIcon, PencilIcon, TargetIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, DocumentChartBarIcon, PrinterIcon } from './components/Icons';

type AppContextType = {
  entries: Entry[];
  shifts: Shift[];
  goals: Goals;
  updateGoals: (goals: Goals) => void;
  addEntry: (entry: Omit<Entry, 'id'>) => void;
  updateEntry: (entry: Entry) => void;
  deleteEntry: (id: string) => void;
  addShift: (shift: Omit<Shift, 'id'>) => void;
  updateShift: (shift: Shift) => void;
  deleteShift: (id: string) => void;
  filteredEntries: Entry[];
  filteredShifts: Shift[];
  filter: Filter;
  setFilter: React.Dispatch<React.SetStateAction<Filter>>;
  startEdit: (entry: Entry) => void;
  startEditShift: (shift: Shift) => void;
};

const AppContext = createContext<AppContextType | null>(null);
const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within an AppProvider");
    return context;
};

type View = 'dashboard' | 'history' | 'insights' | 'goals' | 'settings';
type ModalType = 'gain' | 'expense' | 'shift' | 'goals' | null;

const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-[#141414] p-4 sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        <img src="/logo.png" alt="Constant Driver Logo" className="w-8 h-8 rounded-full" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e3e3e3]">Constant Driver</h1>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  const [entries, setEntries] = useLocalStorage<Entry[]>('driver-entries', []);
  const [shifts, setShifts] = useLocalStorage<Shift[]>('driver-shifts', []);
  const [goals, setGoals] = useLocalStorage<Goals>('driver-goals', {
      daily: {}, weekly: {}, monthly: {}
  });

  const [activeView, setActiveView] = useState<View>('dashboard');
  const [modal, setModal] = useState<ModalType>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [filter, setFilter] = useState<Filter>({
    period: 'today',
    customRange: { start: '', end: '' }
  });
  
  const { filteredEntries, filteredShifts } = useMemo(() => {
    if (filter.period === 'custom' && (!filter.customRange.start || !filter.customRange.end)) {
        return { filteredEntries: [], filteredShifts: [] };
    }
    const range = getPeriodRange(filter);
    const filteredEntries = entries.filter(e => {
      const entryDate = new Date(e.date);
      return entryDate >= range.start && entryDate <= range.end;
    });
    const filteredShifts = shifts.filter(s => {
      const shiftStartDate = new Date(s.start);
      // Include shifts that start within the period
      return shiftStartDate >= range.start && shiftStartDate <= range.end;
    });
    return { filteredEntries, filteredShifts };
  }, [entries, shifts, filter]);


  const addEntry = useCallback((entry: Omit<Entry, 'id'>) => {
    setEntries(prev => [...prev, { ...entry, id: new Date().toISOString() }].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [setEntries]);

  const updateEntry = useCallback((updatedEntry: Entry) => {
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [setEntries]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, [setEntries]);

  const addShift = useCallback((shift: Omit<Shift, 'id'>) => {
    setShifts(prev => [...prev, { ...shift, id: new Date().toISOString() }].sort((a,b) => new Date(b.start).getTime() - new Date(a.start).getTime()));
  }, [setShifts]);

  const updateShift = useCallback((updatedShift: Shift) => {
    setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s)
      .sort((a,b) => new Date(b.start).getTime() - new Date(a.start).getTime()));
  }, [setShifts]);

  const deleteShift = useCallback((id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
  }, [setShifts]);
  
  const updateGoals = useCallback((newGoals: Goals) => {
    setGoals(newGoals);
  }, [setGoals]);

  const startEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setModal(entry.type === EntryType.GAIN ? 'gain' : 'expense');
  };

  const startEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setModal('shift');
  }

  const closeModal = () => {
    setModal(null);
    setEditingEntry(null);
    setEditingShift(null);
  };

  const clearAllData = () => {
    if(window.confirm("Você tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita.")){
        setEntries([]);
        setShifts([]);
        setGoals({ daily: {}, weekly: {}, monthly: {} });
    }
  }

  const contextValue: AppContextType = {
    entries,
    shifts,
    goals,
    updateGoals,
    addEntry,
    updateEntry,
    deleteEntry,
    addShift,
    updateShift,
    deleteShift,
    filteredEntries,
    filteredShifts,
    filter,
    setFilter,
    startEdit,
    startEditShift,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-100 text-gray-800 dark:bg-[#141414] dark:text-[#e3e3e3] flex flex-col font-sans">
        <Header />
        <main className="flex-grow pb-24 px-4 pt-2">
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'history' && <HistoryList />}
          {activeView === 'insights' && <Insights />}
          {activeView === 'goals' && <GoalsView onOpenModal={setModal} />}
          {activeView === 'settings' && <Settings 
            clearAllData={clearAllData}
            entries={entries}
            shifts={shifts}
            goals={goals}
            setEntries={setEntries}
            setShifts={setShifts}
            setGoals={setGoals}
          />}
        </main>
        
        <FloatingActionButton onOpenModal={setModal} />
        
        {modal && <ModalContainer type={modal} onClose={closeModal} entryToEdit={editingEntry} shiftToEdit={editingShift} />}
        
        <BottomNav activeView={activeView} setActiveView={setActiveView} />
      </div>
    </AppContext.Provider>
  );
};

// Sub-components

const SummaryCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  currentValue?: number;
  targetValue?: number;
}> = ({ title, value, icon, currentValue, targetValue }) => {
  const hasGoal = typeof currentValue === 'number' && typeof targetValue === 'number' && targetValue > 0;
  let progress = 0;
  if (hasGoal) {
    progress = (currentValue / targetValue) * 100;
  }
  const progressClamped = (currentValue ?? 0) < 0 ? 0 : Math.min(100, progress);

  return (
    <div className="bg-white dark:bg-[#1e1e1e] rounded-[28px] p-5 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-[#e3e3e3] mt-1">{value}</p>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-[#2c2c2c] rounded-full">
            {icon}
        </div>
      </div>
      {hasGoal && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-[#333] rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full"
              style={{ width: `${progressClamped}%` }}
            ></div>
          </div>
          <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-2">
            Meta: {formatCurrency(targetValue)} ({Math.floor(progress)}%)
          </div>
        </div>
      )}
    </div>
  );
};

const DetailCard: React.FC<{ title: string; value: string; unit?: string; valueColorClass?: string }> = ({ title, value, unit, valueColorClass = 'text-gray-900 dark:text-white' }) => (
    <div className={`bg-white dark:bg-[#1e1e1e] rounded-[24px] p-4 shadow-sm flex flex-col justify-center items-center h-full`}>
      <div className="flex items-baseline">
          <span className={`text-xl font-bold ${valueColorClass}`}>{value}</span>
          {unit && <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{unit}</span>}
      </div>
      <h4 className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1 text-center line-clamp-2">{title}</h4>
    </div>
);


const Dashboard: React.FC = () => {
  const { filteredEntries, filteredShifts, goals, filter } = useAppContext();

  const { goal } = useMemo(() => {
    const period = filter.period;
    if (period === 'today' || period === 'yesterday') {
      return { goal: goals.daily };
    }
    if (period === 'custom' && filter.customRange.start && filter.customRange.end) {
         const start = new Date(filter.customRange.start);
         const end = new Date(filter.customRange.end);
         const diffTime = Math.abs(end.getTime() - start.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         if (diffDays <= 1) { // Check for a single day
             return { goal: goals.daily };
         }
    }
    if (period === 'this_week' || period === 'last_7_days') {
      return { goal: goals.weekly };
    }
    if (period === 'this_month' || period === 'last_30_days') {
      return { goal: goals.monthly };
    }
    return { goal: undefined };
  }, [filter, goals]);

  const stats = useMemo(() => {
    const revenue = filteredEntries.filter(e => e.type === EntryType.GAIN).reduce((sum, e) => sum + e.amount, 0);
    const expenses = filteredEntries.filter(e => e.type === EntryType.EXPENSE).reduce((sum, e) => sum + e.amount, 0);
    const profit = revenue - expenses;
    const totalDurationMs = filteredShifts.reduce((acc, shift) => acc + calculateShiftDuration(shift, true), 0);
    const totalDurationHours = totalDurationMs / (1000 * 60 * 60);

    const totalTrips = filteredEntries
        .filter(e => e.type === EntryType.GAIN && !e.isReward && e.tripCount)
        .reduce((sum, e) => sum + (e.tripCount || 0), 0);

    const fuelEntries = filteredEntries.filter(e => e.type === EntryType.EXPENSE && e.category === ExpenseCategory.FUEL && e.fuelDetails);
    const totalKm = fuelEntries.reduce((sum, e) => sum + (e.fuelDetails?.distanceDriven || 0), 0);
    
    const ethanolEntries = fuelEntries.filter(e => e.fuelDetails?.fuelType === FuelType.ETHANOL);
    const totalEthanolKm = ethanolEntries.reduce((sum, e) => sum + (e.fuelDetails?.distanceDriven || 0), 0);
    const totalEthanolLiters = ethanolEntries.reduce((sum, e) => sum + ((e.fuelDetails?.distanceDriven || 0) / (e.fuelDetails?.avgConsumption || 1)), 0);
    const avgEthanolConsumption = totalEthanolLiters > 0 ? totalEthanolKm / totalEthanolLiters : 0;
    
    const gasolineEntries = fuelEntries.filter(e => e.fuelDetails?.fuelType === FuelType.GASOLINE);
    const totalGasolineKm = gasolineEntries.reduce((sum, e) => sum + (e.fuelDetails?.distanceDriven || 0), 0);
    const totalGasolineLiters = gasolineEntries.reduce((sum, e) => sum + ((e.fuelDetails?.distanceDriven || 0) / (e.fuelDetails?.avgConsumption || 1)), 0);
    const avgGasolineConsumption = totalGasolineLiters > 0 ? totalGasolineKm / totalGasolineLiters : 0;

    return {
        revenue,
        expenses,
        profit,
        totalDurationMs,
        revenuePerHour: totalDurationHours > 0 ? revenue / totalDurationHours : 0,
        revenuePerKm: totalKm > 0 ? revenue / totalKm : 0,
        revenuePerTrip: totalTrips > 0 ? revenue / totalTrips : 0,
        expensesPerHour: totalDurationHours > 0 ? expenses / totalDurationHours : 0,
        expensesPerKm: totalKm > 0 ? expenses / totalKm : 0,
        expensesPerTrip: totalTrips > 0 ? expenses / totalTrips : 0,
        profitPerHour: totalDurationHours > 0 ? profit / totalDurationHours : 0,
        profitPerKm: totalKm > 0 ? profit / totalKm : 0,
        profitPerTrip: totalTrips > 0 ? profit / totalTrips : 0,
        totalKm,
        avgEthanolConsumption,
        avgGasolineConsumption,
    };
}, [filteredEntries, filteredShifts]);
  
  return (
    <div className="space-y-6 pb-20">
      <PeriodFilter />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
            title="Lucro" 
            value={formatCurrency(stats.profit)} 
            icon={<CurrencyDollarIcon className="w-6 h-6 text-blue-400" />}
            currentValue={stats.profit}
            targetValue={goal?.profit}
        />
        <SummaryCard 
            title="Faturamento" 
            value={formatCurrency(stats.revenue)} 
            icon={<ArrowUpIcon className="w-6 h-6 text-green-400" />}
            currentValue={stats.revenue}
            targetValue={goal?.revenue}
        />
        <SummaryCard title="Gastos" value={formatCurrency(stats.expenses)} icon={<ArrowDownIcon className="w-6 h-6 text-red-400" />} />
      </div>
       <div className="bg-white dark:bg-[#1e1e1e] rounded-[28px] p-5 shadow-sm flex items-center justify-between">
            <div>
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Horas Trabalhadas</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-[#e3e3e3] mt-1">{formatHoursMinutes(stats.totalDurationMs)}</p>
            </div>
             <div className="p-2 bg-gray-50 dark:bg-[#2c2c2c] rounded-full">
                <ClockIcon className="w-6 h-6 text-indigo-400" />
             </div>
        </div>
      {/* Detailed Metrics */}
      <div className="grid grid-cols-3 gap-3">
          <DetailCard title="Lucro/h" value={formatCurrency(stats.profitPerHour)} valueColorClass="text-blue-500 dark:text-blue-400" />
          <DetailCard title="Lucro/km" value={formatCurrency(stats.profitPerKm)} valueColorClass="text-blue-500 dark:text-blue-400" />
          <DetailCard title="Lucro/viagem" value={formatCurrency(stats.profitPerTrip)} valueColorClass="text-blue-500 dark:text-blue-400" />
          <DetailCard title="Faturamento/h" value={formatCurrency(stats.revenuePerHour)} valueColorClass="text-green-500 dark:text-green-400" />
          <DetailCard title="Faturamento/km" value={formatCurrency(stats.revenuePerKm)} valueColorClass="text-green-500 dark:text-green-400" />
          <DetailCard title="Fat./viagem" value={formatCurrency(stats.revenuePerTrip)} valueColorClass="text-green-500 dark:text-green-400" />
          <DetailCard title="Gasto/h" value={formatCurrency(stats.expensesPerHour)} valueColorClass="text-red-500 dark:text-red-400" />
          <DetailCard title="Gasto/km" value={formatCurrency(stats.expensesPerKm)} valueColorClass="text-red-500 dark:text-red-400" />
          <DetailCard title="Gasto/viagem" value={formatCurrency(stats.expensesPerTrip)} valueColorClass="text-red-500 dark:text-red-400" />
          <DetailCard title="Total KM" value={formatNumber(stats.totalKm, 0)} unit="km" valueColorClass="text-gray-700 dark:text-gray-200" />
          <DetailCard title="Consumo Etanol" value={formatNumber(stats.avgEthanolConsumption)} unit="km/l" valueColorClass="text-gray-700 dark:text-gray-200" />
          <DetailCard title="Consumo Gasolina" value={formatNumber(stats.avgGasolineConsumption)} unit="km/l" valueColorClass="text-gray-700 dark:text-gray-200" />
      </div>
    </div>
  );
};

const HistoryList: React.FC = () => {
    const { filteredEntries, filteredShifts, deleteEntry, startEdit, deleteShift, startEditShift, filter } = useAppContext();

    const combinedList = useMemo(() => {
        const entriesWithType = filteredEntries.map(e => ({ type: 'entry' as const, date: e.date, data: e }));
        const shiftsWithType = filteredShifts.map(s => ({ type: 'shift' as const, date: s.start, data: s }));
        
        const allItems = [...entriesWithType, ...shiftsWithType];
        
        allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return allItems;
    }, [filteredEntries, filteredShifts]);

    const handleGenerateReport = () => {
        // Calculate Metrics (Duplicate logic from Dashboard for report independence)
        const revenue = filteredEntries.filter(e => e.type === EntryType.GAIN).reduce((sum, e) => sum + e.amount, 0);
        const expenses = filteredEntries.filter(e => e.type === EntryType.EXPENSE).reduce((sum, e) => sum + e.amount, 0);
        const profit = revenue - expenses;
        const totalDurationMs = filteredShifts.reduce((acc, shift) => acc + calculateShiftDuration(shift, true), 0);
        const totalDurationHours = totalDurationMs / (1000 * 60 * 60);

        const totalTrips = filteredEntries
            .filter(e => e.type === EntryType.GAIN && !e.isReward && e.tripCount)
            .reduce((sum, e) => sum + (e.tripCount || 0), 0);

        const fuelEntries = filteredEntries.filter(e => e.type === EntryType.EXPENSE && e.category === ExpenseCategory.FUEL && e.fuelDetails);
        const totalKm = fuelEntries.reduce((sum, e) => sum + (e.fuelDetails?.distanceDriven || 0), 0);
        
        const profitPerHour = totalDurationHours > 0 ? profit / totalDurationHours : 0;
        const profitPerKm = totalKm > 0 ? profit / totalKm : 0;
        
        const dateRange = getPeriodRange(filter);
        const startStr = formatDateFromNaiveUTC(toNaiveUTCISOString(dateRange.start));
        const endStr = formatDateFromNaiveUTC(toNaiveUTCISOString(dateRange.end));

        const reportWindow = window.open('', 'PRINT', 'height=800,width=1000');

        if (reportWindow) {
            reportWindow.document.write(`
                <html>
                <head>
                    <title>Relatório de Performance - Constant Driver</title>
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #333; background: #fff; }
                        @page { size: A4; margin: 1cm; }
                        .header { background-color: #4338ca; color: white; padding: 30px; margin-bottom: 20px; }
                        .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
                        .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
                        .content { padding: 0 30px 30px; }
                        .section-title { font-size: 16px; font-weight: bold; color: #4338ca; border-bottom: 2px solid #e0e7ff; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
                        
                        /* Metrics Grid */
                        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
                        .metric-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }
                        .metric-card.highlight { background: #eef2ff; border-color: #c7d2fe; }
                        .metric-title { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; margin-bottom: 5px; }
                        .metric-value { font-size: 18px; font-weight: bold; color: #111827; }
                        .metric-value.profit { color: #2563eb; }
                        .metric-value.revenue { color: #16a34a; }
                        .metric-value.expense { color: #dc2626; }
                        
                        /* Table */
                        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
                        th { text-align: left; background-color: #f3f4f6; padding: 10px; font-weight: bold; border-bottom: 1px solid #d1d5db; color: #374151; }
                        td { padding: 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
                        tr:nth-child(even) { background-color: #f9fafb; }
                        .amount-col { text-align: right; font-family: monospace; font-size: 13px; font-weight: 600; }
                        .gain { color: #16a34a; }
                        .expense { color: #dc2626; }
                        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #e5e7eb; color: #374151; margin-right: 5px; }
                        .badge.uber { background: #000; color: #fff; }
                        .badge.fuel { background: #fff7ed; color: #c2410c; }
                        
                        .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                        
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Constant Driver</h1>
                        <p>Relatório de Performance Financeira</p>
                        <p style="margin-top: 10px; font-size: 12px;">Período: ${startStr} até ${endStr}</p>
                    </div>
                    
                    <div class="content">
                        <div class="section-title">Resumo Executivo</div>
                        <div class="metrics-grid">
                            <div class="metric-card highlight">
                                <div class="metric-title">Lucro Líquido</div>
                                <div class="metric-value profit">${formatCurrency(profit)}</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-title">Faturamento Total</div>
                                <div class="metric-value revenue">${formatCurrency(revenue)}</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-title">Despesas Totais</div>
                                <div class="metric-value expense">${formatCurrency(expenses)}</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-title">Horas Trabalhadas</div>
                                <div class="metric-value">${formatHoursMinutes(totalDurationMs)}</div>
                            </div>
                        </div>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-title">Lucro / Hora</div>
                                <div class="metric-value">${formatCurrency(profitPerHour)}</div>
                            </div>
                             <div class="metric-card">
                                <div class="metric-title">Lucro / KM</div>
                                <div class="metric-value">${formatCurrency(profitPerKm)}</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-title">KM Total</div>
                                <div class="metric-value">${formatNumber(totalKm, 0)} km</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-title">Total Viagens</div>
                                <div class="metric-value">${totalTrips}</div>
                            </div>
                        </div>

                        <div class="section-title">Extrato de Lançamentos</div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 15%">Data</th>
                                    <th style="width: 10%">Tipo</th>
                                    <th style="width: 45%">Descrição / Detalhes</th>
                                    <th style="width: 30%; text-align: right;">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${combinedList.map(item => {
                                    if (item.type === 'entry') {
                                        const entry = item.data;
                                        const typeLabel = entry.type === EntryType.GAIN ? 'Entrada' : 'Saída';
                                        const badgeClass = entry.type === EntryType.GAIN ? 'badge uber' : 'badge fuel'; // Simplified
                                        const amountClass = entry.type === EntryType.GAIN ? 'gain' : 'expense';
                                        
                                        let details = '';
                                        if (entry.type === EntryType.GAIN) {
                                            details = `
                                                ${entry.platform ? `<span class="badge uber">${entry.platform}</span>` : ''}
                                                ${entry.tripCount ? `<span class="badge">${entry.tripCount} corridas</span>` : ''}
                                                ${entry.description || ''}
                                            `;
                                        } else {
                                            details = `
                                                ${entry.category ? `<span class="badge">${entry.category}</span>` : ''}
                                                ${entry.description || ''}
                                                ${entry.fuelDetails ? `<br/><span style="font-size: 10px; color: #666;">${entry.fuelDetails.fuelType} | ${entry.fuelDetails.distanceDriven}km | ${formatCurrency(entry.fuelDetails.pricePerLiter)}/L</span>` : ''}
                                            `;
                                        }

                                        return `
                                            <tr>
                                                <td>${formatDateFromNaiveUTC(entry.date)}</td>
                                                <td>${typeLabel}</td>
                                                <td>${details}</td>
                                                <td class="amount-col ${amountClass}">${entry.type === EntryType.EXPENSE ? '- ' : ''}${formatCurrency(entry.amount)}</td>
                                            </tr>
                                        `;
                                    } else {
                                        // Shifts not included in the table for a cleaner financial report, or could be added.
                                        // Let's exclude for now to focus on financial listing as per request "commercial format"
                                        return '';
                                    }
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="footer">
                        <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')} via Constant Driver App</p>
                    </div>
                </body>
                </html>
            `);
            reportWindow.document.close();
            reportWindow.focus();
            reportWindow.print();
            reportWindow.close();
        }
    };

    const handleExportCSV = () => {
        if (combinedList.length === 0) {
            alert("Não há dados para exportar no período selecionado.");
            return;
        }

        const escapeCSV = (str: any): string => {
            if (str === null || str === undefined) return '';
            let value = String(str);
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const headers = [
            'Data', 'Tipo', 'Título', 'Descrição', 'Valor (R$)',
            'Plataforma', 'Nº Corridas', 'Recompensa',
            'Categoria Gasto', 'Tipo Combustível', 'Preço/L (R$)', 'Consumo (km/l)', 'KM Rodados',
            'Hora Início', 'Hora Fim', 'Duração Pausas', 'Duração Líquida'
        ];

        const rows = combinedList.map(item => {
            const row: (string | number | undefined)[] = Array(headers.length).fill('');
            if (item.type === 'entry') {
                const entry = item.data;
                row[0] = formatDateFromNaiveUTC(entry.date);
                row[1] = entry.type === EntryType.GAIN ? 'Ganho' : 'Gasto';
                row[2] = entry.type === EntryType.EXPENSE && entry.category === ExpenseCategory.FUEL
                    ? 'Combustível'
                    : entry.description || (entry.type === EntryType.GAIN ? entry.platform || "Ganho" : entry.category || "Gasto");
                row[3] = entry.description;
                row[4] = entry.amount.toFixed(2).replace('.', ',');

                if (entry.type === EntryType.GAIN) {
                    row[5] = entry.platform;
                    row[6] = entry.tripCount;
                    row[7] = entry.isReward ? 'Sim' : 'Não';
                } else if (entry.type === EntryType.EXPENSE) {
                    row[8] = entry.category;
                    if (entry.fuelDetails) {
                        row[9] = entry.fuelDetails.fuelType;
                        row[10] = entry.fuelDetails.pricePerLiter.toFixed(2).replace('.', ',');
                        row[11] = entry.fuelDetails.avgConsumption.toFixed(2).replace('.', ',');
                        row[12] = entry.fuelDetails.distanceDriven;
                    }
                }
            } else if (item.type === 'shift') {
                const shift = item.data;
                row[0] = formatDateFromNaiveUTC(shift.start);
                row[1] = 'Jornada';
                row[2] = 'Jornada de Trabalho';
                row[13] = formatTimeFromNaiveUTC(shift.start);
                row[14] = shift.end ? formatTimeFromNaiveUTC(shift.end) : '';
                row[15] = formatHoursMinutes(calculatePauseDuration(shift));
                row[16] = formatHoursMinutes(calculateShiftDuration(shift, true));
            }
            return row.map(escapeCSV).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `historico_constant_driver_${date}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
  
    return (
      <div className="space-y-4 pb-20">
        <PeriodFilter />
        <div className="flex justify-end items-center gap-2">
            <button
              onClick={handleGenerateReport}
              aria-label="Gerar Relatório PDF"
              title="Gerar Relatório PDF"
              className="bg-gray-200 dark:bg-[#2c2c2c] hover:bg-gray-300 dark:hover:bg-[#3e3e3e] text-indigo-500 dark:text-indigo-400 p-3 rounded-2xl transition-colors flex items-center gap-2"
            >
              <PrinterIcon className="w-6 h-6" />
              <span className="text-sm font-semibold hidden sm:inline">Relatório PDF</span>
            </button>
            <button
              onClick={handleExportCSV}
              aria-label="Exportar dados em formato CSV"
              title="Exportar CSV"
              className="bg-gray-200 dark:bg-[#2c2c2c] hover:bg-gray-300 dark:hover:bg-[#3e3e3e] text-indigo-500 dark:text-indigo-400 p-3 rounded-2xl transition-colors"
            >
              <DocumentArrowDownIcon className="w-6 h-6" />
            </button>
        </div>
        <div className="space-y-3">
          {combinedList.length > 0 ? (
            combinedList.map(item => {
                if (item.type === 'entry') {
                    const entry = item.data;
                    return (
                      <div key={`entry-${entry.id}`} className="bg-white dark:bg-[#1e1e1e] rounded-[24px] p-4 flex justify-between items-center shadow-sm">
                        <div className="flex items-center space-x-4 overflow-hidden">
                            <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${entry.type === EntryType.GAIN ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {entry.type === EntryType.GAIN ? <ArrowUpIcon className="w-6 h-6"/> : <ArrowDownIcon className="w-6 h-6"/>}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-gray-900 dark:text-[#e3e3e3] truncate text-base">
                                    {entry.type === EntryType.EXPENSE && entry.category === ExpenseCategory.FUEL
                                        ? 'Combustível'
                                        : entry.description || 
                                          (entry.type === EntryType.GAIN 
                                            ? entry.platform || "Ganho" 
                                            : entry.category || "Gasto")
                                    }
                                </p>
                                <div className="flex items-center space-x-2 flex-wrap mt-0.5">
                                   <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateFromNaiveUTC(entry.date)}</p>
                                   
                                   {entry.type === EntryType.GAIN && entry.platform && (entry.description || entry.tripCount) && (
                                        <>
                                            <span className="text-gray-400 dark:text-gray-600">&bull;</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#2c2c2c] px-2 py-0.5 rounded-full">{entry.platform}</span>
                                        </>
                                   )}
                                   
                                   {entry.type === EntryType.GAIN && (
                                        <>
                                            {entry.isReward ? (
                                                <>
                                                    <span className="text-gray-400 dark:text-gray-600">&bull;</span>
                                                    <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-0.5 rounded-full">Recompensa</span>
                                                </>
                                            ) : (
                                                typeof entry.tripCount === 'number' && entry.tripCount > 0 && (
                                                    <>
                                                        <span className="text-gray-400 dark:text-gray-600">&bull;</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">({entry.tripCount} {entry.tripCount === 1 ? 'corrida' : 'corridas'})</span>
                                                    </>
                                                )
                                            )}
                                        </>
                                   )}

                                   {entry.type === EntryType.EXPENSE && entry.category !== ExpenseCategory.FUEL && entry.category && entry.description && (
                                        <>
                                            <span className="text-gray-400 dark:text-gray-600">&bull;</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#2c2c2c] px-2 py-0.5 rounded-full">{entry.category}</span>
                                        </>
                                    )}

                                   {entry.type === EntryType.EXPENSE && entry.category === ExpenseCategory.FUEL && entry.fuelDetails && (
                                        <>
                                            <span className="text-gray-400 dark:text-gray-600">&bull;</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{entry.fuelDetails.fuelType}</span>
                                        </>
                                    )}
                                </div>
                                 {entry.fuelDetails && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {entry.fuelDetails.distanceDriven}km &bull; {formatCurrency(entry.fuelDetails.pricePerLiter)}/L &bull; {entry.fuelDetails.avgConsumption}km/L
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                            <p className={`font-bold text-base ${entry.type === EntryType.GAIN ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                {formatCurrency(entry.amount)}
                            </p>
                            <div className="flex space-x-1">
                                <button onClick={() => startEdit(entry)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteEntry(entry.id)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                      </div>
                    );
                } else { // item.type === 'shift'
                    const shift = item.data;
                    const shiftDuration = calculateShiftDuration(shift, true);
                    const pauseDuration = calculatePauseDuration(shift);
                    return (
                         <div key={`shift-${shift.id}`} className="bg-white dark:bg-[#1e1e1e] rounded-[24px] p-4 flex justify-between items-center shadow-sm">
                            <div className="flex items-center space-x-4 overflow-hidden">
                                <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center bg-indigo-500/10 text-indigo-400">
                                    <ClockIcon className="w-6 h-6"/>
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-semibold text-gray-900 dark:text-[#e3e3e3] truncate text-base">Jornada de Trabalho</p>
                                    <div className="flex items-center space-x-2 flex-wrap mt-0.5">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateFromNaiveUTC(shift.start)}</p>
                                        <span className="text-gray-400 dark:text-gray-600">&bull;</span>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatTimeFromNaiveUTC(shift.start)}
                                            {shift.end ? ` - ${formatTimeFromNaiveUTC(shift.end)}` : ''}
                                        </p>
                                    </div>
                                     {pauseDuration > 0 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Pausa: {formatHoursMinutes(pauseDuration)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                                <p className="font-bold text-base text-indigo-500 dark:text-indigo-400">
                                    {formatHoursMinutes(shiftDuration)}
                                </p>
                                <div className="flex space-x-1">
                                    <button onClick={() => startEditShift(shift)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => deleteShift(shift.id)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                }
            })
          ) : (
            <p className="text-center text-gray-500 pt-10">Nenhum lançamento no período selecionado.</p>
          )}
        </div>
      </div>
    );
  };
  
interface SettingsProps {
  clearAllData: () => void;
  entries: Entry[];
  shifts: Shift[];
  goals: Goals;
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>;
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  setGoals: React.Dispatch<React.SetStateAction<Goals>>;
}

const Settings: React.FC<SettingsProps> = ({ clearAllData, entries, shifts, goals, setEntries, setShifts, setGoals }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const backupData = { entries, shifts, goals, version: 1 };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `backup_motorista_app_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File content is not text.");
        
        const importedData = JSON.parse(text);

        if (!('entries' in importedData && 'shifts' in importedData && 'goals' in importedData) || 
            !Array.isArray(importedData.entries) || 
            !Array.isArray(importedData.shifts) || 
            typeof importedData.goals !== 'object') {
          throw new Error("Arquivo de backup inválido ou corrompido.");
        }

        if (window.confirm("Importar este backup irá substituir todos os dados atuais. Deseja continuar?")) {
          setEntries(importedData.entries);
          setShifts(importedData.shifts);
          setGoals(importedData.goals);
          alert("Backup importado com sucesso!");
        }
      } catch (error) {
        console.error("Erro ao importar backup:", error);
        alert(`Falha ao importar o backup: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-[28px] p-5 shadow-sm">
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-[#e3e3e3]">Backup e Restauração</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Salve seus dados em um arquivo ou restaure a partir de um backup anterior.</p>
        <div className="space-y-3">
          <button
            onClick={handleExport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Exportar Backup
          </button>
          <button
            onClick={handleImportClick}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <ArrowUpTrayIcon className="w-5 h-5" />
            Importar Backup
          </button>
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="application/json"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] rounded-[28px] p-5 shadow-sm">
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-[#e3e3e3]">Gerenciamento de Dados</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Cuidado, esta ação é irreversível.</p>
        <button
            onClick={clearAllData}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold py-3 px-4 rounded-full transition-colors"
        >
            Apagar Todos os Dados
        </button>
      </div>
    </div>
  );
};


const PeriodFilter: React.FC = () => {
    const { filter, setFilter } = useAppContext();
    const periods: { key: Period; label: string }[] = [
      { key: 'today', label: 'Hoje' },
      { key: 'yesterday', label: 'Ontem' },
      { key: 'this_week', label: 'Esta Sem' },
      { key: 'last_7_days', label: '7 Dias' },
      { key: 'this_month', label: 'Este Mês' },
      { key: 'last_30_days', label: '30 Dias' },
      { key: 'all', label: 'Todos' },
      { key: 'custom', label: 'Outro' },
    ];
  
    const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilter(f => ({
            ...f,
            customRange: {
                ...f.customRange,
                [name]: value,
            }
        }));
    };

    return (
      <div className="pb-2">
        <div className="grid grid-cols-4 gap-2 px-1">
          {periods.map(p => (
            <button
              key={p.key}
              data-period-key={p.key}
              onClick={() => setFilter(f => ({ ...f, period: p.key }))}
              className={`px-1 py-2 text-[10px] sm:text-xs font-bold rounded-full transition-all border border-transparent flex justify-center items-center truncate ${
                filter.period === p.key 
                ? 'bg-indigo-500 text-white shadow-md' 
                : 'bg-white dark:bg-[#2c2c2c] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3e3e3e]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {filter.period === 'custom' && (
            <div className="mt-4 grid grid-cols-2 gap-4 bg-white dark:bg-[#1e1e1e] p-4 rounded-[24px]">
                <div>
                    <label htmlFor="start" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">De:</label>
                    <input
                        type="date"
                        id="start"
                        name="start"
                        value={filter.customRange.start}
                        onChange={handleCustomDateChange}
                        className="mt-1 block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3 appearance-none"
                    />
                </div>
                <div>
                    <label htmlFor="end" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">Até:</label>
                    <input
                        type="date"
                        id="end"
                        name="end"
                        value={filter.customRange.end}
                        onChange={handleCustomDateChange}
                        className="mt-1 block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3 appearance-none"
                    />
                </div>
            </div>
        )}
      </div>
    );
  };
  

const BottomNav: React.FC<{ activeView: View; setActiveView: (view: View) => void }> = ({ activeView, setActiveView }) => {
  const navItems = [
    { id: 'dashboard', icon: HomeIcon, label: 'Início' },
    { id: 'history', icon: ListIcon, label: 'Histórico' },
    { id: 'insights', icon: DocumentChartBarIcon, label: 'Insights' },
    { id: 'goals', icon: TargetIcon, label: 'Metas' },
    { id: 'settings', icon: SettingsIcon, label: 'Ajustes' },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1e1e1e] border-t border-gray-100 dark:border-[#2c2c2c] pb-safe pt-2 px-2 z-20">
      <div className="flex justify-around max-w-lg mx-auto pb-2">
        {navItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className="flex flex-col items-center justify-center w-full group"
              >
                <div className={`px-5 py-1 rounded-full mb-1 transition-colors duration-200 ${isActive ? 'bg-indigo-500/20' : 'bg-transparent'}`}>
                    <item.icon className={`w-6 h-6 transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'}`} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>{item.label}</span>
              </button>
            );
        })}
      </div>
    </nav>
  );
};

const FloatingActionButton: React.FC<{ onOpenModal: (type: ModalType) => void }> = ({ onOpenModal }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="fixed bottom-24 right-4 z-20">
      <div className="relative">
        {isOpen && (
          <div className="flex flex-col items-end space-y-3 mb-3">
            <FabAction label="Ganho" onClick={() => { onOpenModal('gain'); setIsOpen(false); }} icon={<ArrowUpIcon className="w-6 h-6"/>} colorClass="text-green-400" />
            <FabAction label="Gasto" onClick={() => { onOpenModal('expense'); setIsOpen(false); }} icon={<ArrowDownIcon className="w-6 h-6"/>} colorClass="text-red-400" />
            <FabAction label="Jornada" onClick={() => { onOpenModal('shift'); setIsOpen(false); }} icon={<ClockIcon className="w-6 h-6"/>} colorClass="text-indigo-400" />
          </div>
        )}
        <button
          onClick={toggleMenu}
          className={`w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transform transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
        >
          <PlusIcon className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

const FabAction: React.FC<{label: string, onClick: () => void, icon: React.ReactNode, colorClass?: string}> = ({label, onClick, icon, colorClass = 'text-indigo-400'}) => (
    <button onClick={onClick} className={`w-12 h-12 rounded-2xl bg-white dark:bg-[#2c2c2c] ${colorClass} flex items-center justify-center shadow-md hover:bg-gray-50 dark:hover:bg-[#3e3e3e]`} aria-label={label}>
        {icon}
    </button>
);


const ModalContainer: React.FC<{ type: ModalType; onClose: () => void; entryToEdit: Entry | null; shiftToEdit: Shift | null; }> = ({ type, onClose, entryToEdit, shiftToEdit }) => {
  const isEditing = !!entryToEdit || !!shiftToEdit;
  let title = '';
  if (type === 'gain') title = entryToEdit ? 'Editar Ganho' : 'Adicionar Ganho';
  else if (type === 'expense') title = entryToEdit ? 'Editar Gasto' : 'Adicionar Gasto';
  else if (type === 'shift') title = shiftToEdit ? 'Editar Jornada' : 'Adicionar Jornada';
  else if (type === 'goals') title = 'Definir Metas';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 flex justify-center items-end sm:items-center p-0 sm:p-4">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-t-[28px] sm:rounded-[28px] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-[#2c2c2c]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-[#e3e3e3]">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {(type === 'gain' || type === 'expense') && <AddEntryForm type={type === 'gain' ? EntryType.GAIN : EntryType.EXPENSE} onClose={onClose} entryToEdit={entryToEdit} />}
          {type === 'shift' && <ShiftManager onClose={onClose} shiftToEdit={shiftToEdit} />}
          {type === 'goals' && <SetGoalsForm onClose={onClose} />}
        </div>
      </div>
    </div>
  );
};

const AddEntryForm: React.FC<{ type: EntryType; onClose: () => void; entryToEdit: Entry | null }> = ({ type, onClose, entryToEdit }) => {
  const { addEntry, updateEntry } = useAppContext();
  const isEditing = !!entryToEdit;

  const [date, setDate] = useState(getLocalDateISOString());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FUEL);

  // State for gain form
  const [platform, setPlatform] = useState<Platform>(Platform.UBER);
  const [tripCount, setTripCount] = useState('');
  const [isReward, setIsReward] = useState(false);

  // State for fuel form
  const [fuelType, setFuelType] = useState<FuelType>(FuelType.ETHANOL);
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [avgConsumption, setAvgConsumption] = useState('');
  const [distanceDriven, setDistanceDriven] = useState('');

  useEffect(() => {
    if (entryToEdit) {
      setDate(entryToEdit.date.split('T')[0]);
      setAmount(entryToEdit.amount.toString().replace('.', ','));
      setDescription(entryToEdit.description || '');

      if (entryToEdit.type === EntryType.GAIN) {
        setPlatform(entryToEdit.platform || Platform.UBER);
        setTripCount(entryToEdit.tripCount?.toString() || '');
        setIsReward(entryToEdit.isReward || false);
      }

      if (entryToEdit.type === EntryType.EXPENSE) {
        setCategory(entryToEdit.category || ExpenseCategory.OTHER);
        if (entryToEdit.category === ExpenseCategory.FUEL && entryToEdit.fuelDetails) {
          setFuelType(entryToEdit.fuelDetails.fuelType);
          setPricePerLiter(entryToEdit.fuelDetails.pricePerLiter.toString().replace('.', ','));
          setAvgConsumption(entryToEdit.fuelDetails.avgConsumption.toString().replace('.', ','));
          setDistanceDriven(entryToEdit.fuelDetails.distanceDriven.toString().replace('.', ','));
        }
      }
    }
  }, [entryToEdit]);

  // Auto-calculate amount for fuel
  useEffect(() => {
    if (type === EntryType.EXPENSE && category === ExpenseCategory.FUEL) {
      const price = parseFloat(pricePerLiter.replace(',', '.'));
      const consumption = parseFloat(avgConsumption.replace(',', '.'));
      const distance = parseFloat(distanceDriven.replace(',', '.'));

      if (price > 0 && consumption > 0 && distance > 0) {
        const totalAmount = (distance / consumption) * price;
        setAmount(totalAmount.toFixed(2).replace('.', ','));
      } else if (!isEditing) {
        setAmount('');
      }
    }
  }, [type, category, pricePerLiter, avgConsumption, distanceDriven, isEditing]);


  // Clear trip count if gain is a reward
  useEffect(() => {
    if (isReward) {
        setTripCount('');
    }
  }, [isReward]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
        alert("Por favor, selecione uma data para o lançamento.");
        return;
    }
    const isFuel = type === EntryType.EXPENSE && category === ExpenseCategory.FUEL;
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) return;

    const [year, month, day] = date.split('-').map(Number);
    let entryDate: Date;

    // Always set time to 12:00:00 to avoid timezone shifts
    entryDate = new Date(year, month - 1, day, 12, 0, 0);

    const entryData = {
      type,
      amount: numericAmount,
      description,
      date: toNaiveUTCISOString(entryDate),
      category: type === EntryType.EXPENSE ? category : undefined,
      fuelDetails: undefined as FuelDetails | undefined,
      platform: undefined as Platform | undefined,
      tripCount: undefined as number | undefined,
      isReward: undefined as boolean | undefined,
    };

    if (isFuel) {
      const priceNum = parseFloat(pricePerLiter.replace(',', '.'));
      const consumptionNum = parseFloat(avgConsumption.replace(',', '.'));
      const distanceNum = parseFloat(distanceDriven.replace(',', '.'));

      if (!priceNum || priceNum <= 0 || !consumptionNum || consumptionNum <= 0 || !distanceNum || distanceNum <= 0) {
        alert("Por favor, preencha todos os detalhes do combustível com valores válidos.");
        return;
      }
      
      entryData.fuelDetails = {
        fuelType,
        pricePerLiter: priceNum,
        avgConsumption: consumptionNum,
        distanceDriven: distanceNum,
      };
    }
    
    if (type === EntryType.GAIN) {
        entryData.platform = platform;
        entryData.isReward = isReward;
        entryData.tripCount = isReward ? undefined : (tripCount ? parseInt(tripCount, 10) : undefined);
    }

    if (isEditing && entryToEdit) {
      updateEntry({ ...entryToEdit, ...entryData });
    } else {
      addEntry(entryData as Omit<Entry, 'id'>);
    }

    onClose();
  };

  const expenseCategories = Object.values(ExpenseCategory);
  const fuelTypes = Object.values(FuelType);
  const platforms = Object.values(Platform);
  
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="entryDate" className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Data</label>
        <input
          type="date"
          id="entryDate"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3 appearance-none"
        />
      </div>

      {type === EntryType.EXPENSE && (
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-2">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {expenseCategories.map(cat => (
              <button
                type="button"
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors border border-transparent ${
                  category === cat 
                    ? 'bg-indigo-500 text-white shadow-md' 
                    : 'bg-gray-100 dark:bg-[#2c2c2c] text-gray-600 dark:text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === EntryType.EXPENSE && category === ExpenseCategory.FUEL ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-2">Tipo de Combustível</label>
            <div className="flex flex-wrap gap-2">
              {fuelTypes.map(ft => (
                <button
                  type="button"
                  key={ft}
                  onClick={() => setFuelType(ft)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors border border-transparent ${
                    fuelType === ft 
                        ? 'bg-indigo-500 text-white shadow-md' 
                        : 'bg-gray-100 dark:bg-[#2c2c2c] text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pricePerLiter" className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Preço/L (R$)</label>
              <input type="text" id="pricePerLiter" value={pricePerLiter} onChange={e => setPricePerLiter(e.target.value)} placeholder="5,89" className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3" inputMode="decimal" />
            </div>
            <div>
              <label htmlFor="avgConsumption" className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Consumo (km/l)</label>
              <input type="text" id="avgConsumption" value={avgConsumption} onChange={e => setAvgConsumption(e.target.value)} placeholder="10,5" className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3" inputMode="decimal" />
            </div>
          </div>
          <div>
            <label htmlFor="distanceDriven" className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">KM Rodados</label>
            <input type="text" id="distanceDriven" value={distanceDriven} onChange={e => setDistanceDriven(e.target.value)} placeholder="300" className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3" inputMode="decimal" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Total Calculado</label>
            <div className="p-3 bg-gray-50 dark:bg-[#2c2c2c] rounded-2xl text-gray-900 dark:text-white text-lg font-bold h-12 flex items-center">
              {formatCurrency(parseFloat(amount.replace(',', '.')) || 0)}
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Valor (R$)</label>
            <input type="text" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3" inputMode="decimal" />
          </div>
          {type === EntryType.GAIN && (
             <>
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-2">Plataforma</label>
                    <div className="flex flex-wrap gap-2">
                        {platforms.map(p => {
                            const isActive = platform === p;
                            // Add 'border-transparent' to base classes to reserve space
                            const baseInactiveClasses = 'bg-gray-100 dark:bg-[#2c2c2c] text-gray-600 dark:text-gray-300 border-transparent';
                            let activeClasses = '';

                            switch(p) {
                                case Platform.UBER:
                                    // Uber has a visible border, remove 'border' keyword here as it will be in main className
                                    activeClasses = 'bg-black text-white border-gray-600 dark:border-gray-500';
                                    break;
                                case Platform.NINE_NINE:
                                    // Removed font-bold to prevent width jump, added border-transparent
                                    activeClasses = 'bg-yellow-400 text-black font-semibold border-transparent';
                                    break;
                                default: // Platform.PARTICULAR
                                    // Explicit transparent border
                                    activeClasses = 'bg-indigo-500 text-white border-transparent';
                                    break;
                            }
                            
                            return (
                                <button
                                    type="button"
                                    key={p}
                                    onClick={() => setPlatform(p)}
                                    // Added 'border' fixed class so all have 1px border (transparent or colored)
                                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors border ${
                                        isActive ? activeClasses : baseInactiveClasses
                                    }`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center mt-2 px-1">
                    <input
                        id="isReward"
                        name="isReward"
                        type="checkbox"
                        checked={isReward}
                        onChange={(e) => setIsReward(e.target.checked)}
                        className="h-5 w-5 rounded-md border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-[#2c2c2c] text-indigo-600 focus:ring-0"
                    />
                    <label htmlFor="isReward" className="ml-3 block text-sm text-gray-600 dark:text-gray-300 font-medium">
                        Recompensa (bônus, indicação)
                    </label>
                </div>
                <div>
                    <label htmlFor="tripCount" className={`block text-sm font-medium ml-1 mb-1 ${isReward ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Total de Corridas</label>
                    <input 
                        type="number" 
                        id="tripCount" 
                        value={tripCount} 
                        onChange={e => setTripCount(e.target.value)} 
                        placeholder="10" 
                        className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3 disabled:opacity-50" 
                        inputMode="numeric" 
                        disabled={isReward}
                    />
                </div>
            </>
          )}
          
          {(type === EntryType.GAIN || (type === EntryType.EXPENSE && category === ExpenseCategory.OTHER)) && (
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Descrição (Opcional)</label>
                <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === EntryType.GAIN ? "Ex: Dinâmico" : "Ex: Detalhes do gasto"} className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3" />
            </div>
          )}
        </>
      )}

      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-full transition-colors shadow-md mt-2"
      >
        {isEditing ? 'Salvar Alterações' : 'Salvar'}
      </button>
    </form>
  );
};

const ShiftManager: React.FC<{ onClose: () => void; shiftToEdit: Shift | null }> = ({ onClose, shiftToEdit }) => {
    const { addShift, updateShift } = useAppContext();
    const isEditing = !!shiftToEdit;
    const [date, setDate] = useState(getLocalDateISOString());
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [pauses, setPauses] = useState<{ id: number; start: string; end: string }[]>([]);
    const [nextPauseId, setNextPauseId] = useState(0);

    useEffect(() => {
        if (shiftToEdit) {
            setDate(shiftToEdit.start.split('T')[0]);
            setStartTime(formatTimeFromNaiveUTC(shiftToEdit.start));
            if (shiftToEdit.end) {
                setEndTime(formatTimeFromNaiveUTC(shiftToEdit.end));
            }

            const formattedPauses = shiftToEdit.pauses.map((p, index) => ({
                id: index,
                start: formatTimeFromNaiveUTC(p.start),
                end: formatTimeFromNaiveUTC(p.end)
            }));
            setPauses(formattedPauses);
            setNextPauseId(formattedPauses.length);
        }
    }, [shiftToEdit]);

    const handleAddPause = () => {
        setPauses(p => [...p, { id: nextPauseId, start: '', end: '' }]);
        setNextPauseId(id => id + 1);
    };

    const handleRemovePause = (id: number) => {
        setPauses(p => p.filter(pause => pause.id !== id));
    };

    const handlePauseChange = (id: number, field: 'start' | 'end', value: string) => {
        setPauses(p => p.map(pause => (pause.id === id ? { ...pause, [field]: value } : pause)));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !startTime || !endTime) {
            alert("Por favor, preencha a data, início e fim da jornada.");
            return;
        }

        const [year, month, day] = date.split('-').map(Number);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const shiftStartDate = new Date(year, month - 1, day, startHour, startMinute);
        let shiftEndDate = new Date(year, month - 1, day, endHour, endMinute);

        // Adjust shift end date if it crosses midnight
        if (shiftEndDate < shiftStartDate) {
            shiftEndDate.setDate(shiftEndDate.getDate() + 1);
        }

        const newShiftData: Omit<Shift, 'id'> = {
            start: toNaiveUTCISOString(shiftStartDate),
            end: toNaiveUTCISOString(shiftEndDate),
            pauses: pauses
                .filter(p => p.start && p.end)
                .map(p => {
                    const [pauseStartHour, pauseStartMinute] = p.start.split(':').map(Number);
                    const [pauseEndHour, pauseEndMinute] = p.end.split(':').map(Number);

                    let pauseStartDate = new Date(year, month - 1, day, pauseStartHour, pauseStartMinute);
                    let pauseEndDate = new Date(year, month - 1, day, pauseEndHour, pauseEndMinute);

                    // If a pause's start time is earlier than the shift's start time,
                    // it must belong to the next day.
                    if (pauseStartDate < shiftStartDate) {
                        pauseStartDate.setDate(pauseStartDate.getDate() + 1);
                        pauseEndDate.setDate(pauseEndDate.getDate() + 1); // Also move the end date forward
                    }
                    
                    // Now handle cases where the pause itself crosses midnight
                    if (pauseEndDate < pauseStartDate) {
                        pauseEndDate.setDate(pauseEndDate.getDate() + 1);
                    }

                    return {
                        start: toNaiveUTCISOString(pauseStartDate),
                        end: toNaiveUTCISOString(pauseEndDate),
                    };
                }),
        };

        if (isEditing && shiftToEdit) {
            updateShift({ ...shiftToEdit, ...newShiftData });
        } else {
            addShift(newShiftData);
        }
        
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Data</label>
                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3 appearance-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Início</label>
                    <input type="time" id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} required className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3 appearance-none" />
                </div>
                <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Fim</label>
                    <input type="time" id="endTime" value={endTime} onChange={e => setEndTime(e.target.value)} required className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3 appearance-none" />
                </div>
            </div>

            <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-2">Pausas</h3>
                <div className="space-y-3">
                    {pauses.map((pause, index) => (
                        <div key={pause.id} className="flex items-center gap-2">
                            <input type="time" value={pause.start} onChange={e => handlePauseChange(pause.id, 'start', e.target.value)} className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3 appearance-none" placeholder="Início" />
                            <span className="text-gray-400">-</span>
                            <input type="time" value={pause.end} onChange={e => handlePauseChange(pause.id, 'end', e.target.value)} className="block w-full bg-gray-100 dark:bg-[#2c2c2c] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3 appearance-none" placeholder="Fim" />
                            <button type="button" onClick={() => handleRemovePause(pause.id)} className="p-3 bg-red-500/10 rounded-2xl text-red-500 hover:bg-red-500/20 transition-colors">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={handleAddPause} className="mt-3 w-full text-indigo-500 dark:text-indigo-400 font-semibold py-3 px-4 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#2c2c2c] transition-colors">
                    Adicionar Pausa
                </button>
            </div>

            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-full transition-colors shadow-md mt-2">
                {isEditing ? 'Salvar Alterações' : 'Salvar Jornada'}
            </button>
        </form>
    );
};

const GoalsView: React.FC<{ onOpenModal: (type: ModalType) => void }> = ({ onOpenModal }) => {
  const { goals, entries, shifts } = useAppContext();

  const getStatsForPeriod = useCallback((period: Period): { profit: number, revenue: number, hours: number } => {
    const range = getPeriodRange({ period, customRange: { start: '', end: '' } });
    const periodEntries = entries.filter(e => {
        const entryDate = new Date(e.date);
        return entryDate >= range.start && entryDate <= range.end;
    });
    const periodShifts = shifts.filter(s => {
        const shiftStartDate = new Date(s.start);
        return shiftStartDate >= range.start && shiftStartDate <= range.end;
    });

    const revenue = periodEntries.filter(e => e.type === EntryType.GAIN).reduce((sum, e) => sum + e.amount, 0);
    const expenses = periodEntries.filter(e => e.type === EntryType.EXPENSE).reduce((sum, e) => sum + e.amount, 0);
    const profit = revenue - expenses;
    const totalDurationMs = periodShifts.reduce((acc, shift) => acc + calculateShiftDuration(shift, true), 0);
    const hours = totalDurationMs / (1000 * 60 * 60);

    return { profit, revenue, hours };
  }, [entries, shifts]);

  const dailyStats = useMemo(() => getStatsForPeriod('today'), [getStatsForPeriod]);
  const weeklyStats = useMemo(() => getStatsForPeriod('this_week'), [getStatsForPeriod]);
  const monthlyStats = useMemo(() => getStatsForPeriod('this_month'), [getStatsForPeriod]);

  const activeGoals = [
    { period: 'Diária', goal: goals.daily.profit, current: dailyStats.profit, title: 'Lucro Diário', format: formatCurrency },
    { period: 'Diária', goal: goals.daily.revenue, current: dailyStats.revenue, title: 'Faturamento Diário', format: formatCurrency },
    { period: 'Semanal', goal: goals.weekly.profit, current: weeklyStats.profit, title: 'Lucro Semanal', format: formatCurrency },
    { period: 'Semanal', goal: goals.weekly.revenue, current: weeklyStats.revenue, title: 'Faturamento Semanal', format: formatCurrency },
    { period: 'Mensal', goal: goals.monthly.profit, current: monthlyStats.profit, title: 'Lucro Mensal', format: formatCurrency },
    { period: 'Mensal', goal: goals.monthly.revenue, current: monthlyStats.revenue, title: 'Faturamento Mensal', format: formatCurrency },
  ].filter(g => typeof g.goal === 'number' && g.goal > 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-end items-center">
        <button
          onClick={() => onOpenModal('goals')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-full transition-colors shadow-md flex items-center gap-2"
        >
          <TargetIcon className="w-5 h-5" />
          Definir Metas
        </button>
      </div>

      {activeGoals.length > 0 ? (
        <div className="space-y-4">
          {activeGoals.map((g, index) => (
            <GoalProgressCard key={index} title={g.title} currentValue={g.current} targetValue={g.goal!} format={g.format} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 pt-10">
          <div className="bg-gray-100 dark:bg-[#2c2c2c] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
            <TargetIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="mt-4 font-medium">Você ainda não definiu nenhuma meta.</p>
          <p className="text-sm mt-1">Clique em "Definir Metas" para começar.</p>
        </div>
      )}
    </div>
  );
};

const GoalProgressCard: React.FC<{ title: string; currentValue: number; targetValue: number; format: (value: number) => string; }> = ({ title, currentValue, targetValue, format }) => {
  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  const progressClamped = currentValue < 0 ? 0 : Math.min(100, progress);

  return (
    <div className="bg-white dark:bg-[#1e1e1e] p-5 rounded-[28px] shadow-sm">
      <div className="flex justify-between items-baseline mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-[#e3e3e3]">{title}</h3>
        <span className="text-sm font-medium text-indigo-500 dark:text-indigo-400">{Math.floor(progress)}%</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-[#333] rounded-full h-3">
        <div className="bg-indigo-500 h-3 rounded-full" style={{ width: `${progressClamped}%` }}></div>
      </div>
      <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
        {format(currentValue)} / {format(targetValue)}
      </div>
    </div>
  );
};

const SetGoalsForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { goals, updateGoals } = useAppContext();
    const [localGoals, setLocalGoals] = useState(goals);

    const handleChange = (period: 'daily' | 'weekly' | 'monthly', type: 'profit' | 'revenue', value: string) => {
        const numericValue = value ? parseFloat(value) : undefined;
        setLocalGoals(prev => ({
            ...prev,
            [period]: {
                ...prev[period],
                [type]: numericValue
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateGoals(localGoals);
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <GoalInputSection
                title="Metas Diárias"
                period="daily"
                values={localGoals.daily}
                onChange={handleChange}
            />
            <GoalInputSection
                title="Metas Semanais"
                period="weekly"
                values={localGoals.weekly}
                onChange={handleChange}
            />
            <GoalInputSection
                title="Metas Mensais"
                period="monthly"
                values={localGoals.monthly}
                onChange={handleChange}
            />

            <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-full transition-colors shadow-md">
                    Salvar Metas
                </button>
            </div>
        </form>
    );
};

const GoalInputSection: React.FC<{
    title: string;
    period: 'daily' | 'weekly' | 'monthly';
    values: { profit?: number, revenue?: number };
    onChange: (period: 'daily' | 'weekly' | 'monthly', type: 'profit' | 'revenue', value: string) => void;
}> = ({ title, period, values, onChange }) => (
    <div className="space-y-4 bg-gray-50 dark:bg-[#252525] p-5 rounded-[24px]">
        <h3 className="text-base font-semibold text-indigo-600 dark:text-indigo-400">{title}</h3>
        <div>
            <label htmlFor={`${period}-profit`} className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Lucro (R$)</label>
            <input
                type="number"
                id={`${period}-profit`}
                value={values.profit || ''}
                onChange={e => onChange(period, 'profit', e.target.value)}
                placeholder="Ex: 250"
                className="block w-full bg-white dark:bg-[#1e1e1e] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3"
                inputMode="decimal"
            />
        </div>
        <div>
            <label htmlFor={`${period}-revenue`} className="block text-sm font-medium text-gray-600 dark:text-gray-400 ml-1 mb-1">Faturamento (R$)</label>
            <input
                type="number"
                id={`${period}-revenue`}
                value={values.revenue || ''}
                onChange={e => onChange(period, 'revenue', e.target.value)}
                placeholder="Ex: 400"
                className="block w-full bg-white dark:bg-[#1e1e1e] border-transparent rounded-2xl focus:ring-0 text-gray-900 dark:text-white p-3"
                inputMode="decimal"
            />
        </div>
    </div>
);

const InsightCard: React.FC<{ title: string; value: string; description: string; }> = ({ title, value, description }) => (
    <div className="bg-white dark:bg-[#1e1e1e] rounded-[28px] p-5 shadow-sm flex flex-col justify-center items-center text-center h-full">
        <h3 className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">{title}</h3>
        <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 leading-tight">{description}</p>
    </div>
);

const Insights: React.FC = () => {
    const { filteredEntries } = useAppContext();

    const insights = useMemo(() => {
        // Use filteredEntries for calculations
        const currentEntries = filteredEntries;

        // --- 1. Most Profitable Day of the Week ---
        const dayStats: { [key: number]: { profit: number; days: Set<string> } } = {
            0: { profit: 0, days: new Set() }, 1: { profit: 0, days: new Set() },
            2: { profit: 0, days: new Set() }, 3: { profit: 0, days: new Set() },
            4: { profit: 0, days: new Set() }, 5: { profit: 0, days: new Set() },
            6: { profit: 0, days: new Set() },
        };
        currentEntries.forEach(entry => {
            if (!entry.date) return;
            const date = new Date(entry.date);
            if (isNaN(date.getTime())) return;

            const dayOfWeek = date.getDay();
            const dateString = date.toISOString().split('T')[0];

            dayStats[dayOfWeek].days.add(dateString);
            const amount = entry.type === EntryType.GAIN ? entry.amount : -entry.amount;
            dayStats[dayOfWeek].profit += amount;
        });

        const dayAverages = Object.entries(dayStats).map(([day, stats]) => {
            const avgProfit = stats.days.size > 0 ? stats.profit / stats.days.size : 0;
            return { day: parseInt(day, 10), avgProfit };
        });

        const mostProfitableDay = dayAverages.reduce((max, current) => current.avgProfit > max.avgProfit ? current : max, { day: -1, avgProfit: -Infinity });
        const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const mostProfitableDayResult = mostProfitableDay.day !== -1 && mostProfitableDay.avgProfit > 0
            ? {
                value: weekDays[mostProfitableDay.day],
                description: `Média de ${formatCurrency(mostProfitableDay.avgProfit)} de lucro`
              }
            : { value: '-', description: 'Dados insuficientes' };


        // --- 2. Best Platform by Revenue per Trip ---
        const platformStats: { [key in Platform]?: { revenue: number; trips: number } } = {};
        currentEntries
            .filter(e => e.type === EntryType.GAIN && !e.isReward && e.platform && e.tripCount && e.tripCount > 0)
            .forEach(e => {
                if (!platformStats[e.platform!]) {
                    platformStats[e.platform!] = { revenue: 0, trips: 0 };
                }
                platformStats[e.platform!]!.revenue += e.amount;
                platformStats[e.platform!]!.trips += e.tripCount!;
            });

        const platformPerformance = Object.entries(platformStats).map(([platform, stats]) => ({
            platform: platform as Platform,
            revenuePerTrip: stats.trips > 0 ? stats.revenue / stats.trips : 0,
        }));
        
        const initialBestPlatform: { platform: Platform | undefined; revenuePerTrip: number } = { platform: undefined, revenuePerTrip: -1 };
        const bestPlatform = platformPerformance.reduce((max, current) => current.revenuePerTrip > max.revenuePerTrip ? current : max, initialBestPlatform);
        const bestPlatformResult = bestPlatform.platform
            ? {
                value: bestPlatform.platform,
                description: `${formatCurrency(bestPlatform.revenuePerTrip)} por viagem`
              }
            : { value: '-', description: 'Dados insuficientes' };

        
        // --- 3. Most Cost-Effective Fuel ---
        const fuelStats: { [key in FuelType]?: { cost: number; distance: number } } = {};
        currentEntries
            .filter(e => e.type === EntryType.EXPENSE && e.category === ExpenseCategory.FUEL && e.fuelDetails)
            .forEach(e => {
                const fuelType = e.fuelDetails!.fuelType;
                if (!fuelStats[fuelType]) {
                    fuelStats[fuelType] = { cost: 0, distance: 0 };
                }
                fuelStats[fuelType]!.cost += e.amount;
                fuelStats[fuelType]!.distance += e.fuelDetails!.distanceDriven;
            });
        
        const fuelPerformance = Object.entries(fuelStats).map(([fuel, stats]) => ({
            fuel: fuel as FuelType,
            costPerKm: stats.distance > 0 ? stats.cost / stats.distance : Infinity,
        }));

        const initialMostEfficientFuel: { fuel: FuelType | undefined; costPerKm: number } = { fuel: undefined, costPerKm: Infinity };
        const mostEfficientFuel = fuelPerformance.reduce((min, current) => current.costPerKm < min.costPerKm ? current : min, initialMostEfficientFuel);
        const mostEfficientFuelResult = mostEfficientFuel.fuel && mostEfficientFuel.costPerKm !== Infinity
            ? {
                value: mostEfficientFuel.fuel,
                description: `${formatCurrency(mostEfficientFuel.costPerKm)} por km`
              }
            : { value: '-', description: 'Dados insuficientes' };

        // --- 4. Most Used Platform by Trip Count ---
        const platformTripCount: { [key in Platform]?: number } = {};
        currentEntries
            .filter(e => e.type === EntryType.GAIN && e.platform && e.tripCount && e.tripCount > 0)
            .forEach(e => {
                if (!platformTripCount[e.platform!]) {
                    platformTripCount[e.platform!] = 0;
                }
                platformTripCount[e.platform!]! += e.tripCount!;
            });

        const mostUsedPlatformEntry = (Object.entries(platformTripCount) as [Platform, number][]).reduce(
            (max, current) => (current[1] > max[1] ? current : max),
            [undefined, -1] as [Platform | undefined, number]
        );

        const mostUsedPlatform = mostUsedPlatformEntry[0];
        const mostUsedPlatformResult = mostUsedPlatform
            ? {
                value: mostUsedPlatform,
                description: `${mostUsedPlatformEntry[1]} viagens`
              }
            : { value: '-', description: 'Dados insuficientes' };

        return {
            mostProfitableDay: mostProfitableDayResult,
            bestPlatform: bestPlatformResult,
            mostEfficientFuel: mostEfficientFuelResult,
            mostUsedPlatform: mostUsedPlatformResult,
        };
    }, [filteredEntries]);

    return (
        <div className="space-y-6 pb-20">
            <PeriodFilter />
            <div className="grid grid-cols-2 gap-3">
                <InsightCard 
                    title="Dia Mais Lucrativo"
                    value={insights.mostProfitableDay.value}
                    description={insights.mostProfitableDay.description}
                />
                <InsightCard 
                    title="Melhor Plataforma"
                    value={insights.bestPlatform.value}
                    description={insights.bestPlatform.description}
                />
                 <InsightCard 
                    title="Combustível Eficiente"
                    value={insights.mostEfficientFuel.value}
                    description={insights.mostEfficientFuel.description}
                />
                <InsightCard 
                    title="Plataforma Mais Usada"
                    value={insights.mostUsedPlatform.value}
                    description={insights.mostUsedPlatform.description}
                />
            </div>
        </div>
    );
};

export default App;