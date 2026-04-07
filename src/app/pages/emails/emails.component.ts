// src/app/pages/emails/emails.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService, EmailAccount, EmailReceipt, Envelope } from '../../core/services/supabase.service';

type TabId = 'accounts' | 'receipts' | 'history';
type ReceiptAction = 'subscription' | 'transaction' | 'ignore';

@Component({
  selector: 'app-emails',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-black-kite">Centro de Correos</h1>
          <p class="text-gray-500 text-sm mt-1">Conecta tus cuentas y detecta pagos automáticamente</p>
        </div>
        <button
          (click)="syncAll()"
          [disabled]="syncing()"
          class="flex items-center gap-2 px-4 py-2 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark disabled:opacity-50 transition"
        >
          <span class="material-icons text-lg" [class.animate-spin]="syncing()">
            {{ syncing() ? 'autorenew' : 'sync' }}
          </span>
          {{ syncing() ? 'Sincronizando...' : 'Sincronizar todo' }}
        </button>
      </div>

      @if (toast()) {
        <div
          class="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm animate-fade-in"
          [class]="toast()!.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : toast()!.type === 'error'
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-blue-50 border border-blue-200 text-blue-700'"
        >
          <span class="material-icons text-lg">
            {{ toast()!.type === 'success' ? 'check_circle' : toast()!.type === 'error' ? 'error' : 'info' }}
          </span>
          {{ toast()!.message }}
          <button (click)="toast.set(null)" class="ml-auto material-icons text-lg opacity-60 hover:opacity-100">close</button>
        </div>
      }

      <div class="flex gap-1 bg-warm-gray rounded-xl p-1 mb-6">
        @for (tab of tabs; track tab.id) {
          <button
            (click)="activeTab.set(tab.id)"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition"
            [class]="activeTab() === tab.id
              ? 'bg-white text-black-kite shadow-sm'
              : 'text-gray-500 hover:text-gray-700'"
          >
            <span class="material-icons text-lg">{{ tab.icon }}</span>
            <span class="hidden sm:inline">{{ tab.label }}</span>
            @if (tab.id === 'receipts' && pendingCount() > 0) {
              <span class="bg-garnet text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {{ pendingCount() }}
              </span>
            }
          </button>
        }
      </div>

      <!-- Tab: Cuentas conectadas -->
      @if (activeTab() === 'accounts') {
        <div class="space-y-4">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: #EA4335">
                  <span class="material-icons text-white text-2xl">mail</span>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800">Gmail</h3>
                  @if (gmailAccount()) {
                    <p class="text-sm text-gray-500">{{ gmailAccount()!.email_address }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">
                      Última sync: {{ gmailAccount()!.last_sync_at ? (gmailAccount()!.last_sync_at | date:'dd/MM/yyyy HH:mm') : 'Nunca' }}
                    </p>
                  } @else {
                    <p class="text-sm text-gray-400">No conectado</p>
                  }
                </div>
              </div>
              <div class="flex items-center gap-2">
                @if (gmailAccount()?.is_connected) {
                  <button (click)="syncProvider('gmail')" [disabled]="syncing()" class="p-2 text-gray-400 hover:text-garnet rounded-lg hover:bg-gray-50 transition" title="Sincronizar">
                    <span class="material-icons" [class.animate-spin]="syncing()">sync</span>
                  </button>
                  <button (click)="disconnect(gmailAccount()!.id)" class="px-4 py-2 text-red-500 border border-red-200 rounded-xl text-sm hover:bg-red-50 transition">Desconectar</button>
                } @else {
                  <button (click)="connect('gmail')" [disabled]="connecting()" class="px-4 py-2 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark disabled:opacity-50 transition">
                    {{ connecting() ? 'Conectando...' : 'Conectar' }}
                  </button>
                }
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: #0078D4">
                  <span class="material-icons text-white text-2xl">mail</span>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800">Outlook / Hotmail</h3>
                  @if (outlookAccount()) {
                    <p class="text-sm text-gray-500">{{ outlookAccount()!.email_address }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">
                      Última sync: {{ outlookAccount()!.last_sync_at ? (outlookAccount()!.last_sync_at | date:'dd/MM/yyyy HH:mm') : 'Nunca' }}
                    </p>
                  } @else {
                    <p class="text-sm text-gray-400">No conectado</p>
                  }
                </div>
              </div>
              <div class="flex items-center gap-2">
                @if (outlookAccount()?.is_connected) {
                  <button (click)="syncProvider('outlook')" [disabled]="syncing()" class="p-2 text-gray-400 hover:text-garnet rounded-lg hover:bg-gray-50 transition" title="Sincronizar">
                    <span class="material-icons" [class.animate-spin]="syncing()">sync</span>
                  </button>
                  <button (click)="disconnect(outlookAccount()!.id)" class="px-4 py-2 text-red-500 border border-red-200 rounded-xl text-sm hover:bg-red-50 transition">Desconectar</button>
                } @else {
                  <button (click)="connect('outlook')" [disabled]="connecting()" class="px-4 py-2 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark disabled:opacity-50 transition">
                    {{ connecting() ? 'Conectando...' : 'Conectar' }}
                  </button>
                }
              </div>
            </div>
          </div>

          <div class="bg-black-kite/5 rounded-2xl p-4 flex items-start gap-3">
            <span class="material-icons text-black-kite mt-0.5">shield</span>
            <div>
              <h4 class="font-medium text-black-kite text-sm">Privacidad y seguridad</h4>
              <p class="text-xs text-gray-500 mt-1">
                Solo leemos correos relacionados con pagos y recibos. Los tokens de acceso están cifrados
                en el servidor. Podés desconectar tus cuentas en cualquier momento.
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Tab: Recibos pendientes -->
      @if (activeTab() === 'receipts') {
        <div class="space-y-3">
          <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
            @for (filter of receiptFilters; track filter.value) {
              <button
                (click)="activeFilter.set(filter.value)"
                class="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition"
                [class]="activeFilter() === filter.value
                  ? 'bg-garnet text-white'
                  : 'bg-warm-gray text-gray-600 hover:bg-gray-200'"
              >
                {{ filter.label }}
              </button>
            }
          </div>

          @if (loading()) {
            <div class="text-center py-12">
              <span class="material-icons text-4xl text-gray-300 animate-spin">autorenew</span>
              <p class="text-gray-400 mt-2">Cargando recibos...</p>
            </div>
          } @else if (filteredReceipts().length === 0) {
            <div class="text-center py-12">
              <span class="material-icons text-5xl text-gray-200">inbox</span>
              <p class="text-gray-400 mt-2">
                {{ activeFilter() === 'pending' ? 'No hay recibos pendientes por revisar' : 'No hay recibos en esta categoría' }}
              </p>
              @if (!gmailAccount()?.is_connected && !outlookAccount()?.is_connected) {
                <button (click)="activeTab.set('accounts')" class="mt-4 px-4 py-2 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark transition">
                  Conectar una cuenta de correo
                </button>
              }
            </div>
          } @else {
            @for (receipt of filteredReceipts(); track receipt.id) {
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      [style.background]="getCategoryColor(receipt.category || 'Otros') + '20'"
                    >
                      <span class="material-icons" [style.color]="getCategoryColor(receipt.category || 'Otros')">
                        {{ getCategoryIcon(receipt.category || 'Otros') }}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <h4 class="font-semibold text-gray-800 truncate">{{ receipt.service_name || 'Desconocido' }}</h4>
                      <p class="text-xs text-gray-400 truncate">{{ receipt.sender }}</p>
                    </div>
                  </div>
                  <div class="text-right shrink-0 ml-3">
                    @if (receipt.amount) {
                      <p class="font-bold text-gray-800">
                        {{ receipt.currency === 'CRC' ? '₡' : '$' }}{{ receipt.amount | number:'1.2-2' }}
                      </p>
                    }
                    <p class="text-xs text-gray-400">{{ receipt.receipt_date | date:'dd/MM/yyyy' }}</p>
                  </div>
                </div>

                <p class="text-xs text-gray-500 bg-warm-gray/50 rounded-lg p-2 truncate">📧 {{ receipt.subject }}</p>

                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400">Confianza IA:</span>
                  <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all"
                      [style.width.%]="(receipt.confidence_score || 0) * 100"
                      [class]="(receipt.confidence_score || 0) >= 0.8 ? 'bg-green-500' : (receipt.confidence_score || 0) >= 0.5 ? 'bg-yellow-500' : 'bg-red-400'"
                    ></div>
                  </div>
                  <span class="text-xs font-medium"
                    [class]="(receipt.confidence_score || 0) >= 0.8 ? 'text-green-600' : (receipt.confidence_score || 0) >= 0.5 ? 'text-yellow-600' : 'text-red-500'"
                  >{{ ((receipt.confidence_score || 0) * 100) | number:'1.0-0' }}%</span>
                </div>

                @if (receipt.status === 'pending') {
                  <div class="flex gap-2 pt-1">
                    <button (click)="handleReceipt(receipt, 'subscription')" class="flex-1 flex items-center justify-center gap-1 py-2 bg-garnet/10 text-garnet rounded-xl text-xs font-medium hover:bg-garnet/20 transition">
                      <span class="material-icons text-base">autorenew</span> Suscripción
                    </button>
                    <button (click)="openTransactionModal(receipt)" class="flex-1 flex items-center justify-center gap-1 py-2 bg-black-kite/5 text-black-kite rounded-xl text-xs font-medium hover:bg-black-kite/10 transition">
                      <span class="material-icons text-base">account_balance_wallet</span> A sobre
                    </button>
                    <button (click)="handleReceipt(receipt, 'ignore')" class="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-400 rounded-xl text-xs hover:bg-gray-100 transition">
                      <span class="material-icons text-base">visibility_off</span>
                    </button>
                  </div>
                } @else {
                  <div class="flex items-center gap-1 text-xs" [class]="receipt.status === 'confirmed' ? 'text-green-500' : 'text-gray-400'">
                    <span class="material-icons text-base">{{ receipt.status === 'confirmed' ? 'check_circle' : 'visibility_off' }}</span>
                    {{ receipt.status === 'confirmed' ? 'Confirmado' : 'Ignorado' }}
                  </div>
                }
              </div>
            }
          }
        </div>
      }

      <!-- Tab: Historial -->
      @if (activeTab() === 'history') {
        <div class="space-y-3">
          @if (syncResults().length === 0) {
            <div class="text-center py-12">
              <span class="material-icons text-5xl text-gray-200">history</span>
              <p class="text-gray-400 mt-2">No hay sincronizaciones registradas aún</p>
            </div>
          } @else {
            @for (result of syncResults(); track $index) {
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                      [style.background]="result.provider === 'gmail' ? '#EA433520' : '#0078D420'"
                    >
                      <span class="material-icons" [style.color]="result.provider === 'gmail' ? '#EA4335' : '#0078D4'">mail</span>
                    </div>
                    <div>
                      <h4 class="font-medium text-gray-800">{{ result.email }}</h4>
                      <p class="text-xs text-gray-400">{{ result.provider === 'gmail' ? 'Gmail' : 'Outlook' }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    @if (result.error) {
                      <span class="text-xs text-red-500 flex items-center gap-1">
                        <span class="material-icons text-sm">error</span> Error
                      </span>
                    } @else {
                      <p class="text-sm font-semibold text-garnet">+{{ result.new_receipts }} nuevos</p>
                      <p class="text-xs text-gray-400">{{ result.total_found }} encontrados</p>
                    }
                  </div>
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- Modal: Asignar a sobre -->
      @if (showEnvelopeModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md max-h-[70vh] overflow-y-auto">
            <div class="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 class="font-semibold text-gray-800">Asignar a un sobre</h3>
              <button (click)="showEnvelopeModal.set(false)" class="material-icons text-gray-400 hover:text-gray-600">close</button>
            </div>
            <div class="p-4 space-y-2">
              @if (envelopes().length === 0) {
                <p class="text-center text-gray-400 py-6">No hay sobres creados aún</p>
              }
              @for (env of envelopes(); track env.id) {
                <button (click)="assignToEnvelope(env.id)" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition text-left">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" [style.background]="env.color + '20'">
                    <span class="material-icons" [style.color]="env.color">{{ env.icon }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-800">{{ env.name }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full" [style.width.%]="env.budget_limit > 0 ? (env.current_spent / env.budget_limit * 100) : 0" [style.background]="env.color"></div>
                      </div>
                      <span class="text-xs text-gray-400">{{ env.current_spent | number:'1.0-0' }}/{{ env.budget_limit | number:'1.0-0' }}</span>
                    </div>
                  </div>
                </button>
              }
              <button (click)="assignToEnvelope(undefined)" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition text-left border-t border-gray-100 mt-2 pt-4">
                <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <span class="material-icons text-gray-400">receipt_long</span>
                </div>
                <p class="font-medium text-gray-600">Registrar sin sobre</p>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class EmailsComponent implements OnInit {
  private sb = inject(SupabaseService);
  private route = inject(ActivatedRoute);

  accounts = signal<EmailAccount[]>([]);
  receipts = signal<EmailReceipt[]>([]);
  envelopes = signal<Envelope[]>([]);
  syncResults = signal<any[]>([]);
  loading = signal(true);
  syncing = signal(false);
  connecting = signal(false);
  activeTab = signal<TabId>('accounts');
  activeFilter = signal('pending');
  toast = signal<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  showEnvelopeModal = signal(false);
  selectedReceipt = signal<EmailReceipt | null>(null);

  gmailAccount = computed(() => this.accounts().find(a => a.provider === 'gmail'));
  outlookAccount = computed(() => this.accounts().find(a => a.provider === 'outlook'));
  pendingCount = computed(() => this.receipts().filter(r => r.status === 'pending').length);
  filteredReceipts = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.receipts();
    return this.receipts().filter(r => r.status === filter);
  });

  tabs = [
    { id: 'accounts' as TabId, label: 'Cuentas', icon: 'link' },
    { id: 'receipts' as TabId, label: 'Recibos', icon: 'receipt_long' },
    { id: 'history' as TabId, label: 'Historial', icon: 'history' },
  ];

  receiptFilters = [
    { label: 'Pendientes', value: 'pending' },
    { label: 'Confirmados', value: 'confirmed' },
    { label: 'Ignorados', value: 'ignored' },
    { label: 'Todos', value: 'all' },
  ];

  async ngOnInit() {
    const params = this.route.snapshot.queryParams;
    if (params['connected']) {
      this.showToast('success', `Cuenta de ${params['connected'] === 'gmail' ? 'Gmail' : 'Outlook'} conectada: ${params['email'] || ''}`);
    }
    if (params['error']) {
      this.showToast('error', params['error']);
    }
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    try {
      const [accounts, receipts, envelopes] = await Promise.all([
        this.sb.getEmailAccounts(),
        this.sb.getEmailReceipts(),
        this.sb.getEnvelopes(),
      ]);
      this.accounts.set(accounts);
      this.receipts.set(receipts);
      this.envelopes.set(envelopes);
      if (accounts.some(a => a.is_connected) && receipts.length > 0) {
        this.activeTab.set('receipts');
      }
    } catch (err) {
      this.showToast('error', 'Error al cargar datos');
    } finally {
      this.loading.set(false);
    }
  }

  async connect(provider: 'gmail' | 'outlook') {
    this.connecting.set(true);
    try {
      await this.sb.connectEmailAccount(provider);
      await this.loadData();
      this.showToast('success', `${provider === 'gmail' ? 'Gmail' : 'Outlook'} conectado correctamente`);
    } catch (err: any) {
      this.showToast('error', err?.message || 'Error al conectar cuenta');
    } finally {
      this.connecting.set(false);
    }
  }

  async disconnect(accountId: string) {
    try {
      await this.sb.disconnectEmailAccount(accountId);
      await this.loadData();
      this.showToast('info', 'Cuenta desconectada');
    } catch (err: any) {
      this.showToast('error', err?.message || 'Error al desconectar');
    }
  }

  async syncProvider(provider: 'gmail' | 'outlook') {
    this.syncing.set(true);
    try {
      const result = provider === 'gmail' ? await this.sb.syncGmail() : await this.sb.syncOutlook();
      this.syncResults.update(prev => [{ provider, email: provider === 'gmail' ? this.gmailAccount()?.email_address : this.outlookAccount()?.email_address, ...result }, ...prev]);
      await this.loadData();
      if (result.new_receipts > 0) {
        this.showToast('success', `${result.new_receipts} recibos nuevos detectados`);
        this.activeTab.set('receipts');
      } else {
        this.showToast('info', 'No se encontraron recibos nuevos');
      }
    } catch (err: any) {
      this.showToast('error', err?.message || 'Error al sincronizar');
      this.syncResults.update(prev => [{ provider, error: String(err) }, ...prev]);
    } finally {
      this.syncing.set(false);
    }
  }

  async syncAll() {
    this.syncing.set(true);
    try {
      const results = await this.sb.syncAllEmails();
      this.syncResults.update(prev => [...results, ...prev]);
      await this.loadData();
      const total = results.reduce((s, r) => s + (r.new_receipts || 0), 0);
      if (total > 0) {
        this.showToast('success', `${total} recibos nuevos detectados en total`);
        this.activeTab.set('receipts');
      } else {
        this.showToast('info', 'No se encontraron recibos nuevos');
      }
    } catch (err: any) {
      this.showToast('error', err?.message || 'Error al sincronizar');
    } finally {
      this.syncing.set(false);
    }
  }

  async handleReceipt(receipt: EmailReceipt, action: ReceiptAction) {
    try {
      if (action === 'subscription') {
        await this.sb.receiptToSubscription(receipt.id);
        this.showToast('success', `"${receipt.service_name}" agregado a suscripciones`);
      } else if (action === 'ignore') {
        await this.sb.updateReceiptStatus(receipt.id, 'ignored');
        this.showToast('info', 'Recibo ignorado');
      }
      await this.loadData();
    } catch (err: any) {
      this.showToast('error', err?.message || 'Error al procesar recibo');
    }
  }

  openTransactionModal(receipt: EmailReceipt) {
    this.selectedReceipt.set(receipt);
    this.showEnvelopeModal.set(true);
  }

  async assignToEnvelope(envelopeId?: string) {
    const receipt = this.selectedReceipt();
    if (!receipt) return;
    try {
      await this.sb.receiptToTransaction(receipt.id, envelopeId);
      this.showEnvelopeModal.set(false);
      this.selectedReceipt.set(null);
      this.showToast('success', 'Gasto registrado correctamente');
      await this.loadData();
    } catch (err: any) {
      this.showToast('error', err?.message || 'Error al registrar gasto');
    }
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'IA': '#8B5CF6', 'Entretenimiento': '#EC4899', 'Almacenamiento': '#3B82F6',
      'Productividad': '#10B981', 'Hogar': '#F59E0B', 'Educacion': '#6366F1',
      'Salud': '#EF4444', 'Transporte': '#14B8A6', 'Alimentacion': '#F97316', 'Otros': '#6B7280',
    };
    return colors[category] || '#6B7280';
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'IA': 'smart_toy', 'Entretenimiento': 'movie', 'Almacenamiento': 'cloud',
      'Productividad': 'work', 'Hogar': 'home', 'Educacion': 'school',
      'Salud': 'favorite', 'Transporte': 'directions_car', 'Alimentacion': 'restaurant', 'Otros': 'receipt_long',
    };
    return icons[category] || 'receipt_long';
  }

  private showToast(type: 'success' | 'error' | 'info', message: string) {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 5000);
  }
}
