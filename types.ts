
export enum QuestionType {
  SHORT_ANSWER = 'SHORT_ANSWER',
  PARAGRAPH = 'PARAGRAPH',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  CHECKBOX = 'CHECKBOX',
  DROPDOWN = 'DROPDOWN',
  LINEAR_SCALE = 'LINEAR_SCALE',
  UNKNOWN = 'UNKNOWN'
}

export interface QuestionOption {
  value: string;
}

export interface Question {
  id: string;
  title: string;
  type: QuestionType;
  options?: QuestionOption[];
  required: boolean;
  scaleLimits?: { min: number; max: number };
}

export interface FormStructure {
  formId: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface SubmissionResult {
  id: number;
  timestamp: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

// Map of Question ID -> Map of Option Value -> Percentage Weight
export type QuestionWeights = Record<string, Record<string, number>>;

export interface User {
  name: string;
  userId: string;
  password?: string; // Only used in registration payload
  contact: string;
  email: string;
  creditsAvailed: number;
  creditsRemaining: number;
  plan: string;
  paymentId: string;
  screenshotUrl: string;
  status: 'Active' | 'Pending' | 'Disabled';
  rowIndex?: number; // For admin updates
  role?: 'admin' | 'user';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  role: 'admin' | 'user' | null;
}

export const PRICING_PLANS = [
  { responses: 150, price: 100, label: 'Starter' },
  { responses: 300, price: 200, label: 'Pro' },
  { responses: 500, price: 350, label: 'Enterprise' }
];
