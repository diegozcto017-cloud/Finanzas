// src/app/pages/purchases/purchases.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Purchase } from '../../core/services/supabase.service';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-black-kite">Compras</h1>
        <button (click)="openForm()" class="flex items-center gap-2 px-4 py-2 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark transition">
          <span class="material-icons text-lg">add</span> Nueva
        </button>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2 mb-5">
        @for (f of filters; track f.v) {
          <button (click)="activeFilter.set(f.v)" class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
            [class]="activeFilter() === f.v ? 'bg-garnet text-white' : 'bg-warm-gray text-gray-600 hover:bg-gray-200'">{{ f.l }}</button>
        }
      </div>

      @if (loading()) {
        <div class="text-center py-16"><span class="material-icons text-4xl text-gray-300 animate-spin">autorenew</span></div>
      } @else if (filtered().length === 0) {
        <div class="text-center py-16">
          <span class="material-icons text-5xl text-gray-200">shopping_cart</span>
          <p class="text-gray-400 mt-2">Sin artículos en la lista</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (p of filtered(); track p.id) {
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <button (click)="toggleStatus(p)" class="w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition"
                  [class]="p.status === 'comprado' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-garnet'">
                  @if (p.status === 'comprado') { <span class="material-icons text-sm">check</span> }
                </button>
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate" [class]="p.status === 'comprado' ? 'text-gray-400 line-through' : 'text-gray-800'">{{ p.name }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      [class]="p.priority === 'alta' ? 'bg-red-50 text-red-500' : p.priority === 'media' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-500'">
                      {{ p.priority === 'alta' ? '🔴 Alta' : p.priority === 'media' ? '🟡 Media' : '🔵 Baja' }}
                    </span>
                    @if (p.url) {
                      <a [href]="p.url" target="_blank" class="text-[10px] text-garnet hover:underline flex items-center gap-0.5" (click)="$event.stopPropagation()">
                        <span class="material-icons text-xs">link</span> Ver
                      </a>
                    }
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0 ml-2">
                @if (p.cost) {
                  <span class="text-sm font-bold text-gray-800">{{ p.currency === 'CRC' ? '₡' : '$' }}{{ p.cost | number:'1.0-0' }}</span>
                }
                <button (click)="openEdit(p)" class="p-1.5 text-gray-300 hover:text-garnet rounded-lg hover:bg-gray-50">
                  <span class="material-icons text-lg">edit</span>
                </button>
              </div>
            </div>
          }
        </div>
        <div class="mt-4 bg-black-kite/5 rounded-xl p-3 flex items-center justify-between">
          <span class="text-sm text-gray-600">Total pendiente</span>
          <span class="font-bold text-garnet">\${{ totalPending() | number:'1.0-0' }}</span>
        </div>
      }

      @if (showForm()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md">
            <div class="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">{{ editId ? 'Editar' : 'Nuevo' }} artículo</h3>
              <button (click)="showForm.set(false)" class="material-icons text-gray-400 hover:text-gray-600">close</button>
            </div>
            <div class="p-5 space-y-4">
              <input type="text" [(ngModel)]="form.name" placeholder="Nombre del artículo" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
              <div class="grid grid-cols-2 gap-3">
                <input type="number" [(ngModel)]="form.cost" placeholder="Costo" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
                <select [(ngModel)]="form.currency" class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-garnet outline-none">
                  <option value="USD">USD</option><option value="CRC">CRC</option>
                </select>
              </div>
              <input type="url" [(ngModel)]="form.url" placeholder="URL (opcional)" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
                <div class="flex gap-2">
                  @for (pr of ['alta','media','baja']; track pr) {
                    <button (click)="form.priority = pr" class="flex-1 py-2 rounded-xl text-sm font-medium transition"
                      [class]="form.priority === pr ? 'bg-garnet text-white' : 'bg-gray-100 text-gray-500'">{{ pr | titlecase }}</button>
                  }
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                @if (editId) {
                  <button (click)="deleteItem()" class="px-4 py-3 text-red-500 border border-red-200 rounded-xl text-sm hover:bg-red-50"><span class="material-icons text-lg">delete</span></button>
                }
                <button (click)="save()" class="flex-1 py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark transition">
                  {{ editId ? 'Actualizar' : 'Agregar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PurchasesComponent implements OnInit {
  private sb = inject(SupabaseService);
  items = signal<Purchase[]>([]);
  loading = signal(true);
  showForm = signal(false);
  activeFilter = signal('all');
  form: any = { name: '', cost: null, currency: 'USD', url: '', priority: 'media' };
  editId = '';
  filters = [{ l: 'Todas', v: 'all' }, { l: 'Pendientes', v: 'pendiente' }, { l: 'Compradas', v: 'comprado' }];
  filtered = computed(() => { const f = this.activeFilter(); return f === 'all' ? this.items() : this.items().filter(i => i.status === f); });
  totalPending = computed(() => this.items().filter(i => i.status === 'pendiente').reduce((s, i) => s + Number(i.cost || 0), 0));

  async ngOnInit() { await this.load(); }
  async load() { this.loading.set(true); try { this.items.set(await this.sb.getPurchases()); } catch {} finally { this.loading.set(false); } }

  openForm() { this.form = { name: '', cost: null, currency: 'USD', url: '', priority: 'media' }; this.editId = ''; this.showForm.set(true); }
  openEdit(p: Purchase) { this.form = { name: p.name, cost: p.cost, currency: p.currency, url: p.url, priority: p.priority }; this.editId = p.id; this.showForm.set(true); }

  async save() {
    if (!this.form.name) return;
    try {
      if (this.editId) { await this.sb.updatePurchase(this.editId, this.form); }
      else { await this.sb.createPurchase({ ...this.form, status: 'pendiente' }); }
      this.showForm.set(false); await this.load();
    } catch {}
  }

  async toggleStatus(p: Purchase) {
    const newStatus = p.status === 'pendiente' ? 'comprado' : 'pendiente';
    await this.sb.updatePurchase(p.id, { status: newStatus, purchased_at: newStatus === 'comprado' ? new Date().toISOString() : null });
    await this.load();
  }

  async deleteItem() { if (!confirm('¿Eliminar?')) return; await this.sb.deletePurchase(this.editId); this.showForm.set(false); await this.load(); }
}
