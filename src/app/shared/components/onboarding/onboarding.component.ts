// src/app/shared/components/onboarding/onboarding.component.ts
import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
        <!-- Progress -->
        <div class="flex gap-1 p-4 pb-0">
          @for (s of [1,2,3]; track s) {
            <div class="flex-1 h-1.5 rounded-full transition-all duration-500"
              [class]="step() >= s ? 'bg-garnet' : 'bg-warm-gray'"></div>
          }
        </div>

        <!-- Step 1: Salario -->
        @if (step() === 1) {
          <div class="p-6">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-garnet/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span class="material-icons text-garnet text-3xl">payments</span>
              </div>
              <h2 class="text-xl font-bold text-black-kite">¡Bienvenido!</h2>
              <p class="text-gray-500 text-sm mt-2">Primero, configuremos tu ingreso quincenal</p>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Salario quincenal</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₡</span>
                  <input type="number" [(ngModel)]="salary" placeholder="250000"
                    class="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-garnet outline-none" />
                </div>
                <p class="text-xs text-gray-400 mt-1">₡{{ salary * 2 | number:'1.0-0' }}/mes · Se usa para calcular tu lista de pagos</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Moneda principal</label>
                <div class="grid grid-cols-2 gap-3">
                  <button (click)="currency = 'CRC'" class="py-3 rounded-xl text-sm font-medium transition"
                    [class]="currency === 'CRC' ? 'border-2 border-garnet bg-garnet/5 text-garnet' : 'border-2 border-gray-200 text-gray-500'">
                    🇨🇷 Colones
                  </button>
                  <button (click)="currency = 'USD'" class="py-3 rounded-xl text-sm font-medium transition"
                    [class]="currency === 'USD' ? 'border-2 border-garnet bg-garnet/5 text-garnet' : 'border-2 border-gray-200 text-gray-500'">
                    🇺🇸 Dólares
                  </button>
                </div>
              </div>
            </div>
            <button (click)="saveStep1()" [disabled]="!salary" class="w-full py-3 mt-6 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark disabled:opacity-40 transition">
              Continuar →
            </button>
          </div>
        }

        <!-- Step 2: Conectar correos -->
        @if (step() === 2) {
          <div class="p-6">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-garnet/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span class="material-icons text-garnet text-3xl">mail</span>
              </div>
              <h2 class="text-xl font-bold text-black-kite">Conectá tus correos</h2>
              <p class="text-gray-500 text-sm mt-2">Analizaremos tus recibos para detectar pagos automáticamente</p>
            </div>

            <div class="space-y-3">
              <!-- Gmail -->
              <button (click)="connectEmail('gmail')" [disabled]="connecting()"
                class="w-full flex items-center gap-4 p-4 border-2 rounded-xl transition"
                [class]="gmailConnected() ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style="background:#EA4335">
                  <span class="material-icons text-white text-2xl">mail</span>
                </div>
                <div class="text-left flex-1">
                  <p class="font-semibold text-gray-800">Gmail</p>
                  <p class="text-xs text-gray-400">{{ gmailConnected() ? '✓ Conectado' : 'Toca para conectar' }}</p>
                </div>
                @if (gmailConnected()) {
                  <span class="material-icons text-green-500">check_circle</span>
                }
              </button>

              <!-- Outlook -->
              <button (click)="connectEmail('outlook')" [disabled]="connecting()"
                class="w-full flex items-center gap-4 p-4 border-2 rounded-xl transition"
                [class]="outlookConnected() ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style="background:#0078D4">
                  <span class="material-icons text-white text-2xl">mail</span>
                </div>
                <div class="text-left flex-1">
                  <p class="font-semibold text-gray-800">Outlook / Hotmail</p>
                  <p class="text-xs text-gray-400">{{ outlookConnected() ? '✓ Conectado' : 'Toca para conectar' }}</p>
                </div>
                @if (outlookConnected()) {
                  <span class="material-icons text-green-500">check_circle</span>
                }
              </button>
            </div>

            <div class="bg-black-kite/5 rounded-xl p-3 mt-4 flex items-start gap-2">
              <span class="material-icons text-black-kite text-sm mt-0.5">shield</span>
              <p class="text-[10px] text-gray-500">Solo lectura. No modificamos ni enviamos correos. Podés desconectar en cualquier momento.</p>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="step.set(1)" class="px-4 py-3 text-gray-500 hover:text-gray-700 transition">← Atrás</button>
              <button (click)="saveStep2()" class="flex-1 py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark transition"
                [class.opacity-60]="!gmailConnected() && !outlookConnected()">
                {{ gmailConnected() || outlookConnected() ? 'Continuar →' : 'Omitir por ahora →' }}
              </button>
            </div>
          </div>
        }

        <!-- Step 3: Sincronizar y crear sobres -->
        @if (step() === 3) {
          <div class="p-6">
            <div class="text-center mb-6">
              @if (syncing()) {
                <div class="w-16 h-16 bg-garnet/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span class="material-icons text-garnet text-3xl animate-spin">autorenew</span>
                </div>
                <h2 class="text-xl font-bold text-black-kite">Analizando correos...</h2>
                <p class="text-gray-500 text-sm mt-2">Gemini IA está leyendo tus recibos</p>
              } @else if (syncDone()) {
                <div class="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span class="material-icons text-green-500 text-3xl">check_circle</span>
                </div>
                <h2 class="text-xl font-bold text-black-kite">¡Todo listo!</h2>
                <p class="text-gray-500 text-sm mt-2">
                  {{ syncResult() }}
                </p>
              } @else {
                <div class="w-16 h-16 bg-garnet/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span class="material-icons text-garnet text-3xl">smart_toy</span>
                </div>
                <h2 class="text-xl font-bold text-black-kite">Detectar gastos</h2>
                <p class="text-gray-500 text-sm mt-2">Sincronizaremos tus correos y la IA detectará tus pagos recurrentes</p>
              }
            </div>

            @if (!syncing() && !syncDone()) {
              <div class="space-y-3">
                <div class="bg-warm-gray/50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
                  <p class="flex items-center gap-2"><span class="material-icons text-garnet text-base">mail</span> Escanear correos financieros</p>
                  <p class="flex items-center gap-2"><span class="material-icons text-garnet text-base">smart_toy</span> Gemini extrae montos y servicios</p>
                  <p class="flex items-center gap-2"><span class="material-icons text-garnet text-base">calculate</span> Calcular promedios por servicio</p>
                  <p class="flex items-center gap-2"><span class="material-icons text-garnet text-base">account_balance_wallet</span> Sugerir sobres automáticos</p>
                </div>
              </div>
            }

            <div class="flex gap-3 mt-6">
              @if (!syncDone()) {
                <button (click)="step.set(2)" class="px-4 py-3 text-gray-500 hover:text-gray-700 transition">← Atrás</button>
                <button (click)="syncAndFinish()" [disabled]="syncing()"
                  class="flex-1 py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark disabled:opacity-50 transition flex items-center justify-center gap-2">
                  @if (syncing()) {
                    <span class="material-icons animate-spin text-base">autorenew</span> Analizando...
                  } @else {
                    <span class="material-icons text-base">rocket_launch</span> Sincronizar y analizar
                  }
                </button>
              } @else {
                <button (click)="finish()" class="flex-1 py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark transition flex items-center justify-center gap-2">
                  <span class="material-icons text-base">dashboard</span> Ir al Dashboard
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class OnboardingComponent {
  private sb = inject(SupabaseService);

  completed = output<void>();

  step = signal(1);
  salary = 250000;
  currency: 'CRC' | 'USD' = 'CRC';
  connecting = signal(false);
  gmailConnected = signal(false);
  outlookConnected = signal(false);
  syncing = signal(false);
  syncDone = signal(false);
  syncResult = signal('');

  async saveStep1() {
    if (!this.salary) return;
    try {
      await this.sb.updateProfile({ display_name: this.sb.profile()?.display_name, currency_default: this.currency } as any);
      await this.sb.client.from('profiles').update({ biweekly_salary: this.salary }).eq('id', this.sb.currentUser()!.id);

      // Generar calendario de pagos automático
      const year = new Date().getFullYear();
      const entries: any[] = [];
      for (let m = 0; m < 12; m++) {
        entries.push({ payment_type: 'Q1', payment_date: `${year}-${String(m + 1).padStart(2, '0')}-15`, amount: this.salary, currency: 'CRC', is_confirmed: false, notes: null });
        const lastDay = new Date(year, m + 1, 0).getDate();
        entries.push({ payment_type: 'Q2', payment_date: `${year}-${String(m + 1).padStart(2, '0')}-${lastDay}`, amount: this.salary, currency: 'CRC', is_confirmed: false, notes: null });
      }
      await this.sb.bulkCreatePaymentEntries(entries);
      await this.sb.completeOnboardingStep(1);
      this.step.set(2);
    } catch {}
  }

  async connectEmail(provider: 'gmail' | 'outlook') {
    this.connecting.set(true);
    try {
      await this.sb.connectEmailAccount(provider);
      if (provider === 'gmail') this.gmailConnected.set(true);
      else this.outlookConnected.set(true);
    } catch {}
    finally { this.connecting.set(false); }
  }

  async saveStep2() {
    await this.sb.completeOnboardingStep(2);
    this.step.set(3);
  }

  async syncAndFinish() {
    this.syncing.set(true);
    try {
      const results = await this.sb.syncAllEmails();
      const totalReceipts = results.reduce((s, r) => s + (r.new_receipts || 0), 0);

      // Los promedios se calculan automáticamente en syncAllEmails
      const averages = await this.sb.getExpenseAverages();

      this.syncResult.set(
        totalReceipts > 0
          ? `${totalReceipts} recibos detectados, ${averages.length} servicios identificados. Las sugerencias aparecerán en tu Dashboard.`
          : 'No se encontraron recibos aún. Podés sincronizar más adelante desde Correos.'
      );
      this.syncDone.set(true);
      await this.sb.completeOnboardingStep(3);
    } catch {
      this.syncResult.set('Hubo un error, pero podés sincronizar después desde Correos.');
      this.syncDone.set(true);
    } finally {
      this.syncing.set(false);
    }
  }

  finish() {
    this.completed.emit();
  }
}
