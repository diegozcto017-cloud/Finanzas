// src/app/shared/components/suggestions-banner/suggestions-banner.component.ts
import { Component, inject, signal, computed, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

interface Suggestion {
  id: string;
  service_name: string;
  category: string;
  currency: string;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
  payment_count: number;
  typical_day: number | null;
  confidence: number;
  selected: boolean;
}

@Component({
  selector: 'app-suggestions-banner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (suggestions().length > 0 && !dismissed()) {
      <div class="bg-gradient-to-r from-black-kite to-kite-warm rounded-2xl p-5 mb-5 text-white animate-fade-in">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-garnet rounded-xl flex items-center justify-center shrink-0">
              <span class="material-icons text-xl">smart_toy</span>
            </div>
            <div>
              <h3 class="font-semibold text-sm">{{ suggestions().length }} servicios detectados</h3>
              <p class="text-white/50 text-xs mt-0.5">Basado en el análisis de tus correos</p>
            </div>
          </div>
          <button (click)="dismissed.set(true)" class="text-white/30 hover:text-white/60 transition">
            <span class="material-icons text-lg">close</span>
          </button>
        </div>

        <!-- Lista de sugerencias con checkboxes -->
        <div class="space-y-2 mb-4 max-h-60 overflow-y-auto">
          @for (s of suggestions(); track s.id) {
            <label class="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-3 cursor-pointer transition">
              <input type="checkbox" [(ngModel)]="s.selected"
                class="w-4.5 h-4.5 accent-garnet rounded" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium truncate">{{ s.service_name }}</span>
                  <span class="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{{ s.category }}</span>
                </div>
                <div class="flex items-center gap-3 mt-0.5">
                  <span class="text-xs text-white/40">
                    {{ s.currency === 'CRC' ? '₡' : '$' }}{{ s.avg_amount | number:'1.2-2' }}/mes
                  </span>
                  @if (s.typical_day) {
                    <span class="text-xs text-white/40">Día {{ s.typical_day }}</span>
                  }
                  <span class="text-xs" [class]="s.payment_count >= 3 ? 'text-green-300' : 'text-amber-300'">
                    {{ s.payment_count }} pagos
                  </span>
                </div>
              </div>
              <!-- Indicador de confianza -->
              <div class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                [class]="s.payment_count >= 3 ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'">
                {{ s.payment_count >= 3 ? '✓' : '?' }}
              </div>
            </label>
          }
        </div>

        <!-- Resumen y acciones -->
        <div class="flex items-center justify-between bg-white/5 rounded-xl p-3 mb-3">
          <div>
            <p class="text-xs text-white/40">Seleccionados: {{ selectedCount() }} de {{ suggestions().length }}</p>
            <p class="text-sm font-bold">Total: ₡{{ selectedTotal() | number:'1.0-0' }}/mes</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-white/40">De tu quincena de ₡250,000</p>
            <p class="text-sm font-medium"
              [class]="selectedTotal() > 250000 ? 'text-red-300' : 'text-green-300'">
              {{ selectedTotal() > 250000 ? 'Excede quincena ⚠️' : 'Dentro del presupuesto ✓' }}
            </p>
          </div>
        </div>

        <!-- Botones -->
        <div class="flex gap-2">
          <button
            (click)="createSelected()"
            [disabled]="selectedCount() === 0 || creating()"
            class="flex-1 py-2.5 bg-garnet text-white rounded-xl text-sm font-semibold hover:bg-garnet-dark disabled:opacity-40 transition flex items-center justify-center gap-2"
          >
            @if (creating()) {
              <span class="material-icons animate-spin text-base">autorenew</span>
              Creando sobres...
            } @else {
              <span class="material-icons text-base">check_circle</span>
              Crear {{ selectedCount() }} sobres
            }
          </button>
          <button (click)="selectAll()" class="px-3 py-2.5 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition">
            {{ allSelected() ? 'Ninguno' : 'Todos' }}
          </button>
        </div>

        <!-- Resultado -->
        @if (result()) {
          <div class="mt-3 bg-green-500/20 rounded-xl p-3 text-xs text-green-200 flex items-center gap-2">
            <span class="material-icons text-base">check_circle</span>
            {{ result() }}
          </div>
        }
      </div>
    }
  `,
})
export class SuggestionsBannerComponent implements OnInit {
  private sb = inject(SupabaseService);

  suggestions = signal<Suggestion[]>([]);
  dismissed = signal(false);
  creating = signal(false);
  result = signal<string | null>(null);

  // Emitir evento cuando se crean sobres para refrescar el dashboard
  envelopesCreated = output<number>();

  selectedCount = computed(() => this.suggestions().filter(s => s.selected).length);
  allSelected = computed(() => this.suggestions().every(s => s.selected));
  selectedTotal = computed(() =>
    this.suggestions()
      .filter(s => s.selected)
      .reduce((sum, s) => sum + (s.currency === 'CRC' ? s.avg_amount : s.avg_amount * 530), 0)
  );

  async ngOnInit() {
    try {
      const unlinked = await this.sb.getUnlinkedSuggestions();
      this.suggestions.set(
        unlinked.map(u => ({
          ...u,
          confidence: u.payment_count >= 3 ? 0.9 : u.payment_count >= 2 ? 0.7 : 0.4,
          // Pre-marcar los de alta confianza (3+ pagos detectados)
          selected: u.payment_count >= 3,
        }))
      );
    } catch {}
  }

  selectAll() {
    const newState = !this.allSelected();
    this.suggestions.update(list =>
      list.map(s => ({ ...s, selected: newState }))
    );
  }

  async createSelected() {
    const selected = this.suggestions().filter(s => s.selected);
    if (selected.length === 0) return;

    this.creating.set(true);
    try {
      const results = await this.sb.bulkCreateEnvelopesFromSuggestions(selected);
      const created = results.filter(r => r.success).length;

      // Remover los creados de la lista
      const createdNames = new Set(results.filter(r => r.success).map(r => r.name));
      this.suggestions.update(list => list.filter(s => !createdNames.has(s.service_name)));

      this.result.set(`${created} sobres creados con fecha de vencimiento y monto automático`);
      this.envelopesCreated.emit(created);

      // Auto-dismiss después de 5 segundos si no quedan sugerencias
      if (this.suggestions().length === 0) {
        setTimeout(() => this.dismissed.set(true), 5000);
      }
    } catch {
      this.result.set('Error al crear sobres');
    } finally {
      this.creating.set(false);
    }
  }
}
