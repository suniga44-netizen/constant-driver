import React, { useState, useMemo, useCallback, useEffect, createContext, useContext, useRef } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Entry, EntryType, Shift, Filter, Period, ExpenseCategory, FuelType, FuelDetails, Platform, Goals } from './types';
import { getPeriodRange, formatCurrency, formatDuration, calculateShiftDuration, formatNumber, formatHoursMinutes, calculatePauseDuration, toNaiveUTCISOString, formatDateFromNaiveUTC, formatTimeFromNaiveUTC, getLocalDateISOString } from './utils/date';
import { HomeIcon, ListIcon, SettingsIcon, PlusIcon, XMarkIcon, CurrencyDollarIcon, ArrowDownIcon, ArrowUpIcon, ClockIcon, PlayIcon, PauseIcon, StopIcon, TrashIcon, PencilIcon, TargetIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, SteeringWheelIcon, DocumentArrowDownIcon, DocumentChartBarIcon } from './components/Icons';

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
    <header className="bg-gray-800 p-4 border-b border-gray-700 shadow-md">
      <div className="flex items-center space-x-3">
        <SteeringWheelIcon className="w-8 h-8 text-teal-400" />
        <h1 className="text-2xl font-bold text-white">Constant Driver</h1>
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
      <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
        <Header />
        <main className="flex-grow pb-20">
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
  const progressClamped = Math.max(0, Math.min(progress, 100));

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-400 text-sm">{title}</h3>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        {icon}
      </div>
      {hasGoal && (
        <div className="mt-3">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-teal-500 h-2.5 rounded-full"
              style={{ width: `${progressClamped}%` }}
            ></div>
          </div>
          <div className="text-right text-xs text-gray-400 mt-1">
            Meta: {formatCurrency(targetValue)} ({Math.floor(progress)}%)
          </div>
        </div>
      )}
    </div>
  );
};

const DetailCard: React.FC<{ title: string; value: string; unit?: string; borderColor?: string }> = ({ title, value, unit, borderColor = 'border-teal-600' }) => (
    <div className={`bg-gray-800 rounded-lg p-4 shadow-lg border-t-2 ${borderColor} flex flex-col justify-center items-center`}>
      <div className="flex items-baseline">
          <span className="text-2xl font-bold text-white">{value}</span>
          {unit && <span className="text-base font-normal text-gray-300 ml-1">{unit}</span>}
      </div>
      <h4 className="text-xs text-gray-400 font-medium mt-2 truncate">{title}</h4>
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
    <div className="p-4 space-y-6">
      <PeriodFilter />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
            title="Lucro" 
            value={formatCurrency(stats.profit)} 
            icon={<CurrencyDollarIcon className="w-8 h-8 text-blue-400" />}
            currentValue={stats.profit}
            targetValue={goal?.profit}
        />
        <SummaryCard 
            title="Faturamento" 
            value={formatCurrency(stats.revenue)} 
            icon={<ArrowUpIcon className="w-8 h-8 text-green-400" />}
            currentValue={stats.revenue}
            targetValue={goal?.revenue}
        />
        <SummaryCard title="Gastos" value={formatCurrency(stats.expenses)} icon={<ArrowDownIcon className="w-8 h-8 text-red-400" />} />
      </div>
       <div className="bg-gray-800 rounded-lg p-4 shadow-lg flex items-center justify-between">
            <div>
                <h3 className="text-gray-400 text-sm">Horas Trabalhadas</h3>
                <p className="text-2xl font-bold text-white">{formatHoursMinutes(stats.totalDurationMs)}</p>
            </div>
             <ClockIcon className="w-8 h-8 text-teal-400" />
        </div>
      {/* Detailed Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-2">
          <DetailCard title="Lucro/h" value={formatCurrency(stats.profitPerHour)} borderColor="border-blue-500" />
          <DetailCard title="Lucro/km" value={formatCurrency(stats.profitPerKm)} borderColor="border-blue-500" />
          <DetailCard title="Lucro/viagem" value={formatCurrency(stats.profitPerTrip)} borderColor="border-blue-500" />
          <DetailCard title="Faturamento/h" value={formatCurrency(stats.revenuePerHour)} borderColor="border-green-500" />
          <DetailCard title="Faturamento/km" value={formatCurrency(stats.revenuePerKm)} borderColor="border-green-500" />
          <DetailCard title="Faturamento/viagem" value={formatCurrency(stats.revenuePerTrip)} borderColor="border-green-500" />
          <DetailCard title="Gasto/h" value={formatCurrency(stats.expensesPerHour)} borderColor="border-red-500" />
          <DetailCard title="Gasto/km" value={formatCurrency(stats.expensesPerKm)} borderColor="border-red-500" />
          <DetailCard title="Gasto/viagem" value={formatCurrency(stats.expensesPerTrip)} borderColor="border-red-500" />
          <DetailCard title="Total KM" value={formatNumber(stats.totalKm, 0)} unit="km" borderColor="border-gray-400" />
          <DetailCard title="Consumo Etanol" value={formatNumber(stats.avgEthanolConsumption)} unit="km/l" borderColor="border-gray-400" />
          <DetailCard title="Consumo Gasolina" value={formatNumber(stats.avgGasolineConsumption)} unit="km/l" borderColor="border-gray-400" />
      </div>
    </div>
  );
};

const HistoryList: React.FC = () => {
    const { filteredEntries, filteredShifts, deleteEntry, startEdit, deleteShift, startEditShift } = useAppContext();

    const summaryStats = useMemo(() => {
        const revenue = filteredEntries.filter(e => e.type === EntryType.GAIN).reduce((sum, e) => sum + e.amount, 0);
        const expenses = filteredEntries.filter(e => e.type === EntryType.EXPENSE).reduce((sum, e) => sum + e.amount, 0);
        const profit = revenue - expenses;
        const totalDurationMs = filteredShifts.reduce((acc, shift) => acc + calculateShiftDuration(shift, true), 0);
        return { revenue, expenses, profit, totalDurationMs };
    }, [filteredEntries, filteredShifts]);

    const combinedList = useMemo(() => {
        const entriesWithType = filteredEntries.map(e => ({ type: 'entry' as const, date: e.date, data: e }));
        const shiftsWithType = filteredShifts.map(s => ({ type: 'shift' as const, date: s.start, data: s }));
        
        const allItems = [...entriesWithType, ...shiftsWithType];
        
        allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return allItems;
    }, [filteredEntries, filteredShifts]);

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
      <div className="p-4 space-y-4">
        <PeriodFilter />
        <div className="flex justify-end items-center">
            <button
              onClick={handleExportCSV}
              aria-label="Exportar dados em formato CSV"
              title="Exportar CSV"
              className="bg-gray-700 hover:bg-gray-600 text-teal-400 p-2 rounded-lg transition-colors"
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
                      <div key={`entry-${entry.id}`} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${entry.type === EntryType.GAIN ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {entry.type === EntryType.GAIN ? <ArrowUpIcon className="w-5 h-5"/> : <ArrowDownIcon className="w-5 h-5"/>}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-white truncate">
                                    {entry.type === EntryType.EXPENSE && entry.category === ExpenseCategory.FUEL
                                        ? 'Combustível'
                                        : entry.description || 
                                          (entry.type === EntryType.GAIN 
                                            ? entry.platform || "Ganho" 
                                            : entry.category || "Gasto")
                                    }
                                </p>
                                <div className="flex items-center space-x-2 flex-wrap">
                                   <p className="text-xs text-gray-400">{formatDateFromNaiveUTC(entry.date)}</p>
                                   
                                   {/* Show platform badge only if there's a custom description to avoid redundancy with the title */}
                                   {entry.type === EntryType.GAIN && entry.platform && entry.description && (
                                        <>
                                            <span className="text-gray-600">&bull;</span>
                                            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">{entry.platform}</span>
                                        </>
                                   )}
                                   
                                   {/* Show Reward or Trip Count */}
                                   {entry.type === EntryType.GAIN && (
                                        <>
                                            {entry.isReward ? (
                                                <>
                                                    <span className="text-gray-600">&bull;</span>
                                                    <span className="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded-full">Recompensa</span>
                                                </>
                                            ) : (
                                                typeof entry.tripCount === 'number' && entry.tripCount > 0 && (
                                                    <>
                                                        <span className="text-gray-600">&bull;</span>
                                                        <span className="text-xs text-gray-400">({entry.tripCount} {entry.tripCount === 1 ? 'corrida' : 'corridas'})</span>
                                                    </>
                                                )
                                            )}
                                        </>
                                   )}

                                   {/* Show Expense Category only if there's a custom description */}
                                   {entry.type === EntryType.EXPENSE && entry.category !== ExpenseCategory.FUEL && entry.category && entry.description && (
                                        <>
                                            <span className="text-gray-600">&bull;</span>
                                            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">{entry.category}</span>
                                        </>
                                    )}

                                   {/* Show Fuel Type for fuel expenses */}
                                   {entry.type === EntryType.EXPENSE && entry.category === ExpenseCategory.FUEL && entry.fuelDetails && (
                                        <>
                                            <span className="text-gray-600">&bull;</span>
                                            <span className="text-xs text-gray-400">{entry.fuelDetails.fuelType}</span>
                                        </>
                                    )}
                                </div>
                                 {entry.fuelDetails && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        {entry.fuelDetails.distanceDriven}km &bull; {formatCurrency(entry.fuelDetails.pricePerLiter)}/L &bull; {entry.fuelDetails.avgConsumption}km/L
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <p className={`font-bold text-lg ${entry.type === EntryType.GAIN ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(entry.amount)}
                            </p>
                            <button onClick={() => startEdit(entry)} className="text-gray-500 hover:text-teal-400">
                                <PencilIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => deleteEntry(entry.id)} className="text-gray-500 hover:text-red-400">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                      </div>
                    );
                } else { // item.type === 'shift'
                    const shift = item.data;
                    const shiftDuration = calculateShiftDuration(shift, true);
                    const pauseDuration = calculatePauseDuration(shift);
                    return (
                         <div key={`shift-${shift.id}`} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                            <div className="flex items-center space-x-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-teal-500/20 text-teal-400">
                                    <ClockIcon className="w-5 h-5"/>
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-semibold text-white truncate">Jornada de Trabalho</p>
                                    <div className="flex items-center space-x-2 flex-wrap">
                                        <p className="text-xs text-gray-400">{formatDateFromNaiveUTC(shift.start)}</p>
                                        <span className="text-gray-600">&bull;</span>
                                        <p className="text-xs text-gray-400">
                                            {formatTimeFromNaiveUTC(shift.start)}
                                            {shift.end ? ` - ${formatTimeFromNaiveUTC(shift.end)}` : ''}
                                        </p>
                                    </div>
                                     {pauseDuration > 0 && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            Pausa: {formatHoursMinutes(pauseDuration)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <p className="font-bold text-lg text-teal-400">
                                    {formatHoursMinutes(shiftDuration)}
                                </p>
                                <button onClick={() => startEditShift(shift)} className="text-gray-500 hover:text-teal-400">
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => deleteShift(shift.id)} className="text-gray-500 hover:text-red-400">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
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
    <div className="p-4 space-y-4">
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Backup e Restauração</h2>
        <p className="text-gray-400 mb-4">Salve seus dados em um arquivo ou restaure a partir de um backup anterior.</p>
        <div className="space-y-3">
          <button
            onClick={handleExport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Exportar Backup
          </button>
          <button
            onClick={handleImportClick}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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

      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Gerenciamento de Dados</h2>
        <p className="text-gray-400 mb-4">Cuidado, esta ação é irreversível.</p>
        <button
            onClick={clearAllData}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
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
      { key: 'this_week', label: 'Esta Semana' },
      { key: 'last_7_days', label: '7 Dias' },
      { key: 'this_month', label: 'Este Mês' },
      { key: 'last_30_days', label: '30 Dias' },
      { key: 'all', label: 'Todos' },
      { key: 'custom', label: 'Personalizado' },
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
      <div>
        <div className="flex flex-wrap gap-2">
          {periods.map(p => (
            <button
              key={p.key}
              data-period-key={p.key}
              onClick={() => setFilter(f => ({ ...f, period: p.key }))}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                filter.period === p.key ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {filter.period === 'custom' && (
            <div className="mt-4 grid grid-cols-2 gap-4 bg-gray-800 p-4 rounded-lg">
                <div>
                    <label htmlFor="start" className="block text-sm font-medium text-gray-400 mb-1">De:</label>
                    <input
                        type="date"
                        id="start"
                        name="start"
                        value={filter.customRange.start}
                        onChange={handleCustomDateChange}
                        className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2 appearance-none"
                    />
                </div>
                <div>
                    <label htmlFor="end" className="block text-sm font-medium text-gray-400 mb-1">Até:</label>
                    <input
                        type="date"
                        id="end"
                        name="end"
                        value={filter.customRange.end}
                        onChange={handleCustomDateChange}
                        className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2 appearance-none"
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
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 shadow-lg">
      <div className="flex justify-around max-w-lg mx-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors ${
              activeView === item.id ? 'text-teal-400' : 'text-gray-400 hover:text-teal-300'
            }`}
          >
            <item.icon className="w-6 h-6 mb-1" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
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
            <FabAction label="Ganho" onClick={() => { onOpenModal('gain'); setIsOpen(false); }} icon={<ArrowUpIcon className="w-5 h-5"/>} colorClass="text-green-400" />
            <FabAction label="Gasto" onClick={() => { onOpenModal('expense'); setIsOpen(false); }} icon={<ArrowDownIcon className="w-5 h-5"/>} colorClass="text-red-400" />
            <FabAction label="Jornada" onClick={() => { onOpenModal('shift'); setIsOpen(false); }} icon={<ClockIcon className="w-5 h-5"/>} colorClass="text-teal-400" />
          </div>
        )}
        <button
          onClick={toggleMenu}
          className={`w-16 h-16 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg transform transition-transform ${isOpen ? 'rotate-45' : ''}`}
        >
          <PlusIcon className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};

const FabAction: React.FC<{label: string, onClick: () => void, icon: React.ReactNode, colorClass?: string}> = ({label, onClick, icon, colorClass = 'text-teal-400'}) => (
    <button onClick={onClick} className={`w-12 h-12 rounded-full bg-gray-700 ${colorClass} flex items-center justify-center shadow-md hover:bg-gray-600`} aria-label={label}>
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
    <div className="fixed inset-0 bg-black bg-opacity-70 z-30 flex justify-center items-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
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

    let entryDate: Date;
    if (isEditing && entryToEdit) {
        const originalDateTime = new Date(entryToEdit.date);
        // The stored date is a naive UTC string, so we need UTC getters to get the original time components
        const hours = originalDateTime.getUTCHours();
        const minutes = originalDateTime.getUTCMinutes();
        const seconds = originalDateTime.getUTCSeconds();
        entryDate = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    } else {
        // For new entries, combine the selected date with the current time
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        entryDate = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="entryDate" className="block text-sm font-medium text-gray-300">Data do Lançamento</label>
        <input
          type="date"
          id="entryDate"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2 appearance-none"
        />
      </div>

      {type === EntryType.EXPENSE && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {expenseCategories.map(cat => (
              <button
                type="button"
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                  category === cat ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Combustível</label>
            <div className="flex flex-wrap gap-2">
              {fuelTypes.map(ft => (
                <button
                  type="button"
                  key={ft}
                  onClick={() => setFuelType(ft)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                    fuelType === ft ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pricePerLiter" className="block text-sm font-medium text-gray-300">Preço/L (R$)</label>
              <input type="text" id="pricePerLiter" value={pricePerLiter} onChange={e => setPricePerLiter(e.target.value)} placeholder="5,89" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2" inputMode="decimal" />
            </div>
            <div>
              <label htmlFor="avgConsumption" className="block text-sm font-medium text-gray-300">Consumo (km/l)</label>
              <input type="text" id="avgConsumption" value={avgConsumption} onChange={e => setAvgConsumption(e.target.value)} placeholder="10,5" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2" inputMode="decimal" />
            </div>
          </div>
          <div>
            <label htmlFor="distanceDriven" className="block text-sm font-medium text-gray-300">KM Rodados</label>
            <input type="text" id="distanceDriven" value={distanceDriven} onChange={e => setDistanceDriven(e.target.value)} placeholder="300" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2" inputMode="decimal" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Valor Total Calculado</label>
            <div className="mt-1 p-2 bg-gray-900 rounded-md text-white text-lg font-bold h-10 flex items-center">
              {formatCurrency(parseFloat(amount.replace(',', '.')) || 0)}
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Valor (R$)</label>
            <input type="text" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2" inputMode="decimal" />
          </div>
          {type === EntryType.GAIN && (
             <>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Plataforma</label>
                    <div className="flex flex-wrap gap-2">
                        {platforms.map(p => (
                            <button
                                type="button"
                                key={p}
                                onClick={() => setPlatform(p)}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                                    platform === p ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center mt-4">
                    <input
                        id="isReward"
                        name="isReward"
                        type="checkbox"
                        checked={isReward}
                        onChange={(e) => setIsReward(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="isReward" className="ml-2 block text-sm text-gray-300">
                        Recompensa (bônus, indicação, etc.)
                    </label>
                </div>
                <div>
                    <label htmlFor="tripCount" className={`block text-sm font-medium ${isReward ? 'text-gray-500' : 'text-gray-300'}`}>Total de Corridas</label>
                    <input 
                        type="number" 
                        id="tripCount" 
                        value={tripCount} 
                        onChange={e => setTripCount(e.target.value)} 
                        placeholder="10" 
                        className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2 disabled:bg-gray-800 disabled:text-gray-500" 
                        inputMode="numeric" 
                        disabled={isReward}
                    />
                </div>
            </>
          )}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">Descrição (Opcional)</label>
            <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === EntryType.GAIN ? "Ex: Bônus, Dinâmico" : "Ex: Manutenção, Pedágio"} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2" />
          </div>
        </>
      )}

      <button
        type="submit"
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
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

        const shiftStartDate = new Date(`${date}T${startTime}`);
        let shiftEndDate = new Date(`${date}T${endTime}`);

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
                    let pauseStartDate = new Date(`${date}T${p.start}`);
                    let pauseEndDate = new Date(`${date}T${p.end}`);

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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-300">Data da Jornada</label>
                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2 appearance-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-300">Início</label>
                    <input type="time" id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2 appearance-none" />
                </div>
                <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-300">Fim</label>
                    <input type="time" id="endTime" value={endTime} onChange={e => setEndTime(e.target.value)} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2 appearance-none" />
                </div>
            </div>

            <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Pausas</h3>
                <div className="space-y-2">
                    {pauses.map((pause, index) => (
                        <div key={pause.id} className="flex items-center gap-2">
                            <input type="time" value={pause.start} onChange={e => handlePauseChange(pause.id, 'start', e.target.value)} className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2 appearance-none" placeholder="Início" />
                            <span className="text-gray-400">-</span>
                            <input type="time" value={pause.end} onChange={e => handlePauseChange(pause.id, 'end', e.target.value)} className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2 appearance-none" placeholder="Fim" />
                            <button type="button" onClick={() => handleRemovePause(pause.id)} className="p-2 text-gray-400 hover:text-red-400">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={handleAddPause} className="mt-2 w-full text-teal-400 font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-gray-600 hover:bg-gray-700 hover:border-gray-500 transition-colors">
                    Adicionar Pausa
                </button>
            </div>

            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
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
    <div className="p-4 space-y-6">
      <div className="flex justify-end items-center">
        <button
          onClick={() => onOpenModal('goals')}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
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
          <TargetIcon className="w-16 h-16 mx-auto text-gray-600" />
          <p className="mt-4">Você ainda não definiu nenhuma meta.</p>
          <p>Clique em "Definir Metas" para começar.</p>
        </div>
      )}
    </div>
  );
};

const GoalProgressCard: React.FC<{ title: string; currentValue: number; targetValue: number; format: (value: number) => string; }> = ({ title, currentValue, targetValue, format }) => {
  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  const progressClamped = Math.min(progress, 100);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-baseline mb-2">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="text-sm font-medium text-teal-400">{Math.floor(progress)}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div className="bg-teal-500 h-2.5 rounded-full" style={{ width: `${progressClamped}%` }}></div>
      </div>
      <div className="text-right text-xs text-gray-400 mt-1">
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

            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Salvar Metas
            </button>
        </form>
    );
};

const GoalInputSection: React.FC<{
    title: string;
    period: 'daily' | 'weekly' | 'monthly';
    values: { profit?: number, revenue?: number };
    onChange: (period: 'daily' | 'weekly' | 'monthly', type: 'profit' | 'revenue', value: string) => void;
}> = ({ title, period, values, onChange }) => (
    <div className="space-y-4 bg-gray-900 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-teal-400">{title}</h3>
        <div>
            <label htmlFor={`${period}-profit`} className="block text-sm font-medium text-gray-300">Lucro (R$)</label>
            <input
                type="number"
                id={`${period}-profit`}
                value={values.profit || ''}
                onChange={e => onChange(period, 'profit', e.target.value)}
                placeholder="Ex: 250"
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2"
                inputMode="decimal"
            />
        </div>
        <div>
            <label htmlFor={`${period}-revenue`} className="block text-sm font-medium text-gray-300">Faturamento (R$)</label>
            <input
                type="number"
                id={`${period}-revenue`}
                value={values.revenue || ''}
                onChange={e => onChange(period, 'revenue', e.target.value)}
                placeholder="Ex: 400"
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-white p-2"
                inputMode="decimal"
            />
        </div>
    </div>
);

const InsightCard: React.FC<{ title: string; value: string; description: string; }> = ({ title, value, description }) => (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg flex flex-col justify-center items-center text-center">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-teal-400 my-2">{value}</p>
        <p className="text-xs text-gray-500">{description}</p>
    </div>
);

const Insights: React.FC = () => {
    const { entries } = useAppContext();

    const insights = useMemo(() => {
        // --- 1. Most Profitable Day of the Week ---
        const dayStats: { [key: number]: { profit: number; days: Set<string> } } = {
            0: { profit: 0, days: new Set() }, 1: { profit: 0, days: new Set() },
            2: { profit: 0, days: new Set() }, 3: { profit: 0, days: new Set() },
            4: { profit: 0, days: new Set() }, 5: { profit: 0, days: new Set() },
            6: { profit: 0, days: new Set() },
        };
        entries.forEach(entry => {
            if (!entry.date) return; // Guard clause for missing date
            const date = new Date(entry.date);
            if (isNaN(date.getTime())) return; // Guard clause for invalid date

            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
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
            : { value: 'Dados insuficientes', description: 'Nenhum dia com lucro médio positivo.' };


        // --- 2. Best Platform by Revenue per Trip ---
        const platformStats: { [key in Platform]?: { revenue: number; trips: number } } = {};
        entries
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
            : { value: 'Dados insuficientes', description: 'Nenhum ganho com contagem de viagens registrado.' };

        
        // --- 3. Most Cost-Effective Fuel ---
        const fuelStats: { [key in FuelType]?: { cost: number; distance: number } } = {};
        entries
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
                description: `${formatCurrency(mostEfficientFuel.costPerKm)} por km rodado`
              }
            : { value: 'Dados insuficientes', description: 'Nenhum gasto com combustível registrado.' };


        return {
            mostProfitableDay: mostProfitableDayResult,
            bestPlatform: bestPlatformResult,
            mostEfficientFuel: mostEfficientFuelResult,
        };
    }, [entries]);

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold text-white">Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InsightCard 
                    title="Dia Mais Lucrativo"
                    value={insights.mostProfitableDay.value}
                    description={insights.mostProfitableDay.description}
                />
                <InsightCard 
                    title="Melhor Plataforma (Faturamento/Viagem)"
                    value={insights.bestPlatform.value}
                    description={insights.bestPlatform.description}
                />
                 <InsightCard 
                    title="Combustível Mais Eficiente"
                    value={insights.mostEfficientFuel.value}
                    description={insights.mostEfficientFuel.description}
                />
            </div>
        </div>
    );
};


export default App;
