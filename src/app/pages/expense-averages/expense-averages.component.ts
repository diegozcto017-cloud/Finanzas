// src/app/pages/expense-averages/expense-averages.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService, Envelope } from '../../core/services/supabase.service';

interface ExpenseAverage {
  id: string;
  service_name: string;
  category: string;
  currency: string;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
  payment_count: number;
  typical_day: number | null;
  linked_envelope_id: string | null;
}

@Component({
  selector: 'app-expense-averages',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-black-kite">Gastos Detectados</h1>
          <p class="text-gray-500 text-sm mt-1">Promedios calculados desde tus correos con IA</p>
        </div>
        <button (click)="recalculate()" [disabled]="calculating()" class="flex items-center gap-2 px-4 py-2 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark disabled:opacity-50 transition">
          <span class="material-icons text-lg" [class.animate-spin]="calculating()">{{ calculating() ? 'autorenew' : 'smart_toy' }}</span>
          {{ calculating() ? 'Calculando...' : 'Recalcular' }}
        </button>
      </div>

      @if (toast()) {
        <div class="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm bg-green-50 border border-green-200 text-green-700 animate-fade-in">
          <span class="material-icons text-lg">check_circle</span> {{ toast() }}
        </div>
      }

      <!-- Resumen -->
      @if (averages().length > 0) {
        <div class="grid grid-cols-2 gap-3 mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p class="text-xs text-gray-400">Gastos detectados</p>
            <p class="text-2xl font-bold text-black-kite">{{ averages().length }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p class="text-xs text-gray-400">Gasto promedio mensual</p>
            <p class="text-2xl font-bold text-garnet">₡{{ totalMonthly() | number:'1.0-0' }}</p>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="text-center py-16"><span class="material-icons text-4xl text-gray-300 animate-spin">autorenew</span></div>
      } @else if (averages().length === 0) {
        <div class="text-center py-16">
          <span class="material-icons text-6xl text-gray-200">smart_toy</span>
          <p class="text-gray-400 mt-3">No hay gastos detectados aún</p>
          <p class="text-gray-300 text-sm mt-1">Conectá y sincronizá tus correos primero</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (avg of averages(); track avg.id) {
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center" [style.background]="getCatColor(avg.category) + '15'">
                    <span class="material-icons text-xl" [style.color]="getCatColor(avg.category)">{{ getCatIcon(avg.category) }}</span>
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">{{ avg.service_name }}</h3>
                    <p class="text-xs text-gray-400">
                      {{ avg.category }} · {{ avg.payment_count }} pagos detectados
                      @if (avg.typical_day) { · Suele cobrar el día {{ avg.typical_day }} }
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold text-black-kite">{{ avg.currency === 'CRC' ? '₡' : '$' }}{{ avg.avg_amount | number:'1.2-2' }}</p>
                  <p class="text-[10px] text-gray-400">/mes promedio</p>
                </div>
              </div>

              <!-- Rango min-max -->
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xs text-gray-400">Min: {{ avg.currency === 'CRC' ? '₡' : '$' }}{{ avg.min_amount | number:'1.0-0' }}</span>
                <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
                  <div class="h-full bg-garnet/30 rounded-full absolute" [style.left.%]="getMinPercent(avg)" [style.width.%]="getRangePercent(avg)"></div>
                  <div class="h-full bg-garnet rounded-full absolute w-1" [style.left.%]="getAvgPercent(avg)"></div>
                </div>
                <span class="text-xs text-gray-400">Max: {{ avg.currency === 'CRC' ? '₡' : '$' }}{{ avg.max_amount | number:'1.0-0' }}</span>
              </div>

              <!-- Acciones -->
              <div class="flex gap-2">
                @if (avg.linked_envelope_id) {
                  <span class="flex items-center gap-1 text-xs text-green-500 bg-green-50 px-3 py-1.5 rounded-lg">
                    <span class="material-icons text-sm">link</span> Vinculado a sobre
                  </span>
                } @else {
                  <button (click)="createEnvelopeFromAvg(avg)" class="flex items-center gap-1 text-xs text-garnet bg-garnet/10 px-3 py-1.5 rounded-lg hover:bg-garnet/20 transition">
                    <span class="material-icons text-sm">add</span> Crear sobre automático
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ExpenseAveragesComponent implements OnInit {
  private sb = inject(SupabaseService);

  averages = signal<ExpenseAverage[]>([]);
  loading = signal(true);
  calculating = signal(false);
  toast = signal<string | null>(null);

  totalMonthly = computed(() => this.averages()
    .filter(a => a.currency === 'CRC')
    .reduce((s, a) => s + Number(a.avg_amount), 0));

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try { this.averages.set(await this.sb.getExpenseAverages()); }
    catch {} finally { this.loading.set(false); }
  }

  async recalculate() {
    this.calculating.set(true);
    try {
      const result = await this.sb.calculateAverages();
      await this.load();
      this.showToast(`${result.averages} servicios procesados`);
    } catch {} finally { this.calculating.set(false); }
  }

  async createEnvelopeFromAvg(avg: ExpenseAverage) {
    try {
      const envelope = await this.sb.createEnvelope({
        name: avg.service_name,
        color: this.getCatColor(avg.category),
        icon: this.getCatIcon(avg.category),
        budget_limit: avg.avg_amount,
        period: 'monthly',
        is_active: true,
        due_day: avg.typical_day,
        auto_detected: true,
        average_amount: avg.avg_amount,
      } as any);

      await this.sb.linkAverageToEnvelope(avg.id, envelope.id);
      await this.load();
      this.showToast(`Sobre "${avg.service_name}" creado automáticamente`);
    } catch {}
  }

  getCatColor(cat: string): string {
    const c: Record<string, string> = { 'IA': '#8B5CF6', 'Entretenimiento': '#EC4899', 'Almacenamiento': '#3B82F6', 'Productividad': '#10B981', 'Hogar': '#F59E0B', 'Educacion': '#6366F1', 'Salud': '#EF4444', 'Transporte': '#14B8A6', 'Alimentacion': '#F97316', 'Otros': '#6B7280' };
    return c[cat] || '#6B7280';
  }
  getCatIcon(cat: string): string {
    const i: Record<string, string> = { 'IA': 'smart_toy', 'Entretenimiento': 'movie', 'Almacenamiento': 'cloud', 'Productividad': 'work', 'Hogar': 'home', 'Educacion': 'school', 'Salud': 'favorite', 'Transporte': 'directions_car', 'Alimentacion': 'restaurant', 'Otros': 'receipt_long' };
    return i[cat] || 'receipt_long';
  }
  getMinPercent(a: ExpenseAverage): number { return a.max_amount > 0 ? (a.min_amount / a.max_amount) * 100 : 0; }
  getRangePercent(a: ExpenseAverage): number { return a.max_amount > 0 ? ((a.max_amount - a.min_amount) / a.max_amount) * 100 : 0; }
  getAvgPercent(a: ExpenseAverage): number { return a.max_amount > 0 ? (a.avg_amount / a.max_amount) * 100 : 0; }

  private showToast(msg: string) { this.toast.set(msg); setTimeout(() => this.toast.set(null), 4000); }
}
