// src/app/pages/envelopes/envelopes.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Envelope, Transaction } from '../../core/services/supabase.service';

@Component({
  selector: 'app-envelopes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-black-kite">Sobres</h1>
        <button (click)="openCreate()" class="flex items-center gap-2 px-4 py-2 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark transition">
          <span class="material-icons text-lg">add</span> Nuevo sobre
        </button>
      </div>

      @if (loading()) {
        <div class="text-center py-16">
          <span class="material-icons text-4xl text-gray-300 animate-spin">autorenew</span>
        </div>
      } @else if (envelopes().length === 0) {
        <div class="text-center py-16">
          <span class="material-icons text-6xl text-gray-200">account_balance_wallet</span>
          <p class="text-gray-400 mt-3">Creá tu primer sobre de presupuesto</p>
          <button (click)="openCreate()" class="mt-4 px-6 py-2.5 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark transition">Crear sobre</button>
        </div>
      } @else {
        <!-- Resumen -->
        <div class="grid grid-cols-2 gap-3 mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p class="text-xs text-gray-400">Total presupuestado</p>
            <p class="text-xl font-bold text-black-kite mt-1">₡{{ totalBudget() | number:'1.0-0' }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p class="text-xs text-gray-400">Total gastado</p>
            <p class="text-xl font-bold text-garnet mt-1">₡{{ totalSpent() | number:'1.0-0' }}</p>
          </div>
        </div>

        <!-- Lista de sobres -->
        <div class="space-y-3">
          @for (env of envelopes(); track env.id) {
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition"
              (click)="selectEnvelope(env)">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center" [style.background]="env.color + '20'">
                    <span class="material-icons text-xl" [style.color]="env.color">{{ env.icon }}</span>
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">{{ env.name }}</h3>
                    <p class="text-xs text-gray-400">{{ env.period === 'monthly' ? 'Mensual' : env.period === 'annual' ? 'Anual' : env.period === 'weekly' ? 'Semanal' : 'Quincenal' }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold text-gray-800">₡{{ env.current_spent | number:'1.0-0' }}</p>
                  <p class="text-xs text-gray-400">de ₡{{ env.budget_limit | number:'1.0-0' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500"
                    [style.width.%]="Math.min(getPercent(env), 100)"
                    [class]="getPercent(env) >= 100 ? 'bg-red-500' : getPercent(env) >= 80 ? 'bg-amber-500' : 'bg-green-500'"
                  ></div>
                </div>
                <span class="text-xs font-medium w-10 text-right"
                  [class]="getPercent(env) >= 100 ? 'text-red-500' : getPercent(env) >= 80 ? 'text-amber-500' : 'text-green-500'"
                >{{ getPercent(env) | number:'1.0-0' }}%</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal: Crear/Editar sobre -->
      @if (showForm()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div class="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 class="font-semibold text-gray-800">{{ editing() ? 'Editar sobre' : 'Nuevo sobre' }}</h3>
              <button (click)="showForm.set(false)" class="material-icons text-gray-400 hover:text-gray-600">close</button>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" [(ngModel)]="form.name" placeholder="Ej: Alimentación" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Presupuesto límite</label>
                <input type="number" [(ngModel)]="form.budget_limit" placeholder="0" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Día de vencimiento</label>
                <div class="flex items-center gap-2">
                  <input type="number" [(ngModel)]="form.due_day" min="1" max="31" placeholder="Ej: 15" class="w-24 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
                  <span class="text-xs text-gray-400">del mes (1-31). Dejar vacío si no tiene vencimiento fijo.</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <select [(ngModel)]="form.period" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none bg-white">
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div class="flex gap-2 flex-wrap">
                  @for (c of colorOptions; track c) {
                    <button (click)="form.color = c" class="w-9 h-9 rounded-lg transition ring-2 ring-offset-2"
                      [style.background]="c"
                      [class]="form.color === c ? 'ring-black-kite' : 'ring-transparent'"
                    ></button>
                  }
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ícono</label>
                <div class="flex gap-2 flex-wrap">
                  @for (ic of iconOptions; track ic) {
                    <button (click)="form.icon = ic" class="w-9 h-9 rounded-lg flex items-center justify-center transition"
                      [class]="form.icon === ic ? 'bg-garnet text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                    >
                      <span class="material-icons text-lg">{{ ic }}</span>
                    </button>
                  }
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                @if (editing()) {
                  <button (click)="deleteEnvelope()" class="px-4 py-3 text-red-500 border border-red-200 rounded-xl text-sm hover:bg-red-50 transition">
                    <span class="material-icons text-lg">delete</span>
                  </button>
                }
                <button (click)="saveEnvelope()" [disabled]="saving()" class="flex-1 py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark disabled:opacity-50 transition">
                  {{ saving() ? 'Guardando...' : editing() ? 'Actualizar' : 'Crear sobre' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Detalle del sobre + transacciones -->
      @if (selectedEnvelope()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div class="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" [style.background]="selectedEnvelope()!.color + '20'">
                  <span class="material-icons" [style.color]="selectedEnvelope()!.color">{{ selectedEnvelope()!.icon }}</span>
                </div>
                <h3 class="font-semibold text-gray-800">{{ selectedEnvelope()!.name }}</h3>
              </div>
              <div class="flex items-center gap-1">
                <button (click)="openEdit(selectedEnvelope()!)" class="p-2 text-gray-400 hover:text-garnet rounded-lg hover:bg-gray-50"><span class="material-icons text-lg">edit</span></button>
                <button (click)="selectedEnvelope.set(null)" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"><span class="material-icons text-lg">close</span></button>
              </div>
            </div>

            <!-- Agregar gasto/ingreso -->
            <div class="p-4 border-b border-gray-100">
              <div class="flex gap-2 mb-3">
                <button (click)="txType = 'expense'" class="flex-1 py-2 rounded-xl text-sm font-medium transition"
                  [class]="txType === 'expense' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-50 text-gray-400'">
                  <span class="material-icons text-sm align-middle mr-1">remove</span>Gasto
                </button>
                <button (click)="txType = 'income'" class="flex-1 py-2 rounded-xl text-sm font-medium transition"
                  [class]="txType === 'income' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gray-50 text-gray-400'">
                  <span class="material-icons text-sm align-middle mr-1">add</span>Ingreso
                </button>
              </div>
              <div class="flex gap-2">
                <input type="number" [(ngModel)]="txAmount" placeholder="Monto" class="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
                <input type="text" [(ngModel)]="txDesc" placeholder="Descripción" class="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
                <button (click)="addTransaction()" class="px-4 py-2.5 bg-garnet text-white rounded-xl text-sm hover:bg-garnet-dark transition">
                  <span class="material-icons text-lg">check</span>
                </button>
              </div>
            </div>

            <!-- Transacciones -->
            <div class="p-4">
              <h4 class="text-sm font-medium text-gray-500 mb-3">Transacciones</h4>
              @if (envelopeTxs().length === 0) {
                <p class="text-center text-gray-300 text-sm py-6">Sin transacciones aún</p>
              } @else {
                <div class="space-y-2">
                  @for (tx of envelopeTxs(); track tx.id) {
                    <div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div class="flex items-center gap-2">
                        <span class="material-icons text-sm" [class]="tx.type === 'income' ? 'text-green-500' : 'text-red-400'">
                          {{ tx.type === 'income' ? 'arrow_upward' : 'arrow_downward' }}
                        </span>
                        <div>
                          <p class="text-sm text-gray-700">{{ tx.description || 'Sin descripción' }}</p>
                          <p class="text-[10px] text-gray-400">{{ tx.date | date:'dd/MM/yyyy' }}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium" [class]="tx.type === 'income' ? 'text-green-600' : 'text-gray-800'">
                          {{ tx.type === 'income' ? '+' : '-' }}₡{{ tx.amount | number:'1.0-0' }}
                        </span>
                        <button (click)="deleteTx(tx.id)" class="text-gray-300 hover:text-red-400 transition">
                          <span class="material-icons text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class EnvelopesComponent implements OnInit {
  private sb = inject(SupabaseService);
  Math = Math;

  envelopes = signal<Envelope[]>([]);
  envelopeTxs = signal<Transaction[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editing = signal(false);
  selectedEnvelope = signal<Envelope | null>(null);

  totalBudget = computed(() => this.envelopes().reduce((s, e) => s + Number(e.budget_limit), 0));
  totalSpent = computed(() => this.envelopes().reduce((s, e) => s + Number(e.current_spent), 0));

  form: any = { name: '', budget_limit: 0, color: '#733635', icon: 'account_balance_wallet', period: 'monthly', due_day: null };
  editId = '';
  txType: 'income' | 'expense' = 'expense';
  txAmount = 0;
  txDesc = '';

  colorOptions = ['#733635', '#351E1C', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#14B8A6', '#F97316'];
  iconOptions = ['account_balance_wallet', 'restaurant', 'home', 'school', 'directions_car', 'favorite', 'shopping_cart', 'movie', 'smart_toy', 'cloud', 'work', 'sports_esports'];

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    try { this.envelopes.set(await this.sb.getEnvelopes()); }
    catch {} finally { this.loading.set(false); }
  }

  getPercent(env: Envelope): number {
    return env.budget_limit > 0 ? (env.current_spent / env.budget_limit) * 100 : 0;
  }

  openCreate() {
    this.form = { name: '', budget_limit: 0, color: '#733635', icon: 'account_balance_wallet', period: 'monthly', due_day: null };
    this.editing.set(false);
    this.showForm.set(true);
  }

  openEdit(env: Envelope) {
    this.form = { name: env.name, budget_limit: env.budget_limit, color: env.color, icon: env.icon, period: env.period, due_day: env.due_day };
    this.editId = env.id;
    this.editing.set(true);
    this.selectedEnvelope.set(null);
    this.showForm.set(true);
  }

  async saveEnvelope() {
    if (!this.form.name) return;
    this.saving.set(true);
    try {
      if (this.editing()) {
        await this.sb.updateEnvelope(this.editId, this.form);
      } else {
        await this.sb.createEnvelope(this.form);
      }
      this.showForm.set(false);
      await this.load();
    } catch {} finally { this.saving.set(false); }
  }

  async deleteEnvelope() {
    if (!confirm('¿Eliminar este sobre y todas sus transacciones?')) return;
    try {
      await this.sb.deleteEnvelope(this.editId);
      this.showForm.set(false);
      await this.load();
    } catch {}
  }

  async selectEnvelope(env: Envelope) {
    this.selectedEnvelope.set(env);
    this.txAmount = 0;
    this.txDesc = '';
    this.txType = 'expense';
    try {
      this.envelopeTxs.set(await this.sb.getTransactions({ envelopeId: env.id }));
    } catch {}
  }

  async addTransaction() {
    if (!this.txAmount || !this.selectedEnvelope()) return;
    try {
      await this.sb.createTransaction({
        envelope_id: this.selectedEnvelope()!.id,
        type: this.txType,
        amount: this.txAmount,
        currency: 'CRC',
        description: this.txDesc || null,
        category: this.selectedEnvelope()!.name,
        date: new Date().toISOString().split('T')[0],
      });
      // Actualizar spent del sobre
      const delta = this.txType === 'expense' ? this.txAmount : -this.txAmount;
      await this.sb.updateEnvelope(this.selectedEnvelope()!.id, {
        current_spent: Number(this.selectedEnvelope()!.current_spent) + delta,
      });
      this.txAmount = 0;
      this.txDesc = '';
      await this.selectEnvelope(this.selectedEnvelope()!);
      await this.load();
    } catch {}
  }

  async deleteTx(id: string) {
    try {
      await this.sb.deleteTransaction(id);
      if (this.selectedEnvelope()) await this.selectEnvelope(this.selectedEnvelope()!);
      await this.load();
    } catch {}
  }
}
