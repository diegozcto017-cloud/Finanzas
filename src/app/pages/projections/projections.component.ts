// src/app/pages/projections/projections.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Projection, ProjectionIncome, ProjectionExpense, SavingsGoal, PaymentCalendarEntry } from '../../core/services/supabase.service';

interface MonthRow {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  goalAlert?: string;
}

@Component({
  selector: 'app-projections',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-black-kite">Proyecciones</h1>
        @if (!activeProjection()) {
          <button (click)="createProjection()" class="flex items-center gap-2 px-4 py-2 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark transition">
            <span class="material-icons text-lg">add</span> Nueva
          </button>
        }
      </div>

      @if (loading()) {
        <div class="text-center py-16"><span class="material-icons text-4xl text-gray-300 animate-spin">autorenew</span></div>
      } @else if (!activeProjection()) {
        <div class="text-center py-16">
          <span class="material-icons text-6xl text-gray-200">trending_up</span>
          <p class="text-gray-400 mt-3">Creá tu primera proyección financiera</p>
          <button (click)="createProjection()" class="mt-4 px-6 py-2.5 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark transition">Crear proyección</button>
        </div>
      } @else {
        <!-- Configuración base -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 class="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <span class="material-icons text-garnet text-lg">settings</span> Configuración
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Saldo inicial</label>
              <input type="number" [(ngModel)]="config.initial_balance" (change)="saveConfig()" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-garnet outline-none" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Ingreso quincenal base</label>
              <input type="number" [(ngModel)]="config.base_biweekly_income" (change)="saveConfig()" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-garnet outline-none" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Meses a proyectar</label>
              <select [(ngModel)]="config.months_to_project" (change)="saveConfig()" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-garnet outline-none">
                @for (m of [3,6,12,24,36,48,60]; track m) { <option [value]="m">{{ m }} meses</option> }
              </select>
            </div>
          </div>
        </div>

        <!-- Ingresos adicionales -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <span class="material-icons text-green-500 text-lg">arrow_upward</span> Ingresos adicionales
            </h2>
            <button (click)="showIncomeForm.set(true)" class="text-garnet text-sm font-medium hover:underline">+ Agregar</button>
          </div>
          @if (incomes().length === 0) {
            <p class="text-xs text-gray-400 text-center py-3">Sin ingresos adicionales</p>
          } @else {
            @for (inc of incomes(); track inc.id) {
              <div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p class="text-sm text-gray-700">{{ inc.name }}</p>
                  <p class="text-[10px] text-gray-400">{{ inc.frequency === 'once' ? 'Una vez' : inc.frequency === 'monthly' ? 'Mensual' : 'Anual' }}</p>
                </div>
                <span class="text-sm font-medium text-green-600">+₡{{ inc.amount | number:'1.0-0' }}</span>
              </div>
            }
          }
        </div>

        <!-- Gastos fijos -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <span class="material-icons text-red-400 text-lg">arrow_downward</span> Gastos fijos
            </h2>
            <button (click)="showExpenseForm.set(true)" class="text-garnet text-sm font-medium hover:underline">+ Agregar</button>
          </div>
          @if (expenses().length === 0) {
            <p class="text-xs text-gray-400 text-center py-3">Sin gastos fijos</p>
          } @else {
            @for (exp of expenses(); track exp.id) {
              <div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p class="text-sm text-gray-700">{{ exp.name }}</p>
                  <p class="text-[10px] text-gray-400">{{ exp.frequency === 'biweekly' ? 'Quincenal' : exp.frequency === 'monthly' ? 'Mensual' : 'Anual' }}</p>
                </div>
                <span class="text-sm font-medium text-red-500">-₡{{ exp.amount | number:'1.0-0' }}</span>
              </div>
            }
          }
        </div>

        <!-- Metas de ahorro -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <span class="material-icons text-garnet text-lg">flag</span> Metas de ahorro
            </h2>
            <button (click)="showGoalForm.set(true)" class="text-garnet text-sm font-medium hover:underline">+ Agregar</button>
          </div>
          @if (goals().length === 0) {
            <p class="text-xs text-gray-400 text-center py-3">Sin metas configuradas</p>
          } @else {
            @for (g of goals(); track g.id) {
              <div class="py-2 border-b border-gray-50 last:border-0">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-sm font-medium text-gray-700">{{ g.name }}</p>
                  <span class="text-xs text-gray-400">{{ g.deadline | date:'MM/yyyy' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full bg-garnet rounded-full" [style.width.%]="g.target_amount > 0 ? (g.current_amount / g.target_amount * 100) : 0"></div>
                  </div>
                  <span class="text-xs text-gray-500">₡{{ g.current_amount | number:'1.0-0' }}/{{ g.target_amount | number:'1.0-0' }}</span>
                </div>
              </div>
            }
          }
        </div>

        <!-- Tabla de proyección -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="p-4 border-b border-gray-100">
            <h2 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <span class="material-icons text-garnet text-lg">table_chart</span> Proyección mensual
            </h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-warm-gray/50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">Mes</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500">Ingresos</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500">Gastos</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500">Saldo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                @for (row of projectionTable(); track row.month) {
                  <tr class="hover:bg-gray-50/50">
                    <td class="px-4 py-3 text-gray-700 font-medium">
                      {{ row.month }}
                      @if (row.goalAlert) {
                        <span class="text-[10px] text-garnet ml-1">🎯 {{ row.goalAlert }}</span>
                      }
                    </td>
                    <td class="px-4 py-3 text-right text-green-600">₡{{ row.income | number:'1.0-0' }}</td>
                    <td class="px-4 py-3 text-right text-red-500">₡{{ row.expenses | number:'1.0-0' }}</td>
                    <td class="px-4 py-3 text-right font-bold" [class]="row.balance >= 0 ? 'text-black-kite' : 'text-red-600'">
                      ₡{{ row.balance | number:'1.0-0' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Modal: Agregar ingreso -->
      @if (showIncomeForm()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">Ingreso adicional</h3>
              <button (click)="showIncomeForm.set(false)" class="material-icons text-gray-400">close</button>
            </div>
            <input type="text" [(ngModel)]="incomeForm.name" placeholder="Nombre (ej: Bono)" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet outline-none" />
            <div class="grid grid-cols-2 gap-3">
              <input type="number" [(ngModel)]="incomeForm.amount" placeholder="Monto" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet outline-none" />
              <select [(ngModel)]="incomeForm.frequency" class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-garnet outline-none">
                <option value="once">Una vez</option><option value="monthly">Mensual</option><option value="annual">Anual</option>
              </select>
            </div>
            <button (click)="addIncome()" class="w-full py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark transition">Agregar</button>
          </div>
        </div>
      }

      <!-- Modal: Agregar gasto -->
      @if (showExpenseForm()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">Gasto fijo</h3>
              <button (click)="showExpenseForm.set(false)" class="material-icons text-gray-400">close</button>
            </div>
            <input type="text" [(ngModel)]="expenseForm.name" placeholder="Nombre (ej: Internet)" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet outline-none" />
            <div class="grid grid-cols-2 gap-3">
              <input type="number" [(ngModel)]="expenseForm.amount" placeholder="Monto" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet outline-none" />
              <select [(ngModel)]="expenseForm.frequency" class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-garnet outline-none">
                <option value="biweekly">Quincenal</option><option value="monthly">Mensual</option><option value="annual">Anual</option>
              </select>
            </div>
            <button (click)="addExpense()" class="w-full py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark transition">Agregar</button>
          </div>
        </div>
      }

      <!-- Modal: Meta de ahorro -->
      @if (showGoalForm()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">Meta de ahorro</h3>
              <button (click)="showGoalForm.set(false)" class="material-icons text-gray-400">close</button>
            </div>
            <input type="text" [(ngModel)]="goalForm.name" placeholder="Nombre (ej: Fondo de emergencia)" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet outline-none" />
            <div class="grid grid-cols-2 gap-3">
              <input type="number" [(ngModel)]="goalForm.target_amount" placeholder="Monto objetivo" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet outline-none" />
              <input type="date" [(ngModel)]="goalForm.deadline" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet outline-none" />
            </div>
            <button (click)="addGoal()" class="w-full py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark transition">Agregar</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProjectionsComponent implements OnInit {
  private sb = inject(SupabaseService);

  loading = signal(true);
  activeProjection = signal<Projection | null>(null);
  incomes = signal<ProjectionIncome[]>([]);
  expenses = signal<ProjectionExpense[]>([]);
  goals = signal<SavingsGoal[]>([]);
  calendarEntries = signal<PaymentCalendarEntry[]>([]);

  showIncomeForm = signal(false);
  showExpenseForm = signal(false);
  showGoalForm = signal(false);

  config = { initial_balance: 0, base_biweekly_income: 0, months_to_project: 12 };
  incomeForm = { name: '', amount: 0, frequency: 'once' as const };
  expenseForm = { name: '', amount: 0, frequency: 'monthly' as const };
  goalForm = { name: '', target_amount: 0, deadline: '' };

  projectionTable = computed<MonthRow[]>(() => {
    const p = this.activeProjection();
    if (!p) return [];

    const months = Number(p.months_to_project) || 12;
    const rows: MonthRow[] = [];
    let balance = Number(p.initial_balance) || 0;
    const now = new Date();
    const cal = this.calendarEntries();
    const exps = this.expenses();
    const incs = this.incomes();
    const gls = this.goals();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = date.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' });
      const y = date.getFullYear();
      const m = date.getMonth() + 1;

      // Ingresos del calendario de pagos
      let monthIncome = cal
        .filter(c => { const d = new Date(c.payment_date); return d.getFullYear() === y && d.getMonth() + 1 === m; })
        .reduce((s, c) => s + Number(c.amount), 0);

      // Fallback: ingreso quincenal base * 2
      if (monthIncome === 0) monthIncome = Number(p.base_biweekly_income) * 2;

      // Ingresos adicionales
      for (const inc of incs) {
        if (inc.frequency === 'monthly') monthIncome += Number(inc.amount);
        else if (inc.frequency === 'annual' && m === 1) monthIncome += Number(inc.amount);
        else if (inc.frequency === 'once' && i === 0) monthIncome += Number(inc.amount);
      }

      // Gastos fijos
      let monthExpenses = 0;
      for (const exp of exps) {
        if (exp.frequency === 'monthly') monthExpenses += Number(exp.amount);
        else if (exp.frequency === 'biweekly') monthExpenses += Number(exp.amount) * 2;
        else if (exp.frequency === 'annual' && m === 1) monthExpenses += Number(exp.amount);
      }

      balance = balance + monthIncome - monthExpenses;

      // Verificar metas
      const goalAlert = gls.find(g => {
        if (!g.deadline) return false;
        const dl = new Date(g.deadline);
        return dl.getFullYear() === y && dl.getMonth() + 1 === m;
      });

      rows.push({
        month: monthStr,
        income: monthIncome,
        expenses: monthExpenses,
        balance,
        goalAlert: goalAlert ? `${goalAlert.name} (₡${goalAlert.target_amount})` : undefined,
      });
    }
    return rows;
  });

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const projections = await this.sb.getProjections();
      const cal = await this.sb.getPaymentCalendar();
      this.calendarEntries.set(cal);

      if (projections.length > 0) {
        const p = projections[0];
        this.activeProjection.set(p);
        this.config = { initial_balance: Number(p.initial_balance), base_biweekly_income: Number(p.base_biweekly_income), months_to_project: p.months_to_project };
        const [inc, exp, gls] = await Promise.all([
          this.sb.getProjectionIncomes(p.id),
          this.sb.getProjectionExpenses(p.id),
          this.sb.getSavingsGoals(),
        ]);
        this.incomes.set(inc);
        this.expenses.set(exp);
        this.goals.set(gls);
      }
    } catch {} finally { this.loading.set(false); }
  }

  async createProjection() {
    try {
      const p = await this.sb.createProjection({ name: 'Proyección principal', initial_balance: 0, base_biweekly_income: 0, months_to_project: 12 });
      this.activeProjection.set(p);
      this.config = { initial_balance: 0, base_biweekly_income: 0, months_to_project: 12 };
    } catch {}
  }

  async saveConfig() {
    const p = this.activeProjection();
    if (!p) return;
    try {
      const updated = await this.sb.client.from('projections').update({
        initial_balance: this.config.initial_balance,
        base_biweekly_income: this.config.base_biweekly_income,
        months_to_project: this.config.months_to_project,
        updated_at: new Date().toISOString(),
      }).eq('id', p.id).select().single();
      if (updated.data) this.activeProjection.set(updated.data as Projection);
    } catch {}
  }

  async addIncome() {
    const p = this.activeProjection();
    if (!p || !this.incomeForm.name) return;
    await this.sb.createProjectionIncome({ projection_id: p.id, ...this.incomeForm, start_date: null });
    this.showIncomeForm.set(false);
    this.incomeForm = { name: '', amount: 0, frequency: 'once' };
    await this.load();
  }

  async addExpense() {
    const p = this.activeProjection();
    if (!p || !this.expenseForm.name) return;
    await this.sb.createProjectionExpense({ projection_id: p.id, ...this.expenseForm });
    this.showExpenseForm.set(false);
    this.expenseForm = { name: '', amount: 0, frequency: 'monthly' };
    await this.load();
  }

  async addGoal() {
    if (!this.goalForm.name || !this.goalForm.target_amount) return;
    await this.sb.createSavingsGoal({
      projection_id: this.activeProjection()?.id || null,
      name: this.goalForm.name,
      target_amount: this.goalForm.target_amount,
      current_amount: 0,
      deadline: this.goalForm.deadline || null,
    });
    this.showGoalForm.set(false);
    this.goalForm = { name: '', target_amount: 0, deadline: '' };
    await this.load();
  }
}
