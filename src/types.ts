export enum EntryType {
  GAIN = 'GAIN',
  EXPENSE = 'EXPENSE',
}

export enum FuelType {
    ETHANOL = 'Etanol',
    GASOLINE = 'Gasolina',
}

export enum Platform {
    UBER = 'Uber',
    NINE_NINE = '99',
    PARTICULAR = 'Particular',
}

export interface FuelDetails {
    fuelType: FuelType;
    pricePerLiter: number;
    avgConsumption: number;
    distanceDriven: number;
}

export enum ExpenseCategory {
    FUEL = 'Combustível',
    RENTAL = 'Aluguel de Veículo',
    WASHING = 'Lavagem',
    MAINTENANCE = 'Manutenção',
    FOOD = 'Alimentação',
    TOLLS = 'Pedágios',
    OTHER = 'Outros',
}

export interface Entry {
  id: string;
  type: EntryType;
  description: string;
  amount: number;
  date: string; // ISO 8601 format
  category?: ExpenseCategory;
  fuelDetails?: FuelDetails;
  platform?: Platform;
  tripCount?: number;
  isReward?: boolean;
}

export interface Shift {
  id: string;
  start: string; // ISO 8601 format
  end?: string; // ISO 8601 format
  pauses: {
    start: string; // ISO 8601 format
    end: string; // ISO 8601 format
  }[];
}

export type Period = 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'this_month' | 'last_30_days' | 'all' | 'custom';

export interface Filter {
  period: Period;
  customRange: {
    start: string;
    end: string;
  };
}

export type GoalPeriod = 'daily' | 'weekly' | 'monthly';
export type GoalType = 'profit' | 'revenue';

export interface Goals {
  daily: {
    profit?: number;
    revenue?: number;
  };
  weekly: {
    profit?: number;
    revenue?: number;
  };
  monthly: {
    profit?: number;
    revenue?: number;
  };
}