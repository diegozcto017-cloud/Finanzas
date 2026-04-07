// src/app/pages/subscriptions/subscriptions.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Subscription } from '../../core/services/supabase.service';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-black-kite">Suscripciones</h1>
        <button (click)="openForm()" class="flex items-center gap-2 px-4 py-2 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark transition">
          <span class="material-icons text-lg">add</span> Nueva
        </button>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p class="text-xs text-gray-400">Activas</p>
          <p class="text-2xl font-bold text-black-kite">{{ activeCount() }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p class="text-xs text-gray-400">Mensual</p>
          <p class="text-2xl font-bold text-garnet">\${{ monthlyCost() | number:'1.2-2' }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p class="text-xs text-gray-400">Anual</p>
          <p class="text-2xl font-bold text-black-kite">\${{ annualCost() | number:'1.2-2' }}</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
        @for (f of statusFilters; track f.value) {
          <button (click)="filter.set(f.value)" class="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition"
            [class]="filter() === f.value ? 'bg-garnet text-white' : 'bg-warm-gray text-gray-600 hover:bg-gray-200'">
            {{ f.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="text-center py-16"><span class="material-icons text-4xl text-gray-300 animate-spin">autorenew</span></div>
      } @else if (filtered().length === 0) {
        <div class="text-center py-16">
          <span class="material-icons text-5xl text-gray-200">subscriptions</span>
          <p class="text-gray-400 mt-2">Sin suscripciones {{ filter() !== 'all' ? 'en este filtro' : '' }}</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (sub of filtered(); track sub.id) {
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition"
              (click)="openEdit(sub)">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" [style.background]="getCatColor(sub.category) + '15'">
                  <span class="material-icons text-lg" [style.color]="getCatColor(sub.category)">{{ getCatIcon(sub.category) }}</span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-medium text-gray-800 text-sm">{{ sub.name }}</h3>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      [class]="sub.status === 'active' ? 'bg-green-50 text-green-600'
                        : sub.status === 'failed' ? 'bg-red-50 text-red-500'
                        : sub.status === 'paused' ? 'bg-amber-50 text-amber-600'
                        : 'bg-gray-100 text-gray-400'">
                      {{ sub.status === 'active' ? 'Activo' : sub.status === 'failed' ? 'Fallido' : sub.status === 'paused' ? 'Pausado' : 'Cancelado' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-400">{{ sub.category }} · {{ sub.cycle === 'monthly' ? 'Mensual' : sub.cycle === 'annual' ? 'Anual' : 'Semanal' }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-gray-800 text-sm">{{ sub.currency === 'CRC' ? '₡' : '$' }}{{ sub.cost | number:'1.2-2' }}</p>
                @if (sub.next_payment_date) {
                  <p class="text-[10px] text-gray-400">{{ sub.next_payment_date | date:'dd/MM/yyyy' }}</p>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal -->
      @if (showForm()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div class="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 class="font-semibold text-gray-800">{{ editId ? 'Editar' : 'Nueva' }} suscripción</h3>
              <button (click)="showForm.set(false)" class="material-icons text-gray-400 hover:text-gray-600">close</button>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" [(ngModel)]="form.name" placeholder="Ej: Spotify" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                  <input type="number" [(ngModel)]="form.cost" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select [(ngModel)]="form.currency" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none bg-white">
                    <option value="USD">USD ($)</option>
                    <option value="CRC">CRC (₡)</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ciclo</label>
                  <select [(ngModel)]="form.cycle" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none bg-white">
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select [(ngModel)]="form.status" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none bg-white">
                    <option value="active">Activo</option>
                    <option value="paused">Pausado</option>
                    <option value="failed">Fallido</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select [(ngModel)]="form.category" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none bg-white">
                  @for (cat of categories; track cat) { <option [value]="cat">{{ cat }}</option> }
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Próximo pago</label>
                <input type="date" [(ngModel)]="form.next_payment_date" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input type="text" [(ngModel)]="form.notes" placeholder="Opcional" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
              </div>
              <div class="flex gap-3 pt-2">
                @if (editId) {
                  <button (click)="deleteSub()" class="px-4 py-3 text-red-500 border border-red-200 rounded-xl text-sm hover:bg-red-50 transition">
                    <span class="material-icons text-lg">delete</span>
                  </button>
                }
                <button (click)="save()" [disabled]="saving()" class="flex-1 py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark disabled:opacity-50 transition">
                  {{ saving() ? 'Guardando...' : editId ? 'Actualizar' : 'Crear' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class SubscriptionsComponent implements OnInit {
  private sb = inject(SupabaseService);

  subs = signal<Subscription[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  filter = signal('all');

  activeCount = computed(() => this.subs().filter(s => s.status === 'active').length);
  monthlyCost = computed(() => this.subs().filter(s => s.status === 'active').reduce((t, s) => {
    const c = Number(s.cost);
    return t + (s.cycle === 'annual' ? c / 12 : s.cycle === 'weekly' ? c * 4 : c);
  }, 0));
  annualCost = computed(() => this.monthlyCost() * 12);
  filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.subs() : this.subs().filter(s => s.status === f);
  });

  form: any = { name: '', cost: 0, currency: 'USD', cycle: 'monthly', category: 'Otros', status: 'active', next_payment_date: '', notes: '' };
  editId = '';
  categories = ['IA', 'Entretenimiento', 'Almacenamiento', 'Productividad', 'Hogar', 'Educacion', 'Salud', 'Transporte', 'Alimentacion', 'Otros'];
  statusFilters = [
    { label: 'Todas', value: 'all' },
    { label: 'Activas', value: 'active' },
    { label: 'Fallidas', value: 'failed' },
    { label: 'Pausadas', value: 'paused' },
    { label: 'Canceladas', value: 'cancelled' },
  ];

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try { this.subs.set(await this.sb.getSubscriptions()); }
    catch {} finally { this.loading.set(false); }
  }

  openForm() {
    this.form = { name: '', cost: 0, currency: 'USD', cycle: 'monthly', category: 'Otros', status: 'active', next_payment_date: '', notes: '' };
    this.editId = '';
    this.showForm.set(true);
  }

  openEdit(sub: Subscription) {
    this.form = { ...sub };
    this.editId = sub.id;
    this.showForm.set(true);
  }

  async save() {
    if (!this.form.name || !this.form.cost) return;
    this.saving.set(true);
    try {
      if (this.editId) {
        const { id, user_id, created_at, updated_at, ...updates } = this.form;
        await this.sb.updateSubscription(this.editId, updates);
      } else {
        await this.sb.createSubscription(this.form);
      }
      this.showForm.set(false);
      await this.load();
    } catch {} finally { this.saving.set(false); }
  }

  async deleteSub() {
    if (!confirm('¿Eliminar esta suscripción?')) return;
    try { await this.sb.deleteSubscription(this.editId); this.showForm.set(false); await this.load(); }
    catch {}
  }

  getCatColor(cat: string): string {
    const c: Record<string, string> = { 'IA': '#8B5CF6', 'Entretenimiento': '#EC4899', 'Almacenamiento': '#3B82F6', 'Productividad': '#10B981', 'Hogar': '#F59E0B', 'Educacion': '#6366F1', 'Salud': '#EF4444', 'Transporte': '#14B8A6', 'Alimentacion': '#F97316', 'Otros': '#6B7280' };
    return c[cat] || '#6B7280';
  }

  getCatIcon(cat: string): string {
    const i: Record<string, string> = { 'IA': 'smart_toy', 'Entretenimiento': 'movie', 'Almacenamiento': 'cloud', 'Productividad': 'work', 'Hogar': 'home', 'Educacion': 'school', 'Salud': 'favorite', 'Transporte': 'directions_car', 'Alimentacion': 'restaurant', 'Otros': 'receipt_long' };
    return i[cat] || 'receipt_long';
  }
}
