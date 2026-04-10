// src/app/core/services/supabase.service.ts
import { Injectable, signal, computed, effect } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface Profile {
  id: string;
  display_name: string | null;
  currency_default: 'CRC' | 'USD';
  onboarding_completed: boolean;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface Envelope {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  budget_limit: number;
  current_spent: number;
  period: 'weekly' | 'biweekly' | 'monthly' | 'annual';
  is_active: boolean;
  due_day?: number | null;
  is_paid_this_period?: boolean;
  average_amount?: number;
  auto_detected?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  envelope_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: 'CRC' | 'USD';
  description: string | null;
  category: string | null;
  date: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  category: string;
  cost: number;
  currency: 'CRC' | 'USD';
  cycle: 'weekly' | 'monthly' | 'annual';
  next_payment_date: string | null;
  status: 'active' | 'paused' | 'failed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentCalendarEntry {
  id: string;
  user_id: string;
  payment_type: 'Q1' | 'Q2' | 'aguinaldo' | 'salario_escolar' | 'bonus';
  payment_date: string;
  amount: number;
  currency: 'CRC' | 'USD';
  is_confirmed: boolean;
  notes: string | null;
  created_at: string;
}

export interface Projection {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  base_biweekly_income: number;
  months_to_project: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectionIncome {
  id: string;
  projection_id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: 'once' | 'monthly' | 'annual';
  start_date: string | null;
  created_at: string;
}

export interface ProjectionExpense {
  id: string;
  projection_id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: 'biweekly' | 'monthly' | 'annual';
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  projection_id: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  name: string;
  cost: number | null;
  currency: 'CRC' | 'USD';
  url: string | null;
  priority: 'alta' | 'media' | 'baja';
  status: 'pendiente' | 'comprado';
  purchased_at: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  person_name: string;
  total_amount: number;
  paid_amount: number;
  currency: 'CRC' | 'USD';
  loan_type: 'lent' | 'borrowed';
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  user_id: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface EmailAccount {
  id: string;
  user_id: string;
  provider: 'gmail' | 'outlook';
  email_address: string;
  is_connected: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export interface EmailReceipt {
  id: string;
  user_id: string;
  email_account_id: string | null;
  subject: string | null;
  sender: string | null;
  amount: number | null;
  currency: string;
  service_name: string | null;
  receipt_date: string | null;
  category: string | null;
  status: 'pending' | 'confirmed' | 'ignored';
  confidence_score: number;
  raw_snippet: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  // Auth state
  readonly currentUser = signal<User | null>(null);
  readonly session = signal<Session | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly loading = signal(true);

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );

    // Escuchar cambios de autenticación
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      this.session.set(session);
      this.currentUser.set(session?.user ?? null);

      if (session?.user) {
        await this.loadProfile();
      } else {
        this.profile.set(null);
      }

      this.loading.set(false);
    });

    // Cargar sesión inicial
    this.supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.currentUser.set(data.session?.user ?? null);
      if (data.session?.user) this.loadProfile();
      this.loading.set(false);
    });
  }

  // ═══════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════

  async signUp(email: string, password: string, displayName?: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    });
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signInWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async updatePassword(newPassword: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  }

  async updateEmail(newEmail: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      email: newEmail,
    });
    if (error) throw error;
    return data;
  }

  async loadData() {
    await this.loadProfile();
  }

  /**
   * Obtiene los headers de autenticación con JWT token
   */
  private async getAuthHeaders() {
    const session = this.session();
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`
    };
  }

  // ═══════════════════════════════════════
  // PROFILE
  // ═══════════════════════════════════════

  private async loadProfile() {
    const user = this.currentUser();
    if (!user) return;

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) this.profile.set(data as Profile);
  }

  async updateProfile(updates: Partial<Pick<Profile, 'display_name' | 'currency_default' | 'theme'>>) {
    const user = this.currentUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await this.supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    this.profile.set(data as Profile);
    return data;
  }

  // ═══════════════════════════════════════
  // ENVELOPES (SOBRES)
  // ═══════════════════════════════════════

  async getEnvelopes() {
    const { data, error } = await this.supabase
      .from('envelopes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Envelope[];
  }

  async createEnvelope(envelope: Omit<Envelope, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_spent'>) {
    const { data, error } = await this.supabase
      .from('envelopes')
      .insert({ ...envelope, user_id: this.currentUser()!.id })
      .select()
      .single();
    if (error) throw error;
    return data as Envelope;
  }

  async updateEnvelope(id: string, updates: Partial<Envelope>) {
    const { data, error } = await this.supabase
      .from('envelopes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Envelope;
  }

  async deleteEnvelope(id: string) {
    const { error } = await this.supabase.from('envelopes').delete().eq('id', id);
    if (error) throw error;
  }

  // ═══════════════════════════════════════
  // TRANSACTIONS
  // ═══════════════════════════════════════

  async getTransactions(filters?: { envelopeId?: string; from?: string; to?: string; type?: string }) {
    let q = this.supabase.from('transactions').select('*').order('date', { ascending: false });

    if (filters?.envelopeId) q = q.eq('envelope_id', filters.envelopeId);
    if (filters?.from) q = q.gte('date', filters.from);
    if (filters?.to) q = q.lte('date', filters.to);
    if (filters?.type) q = q.eq('type', filters.type);

    const { data, error } = await q;
    if (error) throw error;
    return data as Transaction[];
  }

  async createTransaction(tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) {
    const { data, error } = await this.supabase
      .from('transactions')
      .insert({ ...tx, user_id: this.currentUser()!.id })
      .select()
      .single();
    if (error) throw error;
    return data as Transaction;
  }

  async deleteTransaction(id: string) {
    const { error } = await this.supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  // ═══════════════════════════════════════
  // SUBSCRIPTIONS
  // ═══════════════════════════════════════

  async getSubscriptions(status?: string) {
    let q = this.supabase.from('subscriptions').select('*').order('next_payment_date', { ascending: true });
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw error;
    return data as Subscription[];
  }

  async createSubscription(sub: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .insert({ ...sub, user_id: this.currentUser()!.id })
      .select()
      .single();
    if (error) throw error;
    return data as Subscription;
  }

  async updateSubscription(id: string, updates: Partial<Subscription>) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Subscription;
  }

  async deleteSubscription(id: string) {
    const { error } = await this.supabase.from('subscriptions').delete().eq('id', id);
    if (error) throw error;
  }

  // ═══════════════════════════════════════
  // PAYMENT CALENDAR
  // ═══════════════════════════════════════

  async getPaymentCalendar(year?: number) {
    let q = this.supabase.from('payment_calendar').select('*').order('payment_date', { ascending: true });

    if (year) {
      q = q.gte('payment_date', `${year}-01-01`).lte('payment_date', `${year}-12-31`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data as PaymentCalendarEntry[];
  }

  async createPaymentEntry(entry: Omit<PaymentCalendarEntry, 'id' | 'user_id' | 'created_at'>) {
    const { data, error } = await this.supabase
      .from('payment_calendar')
      .insert({ ...entry, user_id: this.currentUser()!.id })
      .select()
      .single();
    if (error) throw error;
    return data as PaymentCalendarEntry;
  }

  async updatePaymentEntry(id: string, updates: Partial<PaymentCalendarEntry>) {
    const { data, error } = await this.supabase
      .from('payment_calendar')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PaymentCalendarEntry;
  }

  async bulkCreatePaymentEntries(entries: Omit<PaymentCalendarEntry, 'id' | 'user_id' | 'created_at'>[]) {
    const uid = this.currentUser()!.id;
    const rows = entries.map(e => ({ ...e, user_id: uid }));

    const { data, error } = await this.supabase
      .from('payment_calendar')
      .insert(rows)
      .select();
    if (error) throw error;
    return data as PaymentCalendarEntry[];
  }

  // ═══════════════════════════════════════
  // PROJECTIONS
  // ═══════════════════════════════════════

  async getProjections() {
    const { data, error } = await this.supabase.from('projections').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Projection[];
  }

  async createProjection(p: Omit<Projection, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('projections')
      .insert({ ...p, user_id: this.currentUser()!.id })
      .select()
      .single();
    if (error) throw error;
    return data as Projection;
  }

  async getProjectionIncomes(projectionId: string) {
    const { data, error } = await this.supabase
      .from('projection_incomes')
      .select('*')
      .eq('projection_id', projectionId);
    if (error) throw error;
    return data as ProjectionIncome[];
  }

  async createProjectionIncome(income: Omit<ProjectionIncome, 'id' | 'user_id' | 'created_at'>) {
    const { data, error } = await this.supabase
      .from('projection_incomes')
      .insert({ ...income, user_id: this.currentUser()!.id })
      .select()
      .single();
    if (error) throw error;
    return data as ProjectionIncome;
  }

  async getProjectionExpenses(projectionId: string) {
    const { data, error } = await this.supabase
      .from('projection_expenses')
      .select('*')
      .eq('projection_id', projectionId);
    if (error) throw error;
    return data as ProjectionExpense[];
  }

  async createProjectionExpense(expense: Omit<ProjectionExpense, 'id' | 'user_id' | 'created_at'>) {
    const { data, error } = await this.supabase
      .from('projection_expenses')
      .insert({ ...expense, user_id: this.currentUser()!.id })
      .select()
      .single();
    if (error) throw error;
    return data as ProjectionExpense;
  }

  // ═══════════════════════════════════════
  // SAVINGS GOALS
  // ═══════════════════════════════════════

  async getSavingsGoals() {
    const { data, error } = await this.supabase.from('savings_goals').select('*').order('deadline', { ascending: true });
    if (error) throw error;
    return data as SavingsGoal[];
  }

  async createSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('savings_goals')
      .insert({ ...goal, user_id: this.currentUser()!.id })
      .select()
      .single();
    if (error) throw error;
    return data as SavingsGoal;
  }

  async updateSavingsGoal(id: string, updates: Partial<SavingsGoal>) {
    const { data, error } = await this.supabase
      .from('savings_goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as SavingsGoal;
  }

  // ═══════════════════════════════════════
  // PURCHASES (WISHLIST)
  // ═══════════════════════════════════════

  async getPurchases(status?: string) {
    let q = this.supabase.from('purchases').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw error;
    return data as Purchase[];
  }

  async createPurchase(p: Omit<Purchase, 'id' | 'user_id' | 'created_at' | 'purchased_at'>) {
    const { data, error } = await this.supabase
      .from('purchases')
      .insert({ ...p, user_id: this.currentUser()!.id })
      .select()
      .single();
    if (error) throw error;
    return data as Purchase;
  }

  async updatePurchase(id: string, updates: Partial<Purchase>) {
    const { data, error } = await this.supabase
      .from('purchases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Purchase;
  }

  async deletePurchase(id: string) {
    const { error } = await this.supabase.from('purchases').delete().eq('id', id);
    if (error) throw error;
  }

  // ═══════════════════════════════════════
  // LOANS
  // ═══════════════════════════════════════

  async getLoans() {
    const { data, error } = await this.supabase.from('loans').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data as Loan[];
  }

  async createLoan(loan: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'paid_amount'>) {
    const { data, error } = await this.supabase
      .from('loans')
      .insert({ ...loan, user_id: this.currentUser()!.id })
      .select()
      .single();
    if (error) throw error;
    return data as Loan;
  }

  async getLoanPayments(loanId: string) {
    const { data, error } = await this.supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data as LoanPayment[];
  }

  async createLoanPayment(payment: Omit<LoanPayment, 'id' | 'user_id' | 'created_at'>) {
    const uid = this.currentUser()!.id;

    // Insertar abono
    const { data, error } = await this.supabase
      .from('loan_payments')
      .insert({ ...payment, user_id: uid })
      .select()
      .single();
    if (error) throw error;

    // Actualizar monto pagado del préstamo
    const loan = (await this.supabase.from('loans').select('paid_amount').eq('id', payment.loan_id).single()).data;
    if (loan) {
      await this.supabase
        .from('loans')
        .update({
          paid_amount: loan.paid_amount + payment.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.loan_id);
    }

    return data as LoanPayment;
  }

  // ═══════════════════════════════════════
  // EMAIL ACCOUNTS — CONEXIÓN OAuth
  // ═══════════════════════════════════════

  async getEmailAccounts() {
    const { data, error } = await this.supabase.from('email_accounts').select('*');
    if (error) throw error;
    return data as EmailAccount[];
  }

  /**
   * Inicia el flujo OAuth para conectar Gmail u Outlook.
   * Abre una ventana popup para que el usuario autorice.
   */
  async connectEmailAccount(provider: 'gmail' | 'outlook'): Promise<void> {
    const redirectUri = `${window.location.origin}/correos`;
    const headers = await this.getAuthHeaders();

    const { data, error } = await this.supabase.functions.invoke('connect-email-init', {
      body: { provider, redirect_uri: redirectUri },
      headers,
    });

    if (error) throw error;
    if (!data?.auth_url) throw new Error('No se obtuvo URL de autorización');

    // Abrir popup para OAuth
    const popup = window.open(data.auth_url, 'ConnectEmail', 'width=500,height=700,scrollbars=yes');

    // Escuchar cuando el popup vuelva al redirect_uri
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(interval);
            resolve();
          }
          if (popup?.location?.href?.includes(redirectUri)) {
            const popupUrl = new URL(popup.location.href);
            const connected = popupUrl.searchParams.get('connected');
            const err = popupUrl.searchParams.get('error');
            popup.close();
            clearInterval(interval);
            if (err) reject(new Error(err));
            else resolve();
          }
        } catch {
          // Cross-origin — popup aún en Google/Microsoft, seguir esperando
        }
      }, 500);

      // Timeout de 5 minutos
      setTimeout(() => {
        clearInterval(interval);
        popup?.close();
        reject(new Error('Tiempo de conexión agotado'));
      }, 300000);
    });
  }

  /**
   * Desconecta una cuenta de correo
   */
  async disconnectEmailAccount(accountId: string) {
    const headers = await this.getAuthHeaders();
    const { data, error } = await this.supabase.functions.invoke('disconnect-email', {
      body: { account_id: accountId },
      headers,
    });
    if (error) throw error;
    return data;
  }

  // ═══════════════════════════════════════
  // EMAIL SYNC — SINCRONIZACIÓN
  // ═══════════════════════════════════════

  async syncGmail() {
    const headers = await this.getAuthHeaders();
    const { data, error } = await this.supabase.functions.invoke('sync-gmail', { headers });
    if (error) throw error;
    return data;
  }

  async syncOutlook() {
    const headers = await this.getAuthHeaders();
    const { data, error } = await this.supabase.functions.invoke('sync-outlook', { headers });
    if (error) throw error;
    return data;
  }

  async syncAllEmails() {
    const accounts = await this.getEmailAccounts();
    const results = [];
    let totalNew = 0;

    for (const account of accounts) {
      if (!account.is_connected) continue;
      try {
        const data = account.provider === 'gmail'
          ? await this.syncGmail()
          : await this.syncOutlook();
        results.push({ provider: account.provider, email: account.email_address, ...data });
        totalNew += data.new_receipts || 0;
      } catch (err) {
        results.push({ provider: account.provider, email: account.email_address, error: String(err) });
      }
    }

    // Auto-calcular promedios si hubo recibos nuevos
    if (totalNew > 0) {
      try { await this.calculateAverages(); } catch {}
    }
    return results;
  }

  // ═══════════════════════════════════════
  // SUGERENCIAS AUTOMÁTICAS
  // ═══════════════════════════════════════

  async getUnlinkedSuggestions() {
    const { data, error } = await this.supabase
      .from('expense_averages')
      .select('*')
      .is('linked_envelope_id', null)
      .order('avg_amount', { ascending: false });
    if (error) throw error;
    return data;
  }

  async bulkCreateEnvelopesFromSuggestions(suggestions: Array<{
    id: string; service_name: string; category: string; currency: string;
    avg_amount: number; typical_day: number | null;
  }>) {
    const results = [];
    for (const s of suggestions) {
      try {
        const envelope = await this.createEnvelope({
          name: s.service_name,
          color: this.getCategoryColor(s.category),
          icon: this.getCategoryIcon(s.category),
          budget_limit: s.avg_amount,
          period: 'monthly',
          is_active: true,
          due_day: s.typical_day,
          auto_detected: true,
          average_amount: s.avg_amount,
        } as any);
        await this.linkAverageToEnvelope(s.id, envelope.id);
        results.push({ success: true, name: s.service_name });
      } catch (err) {
        results.push({ success: false, name: s.service_name, error: String(err) });
      }
    }
    return results;
  }

  private getCategoryColor(cat: string): string {
    const c: Record<string, string> = { 'IA': '#8B5CF6', 'Entretenimiento': '#EC4899', 'Almacenamiento': '#3B82F6', 'Productividad': '#10B981', 'Hogar': '#F59E0B', 'Educacion': '#6366F1', 'Salud': '#EF4444', 'Transporte': '#14B8A6', 'Alimentacion': '#F97316', 'Otros': '#6B7280' };
    return c[cat] || '#6B7280';
  }

  private getCategoryIcon(cat: string): string {
    const i: Record<string, string> = { 'IA': 'smart_toy', 'Entretenimiento': 'movie', 'Almacenamiento': 'cloud', 'Productividad': 'work', 'Hogar': 'home', 'Educacion': 'school', 'Salud': 'favorite', 'Transporte': 'directions_car', 'Alimentacion': 'restaurant', 'Otros': 'receipt_long' };
    return i[cat] || 'receipt_long';
  }

  // ═══════════════════════════════════════
  // EMAIL RECEIPTS — RECIBOS DETECTADOS
  // ═══════════════════════════════════════

  async getEmailReceipts(filters?: { status?: string; from?: string; to?: string }) {
    let q = this.supabase.from('email_receipts').select('*').order('receipt_date', { ascending: false });

    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.from) q = q.gte('receipt_date', filters.from);
    if (filters?.to) q = q.lte('receipt_date', filters.to);

    const { data, error } = await q;
    if (error) throw error;
    return data as EmailReceipt[];
  }

  async updateReceiptStatus(id: string, status: 'confirmed' | 'ignored') {
    const { data, error } = await this.supabase
      .from('email_receipts')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as EmailReceipt;
  }

  async receiptToSubscription(receiptId: string) {
    const { data: receipt, error } = await this.supabase
      .from('email_receipts')
      .select('*')
      .eq('id', receiptId)
      .single();
    if (error || !receipt) throw error || new Error('Recibo no encontrado');

    const sub = await this.createSubscription({
      name: receipt.service_name || 'Sin nombre',
      category: receipt.category || 'Otros',
      cost: receipt.amount || 0,
      currency: (receipt.currency as 'CRC' | 'USD') || 'USD',
      cycle: 'monthly',
      next_payment_date: receipt.receipt_date,
      status: 'active',
      notes: `Detectado desde correo: ${receipt.subject}`,
    });

    await this.updateReceiptStatus(receiptId, 'confirmed');
    return sub;
  }

  async receiptToTransaction(receiptId: string, envelopeId?: string) {
    const { data: receipt, error } = await this.supabase
      .from('email_receipts')
      .select('*')
      .eq('id', receiptId)
      .single();
    if (error || !receipt) throw error || new Error('Recibo no encontrado');

    const tx = await this.createTransaction({
      envelope_id: envelopeId || null,
      type: 'expense',
      amount: receipt.amount || 0,
      currency: (receipt.currency as 'CRC' | 'USD') || 'USD',
      description: receipt.service_name || receipt.subject || 'Gasto detectado',
      category: receipt.category,
      date: receipt.receipt_date || new Date().toISOString().split('T')[0],
    });

    await this.updateReceiptStatus(receiptId, 'confirmed');
    return tx;
  }

  // ═══════════════════════════════════════
  // TIPO DE CAMBIO
  // ═══════════════════════════════════════

  async getExchangeRate(): Promise<number> {
    const { data, error } = await this.supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', 'USD')
      .eq('to_currency', 'CRC')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return 530; // fallback
    return Number(data.rate);
  }

  async convertToCRC(amount: number, currency: string): Promise<number> {
    if (currency === 'CRC') return amount;
    const rate = await this.getExchangeRate();
    return Math.round(amount * rate * 100) / 100;
  }

  // ═══════════════════════════════════════
  // ONBOARDING
  // ═══════════════════════════════════════

  async completeOnboardingStep(step: number) {
    const user = this.currentUser();
    if (!user) return;
    await this.supabase
      .from('profiles')
      .update({ onboarding_step: step, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (step >= 3) {
      await this.supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    }
    await this.loadProfile();
  }

  get isOnboardingComplete(): boolean {
    return (this.profile() as any)?.onboarding_completed === true;
  }

  get currentOnboardingStep(): number {
    return (this.profile() as any)?.onboarding_step || 0;
  }

  // ═══════════════════════════════════════
  // EXPENSE AVERAGES (promedios de gastos)
  // ═══════════════════════════════════════

  async calculateAverages() {
    const headers = await this.getAuthHeaders();
    const { data, error } = await this.supabase.functions.invoke('calculate-averages', { headers });
    if (error) throw error;
    return data;
  }

  async getExpenseAverages() {
    const { data, error } = await this.supabase
      .from('expense_averages')
      .select('*')
      .order('avg_amount', { ascending: false });
    if (error) throw error;
    return data;
  }

  async linkAverageToEnvelope(averageId: string, envelopeId: string) {
    const { error } = await this.supabase
      .from('expense_averages')
      .update({ linked_envelope_id: envelopeId })
      .eq('id', averageId);
    if (error) throw error;
  }

  // ═══════════════════════════════════════
  // PAYCHECK ASSIGNMENTS (lista de super por quincena)
  // ═══════════════════════════════════════

  async generatePaycheckList(paymentCalendarId: string) {
    const headers = await this.getAuthHeaders();
    const { data, error } = await this.supabase.functions.invoke('generate-paycheck-list', {
      body: { payment_calendar_id: paymentCalendarId },
      headers,
    });
    if (error) throw error;
    return data;
  }

  async getPaycheckAssignments(paymentCalendarId: string) {
    const { data, error } = await this.supabase
      .from('paycheck_assignments')
      .select('*, envelopes(name, icon, color, due_day)')
      .eq('payment_calendar_id', paymentCalendarId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  async markAssignmentPaid(assignmentId: string) {
    const { data, error } = await this.supabase
      .from('paycheck_assignments')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getNextPaycheck() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('payment_calendar')
      .select('*')
      .gte('payment_date', today)
      .order('payment_date', { ascending: true })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as PaymentCalendarEntry | null;
  }

  // ═══════════════════════════════════════
  // DASHBOARD HELPERS
  // ═══════════════════════════════════════

  async getDashboardSummary() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [transactions, subscriptions, envelopes] = await Promise.all([
      this.getTransactions({ from: firstDay, to: lastDay }),
      this.getSubscriptions('active'),
      this.getEnvelopes(),
    ]);

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const monthlySubCost = subscriptions.reduce((s, sub) => {
      const cost = Number(sub.cost);
      return s + (sub.cycle === 'annual' ? cost / 12 : sub.cycle === 'weekly' ? cost * 4 : cost);
    }, 0);

    return {
      balance: income - expenses,
      monthIncome: income,
      monthExpenses: expenses,
      activeSubscriptions: subscriptions.length,
      monthlySubCost,
      envelopes: envelopes.filter(e => e.is_active),
    };
  }

  // ═══════════════════════════════════════
  // ALERTAS
  // ═══════════════════════════════════════

  async getUpcomingAlerts(daysAhead = 7) {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('next_payment_date', today)
      .lte('next_payment_date', future)
      .order('next_payment_date', { ascending: true });

    if (error) throw error;
    return data as Subscription[];
  }

  // ═══════════════════════════════════════
  // RAW CLIENT (para casos avanzados)
  // ═══════════════════════════════════════

  get client() {
    return this.supabase;
  }
}
