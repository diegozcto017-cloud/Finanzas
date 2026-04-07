// src/app/pages/dashboard/dashboard.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupabaseService, Envelope, Subscription, PaymentCalendarEntry } from '../../core/services/supabase.service';
import { SuggestionsBannerComponent } from '../../shared/components/suggestions-banner/suggestions-banner.component';
import { OnboardingComponent } from '../../shared/components/onboarding/onboarding.component';

interface PaycheckAssignment {
  id: string;
  assigned_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  envelopes: { name: string; icon: string; color: string; due_day: number } | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SuggestionsBannerComponent, OnboardingComponent],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <p class="text-gray-500 text-sm">Bienvenido,</p>
          <h1 class="text-2xl font-bold text-black-kite">{{ displayName() }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <button routerLink="/correos" class="relative p-2 rounded-xl hover:bg-warm-gray transition">
            <span class="material-icons text-gray-500">mail</span>
            @if (pendingReceipts() > 0) {
              <span class="absolute -top-1 -right-1 bg-garnet text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{{ pendingReceipts() }}</span>
            }
          </button>
          <a routerLink="/perfil" class="w-10 h-10 rounded-xl bg-garnet/10 flex items-center justify-center">
            <span class="material-icons text-garnet">person</span>
          </a>
        </div>
      </div>

      @if (loading()) {
        <div class="text-center py-20">
          <span class="material-icons text-4xl text-gray-300 animate-spin">autorenew</span>
        </div>
      } @else {
        <!-- Onboarding wizard -->
        @if (showOnboarding()) {
          <app-onboarding (completed)="onOnboardingComplete()" />
        }

        <!-- Banner de sugerencias IA -->
        <app-suggestions-banner (envelopesCreated)="onEnvelopesCreated($event)" />

        <!-- Próxima quincena -->
        @if (nextPaycheck()) {
          <div class="bg-black-kite rounded-2xl p-5 mb-5 text-white">
            <div class="flex items-center justify-between mb-1">
              <p class="text-white/50 text-xs uppercase tracking-wider">Próxima quincena</p>
              <span class="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                {{ nextPaycheck()!.payment_type === 'Q1' ? '1ra Quincena' : '2da Quincena' }}
              </span>
            </div>
            <p class="text-3xl font-bold mt-1">₡{{ nextPaycheck()!.amount | number:'1.0-0' }}</p>
            <p class="text-white/40 text-sm mt-1">{{ nextPaycheck()!.payment_date | date:'EEEE d MMMM':'':'es' }}</p>

            <!-- Barra de uso -->
            <div class="mt-4">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-white/60">Comprometido: ₡{{ totalCommitted() | number:'1.0-0' }}</span>
                <span [class]="availableStatus() === 'deficit' ? 'text-red-300' : availableStatus() === 'tight' ? 'text-amber-300' : 'text-green-300'">
                  Disponible: ₡{{ available() | number:'1.0-0' }}
                </span>
              </div>
              <div class="h-3 bg-white/10 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500"
                  [style.width.%]="Math.min(committedPercent(), 100)"
                  [class]="availableStatus() === 'deficit' ? 'bg-red-400' : availableStatus() === 'tight' ? 'bg-amber-400' : 'bg-green-400'"
                ></div>
              </div>
            </div>
          </div>
        } @else {
          <div class="bg-warm-gray rounded-2xl p-5 mb-5 text-center">
            <span class="material-icons text-3xl text-gray-400">calendar_month</span>
            <p class="text-gray-500 text-sm mt-2">Configurá tu calendario de pagos para ver tu quincena</p>
            <a routerLink="/calendario" class="text-garnet text-sm font-medium hover:underline mt-1 inline-block">Ir al calendario →</a>
          </div>
        }

        <!-- Lista de pagos de esta quincena ("lista de super") -->
        @if (assignments().length > 0) {
          <div class="mb-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold text-black-kite flex items-center gap-2">
                <span class="material-icons text-garnet text-lg">checklist</span> Pagos esta quincena
              </h2>
              <span class="text-xs text-gray-400">{{ paidCount() }}/{{ assignments().length }} pagados</span>
            </div>
            <div class="space-y-2">
              @for (a of assignments(); track a.id) {
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center justify-between"
                  [class.opacity-60]="a.is_paid">
                  <div class="flex items-center gap-3">
                    <button (click)="togglePaid(a)" class="w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition"
                      [class]="a.is_paid ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-garnet'">
                      @if (a.is_paid) { <span class="material-icons text-sm">check</span> }
                    </button>
                    <div class="flex items-center gap-2">
                      @if (a.envelopes) {
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center" [style.background]="a.envelopes.color + '20'">
                          <span class="material-icons text-sm" [style.color]="a.envelopes.color">{{ a.envelopes.icon }}</span>
                        </div>
                      }
                      <div>
                        <p class="text-sm font-medium" [class]="a.is_paid ? 'text-gray-400 line-through' : 'text-gray-800'">
                          {{ a.envelopes?.name || 'Sin sobre' }}
                        </p>
                        @if (a.envelopes?.due_day) {
                          <p class="text-[10px] text-gray-400">Vence día {{ a.envelopes?.due_day }}</p>
                        }
                      </div>
                    </div>
                  </div>
                  <span class="text-sm font-bold" [class]="a.is_paid ? 'text-gray-400' : 'text-black-kite'">
                    ₡{{ a.assigned_amount | number:'1.0-0' }}
                  </span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Alertas: pagos próximos a vencer -->
        @if (dueSoonEnvelopes().length > 0) {
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <h3 class="font-semibold text-amber-800 text-sm mb-3 flex items-center gap-2">
              <span class="material-icons text-amber-500">warning</span> Vencen pronto
            </h3>
            @for (env of dueSoonEnvelopes(); track env.id) {
              <div class="flex items-center justify-between py-1.5">
                <span class="text-sm text-amber-800">{{ env.name }}</span>
                <span class="text-xs text-amber-600">Día {{ env.due_day }} · ₡{{ env.average_amount || env.budget_limit | number:'1.0-0' }}</span>
              </div>
            }
          </div>
        }

        <!-- Acciones rápidas -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          @for (action of quickActions; track action.route) {
            <a [routerLink]="action.route" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col items-center gap-2 hover:shadow-md transition">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center" [style.background]="action.color + '15'">
                <span class="material-icons" [style.color]="action.color">{{ action.icon }}</span>
              </div>
              <span class="text-xs font-medium text-gray-600 text-center">{{ action.label }}</span>
            </a>
          }
        </div>

        <!-- Sobres activos -->
        <div class="mb-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-gray-800">Sobres de presupuesto</h2>
            <a routerLink="/sobres" class="text-garnet text-sm font-medium hover:underline flex items-center gap-1">
              Ver todos <span class="material-icons text-sm">chevron_right</span>
            </a>
          </div>
          @if (envelopes().length === 0) {
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              <span class="material-icons text-3xl text-gray-200">account_balance_wallet</span>
              <p class="text-gray-400 text-sm mt-2">Sin sobres creados</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              @for (env of envelopes().slice(0, 4); track env.id) {
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-lg flex items-center justify-center" [style.background]="env.color + '20'">
                        <span class="material-icons text-base" [style.color]="env.color">{{ env.icon }}</span>
                      </div>
                      <span class="text-sm font-medium text-gray-800">{{ env.name }}</span>
                    </div>
                    @if (env.due_day) {
                      <span class="text-[10px] bg-warm-gray px-2 py-0.5 rounded-full text-gray-500">Día {{ env.due_day }}</span>
                    }
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-500"
                        [style.width.%]="Math.min(getPercent(env), 100)"
                        [class]="env.is_paid_this_period ? 'bg-green-500' : getPercent(env) >= 100 ? 'bg-red-500' : getPercent(env) >= 80 ? 'bg-amber-500' : 'bg-garnet'"
                      ></div>
                    </div>
                    <span class="text-xs text-gray-400">₡{{ env.current_spent | number:'1.0-0' }}/{{ env.budget_limit | number:'1.0-0' }}</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Suscripciones activas resumen -->
        @if (subscriptions().length > 0) {
          <div>
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold text-gray-800">Suscripciones</h2>
              <a routerLink="/suscripciones" class="text-garnet text-sm font-medium hover:underline flex items-center gap-1">
                Ver todas <span class="material-icons text-sm">chevron_right</span>
              </a>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              @for (sub of subscriptions().slice(0, 4); track sub.id) {
                <div class="flex items-center justify-between p-3">
                  <span class="text-sm text-gray-700">{{ sub.name }}</span>
                  <span class="text-sm font-bold text-gray-800">{{ sub.currency === 'CRC' ? '₡' : '$' }}{{ sub.cost | number:'1.2-2' }}</span>
                </div>
              }
            </div>
            <div class="mt-2 bg-garnet/5 rounded-xl p-3 flex items-center justify-between">
              <span class="text-sm text-gray-600">Total mensual</span>
              <span class="font-bold text-garnet">\${{ monthlySubs() | number:'1.2-2' }}</span>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private sb = inject(SupabaseService);
  Math = Math;

  loading = signal(true);
  showOnboarding = signal(false);
  nextPaycheck = signal<PaymentCalendarEntry | null>(null);
  assignments = signal<PaycheckAssignment[]>([]);
  envelopes = signal<Envelope[]>([]);
  subscriptions = signal<Subscription[]>([]);
  pendingReceipts = signal(0);

  displayName = computed(() => this.sb.profile()?.display_name || 'Usuario');

  totalCommitted = computed(() => this.assignments().reduce((s, a) => s + Number(a.assigned_amount), 0));
  available = computed(() => {
    const pay = this.nextPaycheck();
    return pay ? Number(pay.amount) - this.totalCommitted() : 0;
  });
  committedPercent = computed(() => {
    const pay = this.nextPaycheck();
    return pay && Number(pay.amount) > 0 ? (this.totalCommitted() / Number(pay.amount)) * 100 : 0;
  });
  availableStatus = computed(() => {
    const pct = this.committedPercent();
    return pct > 100 ? 'deficit' : pct > 80 ? 'tight' : 'ok';
  });
  paidCount = computed(() => this.assignments().filter(a => a.is_paid).length);

  dueSoonEnvelopes = computed(() => {
    const today = new Date().getDate();
    return this.envelopes().filter(e => e.due_day && !e.is_paid_this_period && e.due_day >= today && e.due_day <= today + 5);
  });

  monthlySubs = computed(() => this.subscriptions().reduce((t, s) => {
    const c = Number(s.cost);
    return t + (s.cycle === 'annual' ? c / 12 : s.cycle === 'weekly' ? c * 4 : c);
  }, 0));

  quickActions = [
    { label: 'Sobres', icon: 'account_balance_wallet', route: '/sobres', color: '#733635' },
    { label: 'Suscripciones', icon: 'autorenew', route: '/suscripciones', color: '#8B5CF6' },
    { label: 'Gastos IA', icon: 'smart_toy', route: '/gastos-detectados', color: '#351E1C' },
    { label: 'Correos', icon: 'mail', route: '/correos', color: '#3B82F6' },
  ];

  async ngOnInit() {
    try {
      // Verificar si necesita onboarding
      if (!this.sb.isOnboardingComplete) {
        this.showOnboarding.set(true);
      }

      const [paycheck, envelopes, subs, receipts] = await Promise.all([
        this.sb.getNextPaycheck(),
        this.sb.getEnvelopes(),
        this.sb.getSubscriptions('active'),
        this.sb.getEmailReceipts({ status: 'pending' }),
      ]);

      this.nextPaycheck.set(paycheck);
      this.envelopes.set(envelopes.filter(e => e.is_active));
      this.subscriptions.set(subs);
      this.pendingReceipts.set(receipts.length);

      // Generar y cargar lista de pagos de la próxima quincena
      if (paycheck) {
        await this.sb.generatePaycheckList(paycheck.id);
        const assignments = await this.sb.getPaycheckAssignments(paycheck.id);
        this.assignments.set(assignments as PaycheckAssignment[]);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      this.loading.set(false);
    }
  }

  getPercent(env: Envelope): number {
    return env.budget_limit > 0 ? (Number(env.current_spent) / Number(env.budget_limit)) * 100 : 0;
  }

  async togglePaid(assignment: PaycheckAssignment) {
    if (assignment.is_paid) return;
    try {
      await this.sb.markAssignmentPaid(assignment.id);
      this.assignments.update(list =>
        list.map(a => a.id === assignment.id ? { ...a, is_paid: true, paid_at: new Date().toISOString() } : a)
      );
    } catch {}
  }

  async onOnboardingComplete() {
    this.showOnboarding.set(false);
    await this.ngOnInit(); // Recargar todo
  }

  async onEnvelopesCreated(count: number) {
    // Refrescar sobres y lista de pagos
    const envelopes = await this.sb.getEnvelopes();
    this.envelopes.set(envelopes.filter(e => e.is_active));
    const paycheck = this.nextPaycheck();
    if (paycheck) {
      await this.sb.generatePaycheckList(paycheck.id);
      const assignments = await this.sb.getPaycheckAssignments(paycheck.id);
      this.assignments.set(assignments as PaycheckAssignment[]);
    }
  }
}
