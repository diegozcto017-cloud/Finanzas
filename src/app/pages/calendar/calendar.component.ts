// src/app/pages/calendar/calendar.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, PaymentCalendarEntry } from '../../core/services/supabase.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-black-kite">Calendario de Pagos</h1>
        <div class="flex gap-2">
          <button (click)="showAiModal.set(true)" class="flex items-center gap-1.5 px-3 py-2 bg-black-kite text-white rounded-xl text-sm font-medium hover:bg-kite-warm transition">
            <span class="material-icons text-lg">smart_toy</span> IA
          </button>
          <button (click)="showManualModal.set(true)" class="flex items-center gap-1.5 px-3 py-2 bg-garnet text-white rounded-xl text-sm font-medium hover:bg-garnet-dark transition">
            <span class="material-icons text-lg">add</span> Manual
          </button>
        </div>
      </div>

      <!-- Selector de año -->
      <div class="flex items-center justify-center gap-4 mb-6">
        <button (click)="changeYear(-1)" class="p-2 rounded-xl hover:bg-warm-gray transition">
          <span class="material-icons text-gray-500">chevron_left</span>
        </button>
        <span class="text-lg font-bold text-black-kite">{{ selectedYear() }}</span>
        <button (click)="changeYear(1)" class="p-2 rounded-xl hover:bg-warm-gray transition">
          <span class="material-icons text-gray-500">chevron_right</span>
        </button>
      </div>

      <!-- KPIs -->
      @if (yearEntries().length > 0) {
        <div class="grid grid-cols-3 gap-3 mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p class="text-xs text-gray-400">Total anual</p>
            <p class="text-xl font-bold text-black-kite">₡{{ totalAnnual() | number:'1.0-0' }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p class="text-xs text-gray-400">Confirmados</p>
            <p class="text-xl font-bold text-green-600">{{ confirmedCount() }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p class="text-xs text-gray-400">Pendientes</p>
            <p class="text-xl font-bold text-garnet">{{ pendingCount() }}</p>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="text-center py-16"><span class="material-icons text-4xl text-gray-300 animate-spin">autorenew</span></div>
      } @else if (yearEntries().length === 0) {
        <div class="text-center py-16">
          <span class="material-icons text-6xl text-gray-200">calendar_month</span>
          <p class="text-gray-400 mt-3">Sin pagos registrados para {{ selectedYear() }}</p>
          <p class="text-gray-300 text-sm mt-1">Usá la generación manual o subí una imagen con IA</p>
        </div>
      } @else {
        <!-- Tabla de pagos por mes -->
        <div class="space-y-3">
          @for (month of months; track month.num) {
            @if (getMonthEntries(month.num).length > 0) {
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-4 py-3 bg-warm-gray/30 border-b border-gray-100">
                  <h3 class="font-semibold text-black-kite text-sm">{{ month.name }}</h3>
                </div>
                <div class="divide-y divide-gray-50">
                  @for (entry of getMonthEntries(month.num); track entry.id) {
                    <div class="flex items-center justify-between px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-lg flex items-center justify-center"
                          [class]="entry.is_confirmed ? 'bg-green-50' : 'bg-warm-gray'">
                          <span class="material-icons text-lg" [class]="entry.is_confirmed ? 'text-green-500' : 'text-gray-400'">
                            {{ entry.is_confirmed ? 'check_circle' : 'schedule' }}
                          </span>
                        </div>
                        <div>
                          <p class="text-sm font-medium text-gray-800">{{ getTypeLabel(entry.payment_type) }}</p>
                          <p class="text-xs text-gray-400">{{ entry.payment_date | date:'dd/MM/yyyy' }}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold" [class]="entry.is_confirmed ? 'text-green-600' : 'text-gray-800'">
                          ₡{{ entry.amount | number:'1.0-0' }}
                        </span>
                        <button (click)="editEntry(entry)" class="p-1.5 text-gray-300 hover:text-garnet rounded-lg hover:bg-gray-50 transition">
                          <span class="material-icons text-sm">edit</span>
                        </button>
                        @if (!entry.is_confirmed) {
                          <button (click)="confirmEntry(entry)" class="p-1.5 text-gray-300 hover:text-green-500 rounded-lg hover:bg-green-50 transition" title="Confirmar">
                            <span class="material-icons text-sm">check</span>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- Modal: Generación manual -->
      @if (showManualModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">Generar calendario</h3>
              <button (click)="showManualModal.set(false)" class="material-icons text-gray-400">close</button>
            </div>
            <p class="text-xs text-gray-500">Genera fechas de Q1 (día 15) y Q2 (fin de mes) para todo el año {{ selectedYear() }}.</p>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Salario quincenal base</label>
              <input type="number" [(ngModel)]="manualSalary" placeholder="Ej: 500000" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet outline-none" />
            </div>
            <button (click)="generateManual()" [disabled]="generating()" class="w-full py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark disabled:opacity-50 transition">
              {{ generating() ? 'Generando...' : 'Generar 24 quincenas' }}
            </button>
          </div>
        </div>
      }

      <!-- Modal: IA (subir imagen) -->
      @if (showAiModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <span class="material-icons text-garnet">smart_toy</span> Extraer con IA
              </h3>
              <button (click)="showAiModal.set(false)" class="material-icons text-gray-400">close</button>
            </div>
            <p class="text-xs text-gray-500">Subí una foto o captura del calendario de pagos de tu empresa. Gemini IA extraerá las fechas y montos automáticamente.</p>
            <div class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-garnet transition"
              (click)="fileInput.click()">
              @if (selectedImage()) {
                <img [src]="selectedImage()" class="max-h-40 mx-auto rounded-lg mb-2" />
                <p class="text-xs text-gray-500">Imagen cargada — click para cambiar</p>
              } @else {
                <span class="material-icons text-4xl text-gray-300">add_photo_alternate</span>
                <p class="text-sm text-gray-400 mt-2">Click para subir imagen</p>
              }
              <input #fileInput type="file" accept="image/*" class="hidden" (change)="onImageSelect($event)" />
            </div>
            @if (aiError()) {
              <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">{{ aiError() }}</div>
            }
            <button (click)="extractWithAI()" [disabled]="!selectedImageFile() || aiProcessing()" class="w-full py-3 bg-black-kite text-white rounded-xl font-semibold hover:bg-kite-warm disabled:opacity-50 transition flex items-center justify-center gap-2">
              @if (aiProcessing()) {
                <span class="material-icons animate-spin text-lg">autorenew</span> Procesando con Gemini...
              } @else {
                <span class="material-icons text-lg">smart_toy</span> Extraer fechas
              }
            </button>
          </div>
        </div>
      }

      <!-- Modal: Editar entrada -->
      @if (editingEntry()) {
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">Editar pago</h3>
              <button (click)="editingEntry.set(null)" class="material-icons text-gray-400">close</button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Monto</label>
                <input type="number" [(ngModel)]="editAmount" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet outline-none" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Fecha</label>
                <input type="date" [(ngModel)]="editDate" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet outline-none" />
              </div>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" [(ngModel)]="editCascade" class="w-4 h-4 accent-garnet rounded" />
              <span class="text-sm text-gray-600">Aplicar monto a todos los {{ editingEntry()!.payment_type }} futuros</span>
            </label>
            <button (click)="saveEntry()" class="w-full py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark transition">Guardar</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class CalendarComponent implements OnInit {
  private sb = inject(SupabaseService);

  entries = signal<PaymentCalendarEntry[]>([]);
  loading = signal(true);
  generating = signal(false);
  aiProcessing = signal(false);
  selectedYear = signal(new Date().getFullYear());
  showManualModal = signal(false);
  showAiModal = signal(false);
  editingEntry = signal<PaymentCalendarEntry | null>(null);
  selectedImage = signal<string | null>(null);
  selectedImageFile = signal<File | null>(null);
  aiError = signal('');

  manualSalary = 0;
  editAmount = 0;
  editDate = '';
  editCascade = false;

  yearEntries = computed(() => this.entries().filter(e => new Date(e.payment_date).getFullYear() === this.selectedYear()));
  totalAnnual = computed(() => this.yearEntries().reduce((s, e) => s + Number(e.amount), 0));
  confirmedCount = computed(() => this.yearEntries().filter(e => e.is_confirmed).length);
  pendingCount = computed(() => this.yearEntries().filter(e => !e.is_confirmed).length);

  months = Array.from({ length: 12 }, (_, i) => ({
    num: i + 1,
    name: new Date(2026, i).toLocaleDateString('es-CR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase()),
  }));

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try { this.entries.set(await this.sb.getPaymentCalendar(this.selectedYear())); }
    catch {} finally { this.loading.set(false); }
  }

  changeYear(delta: number) {
    this.selectedYear.update(y => y + delta);
    this.load();
  }

  getMonthEntries(month: number): PaymentCalendarEntry[] {
    return this.yearEntries().filter(e => new Date(e.payment_date).getMonth() + 1 === month);
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = { Q1: 'Primera quincena', Q2: 'Segunda quincena', aguinaldo: 'Aguinaldo', salario_escolar: 'Salario escolar', bonus: 'Bono' };
    return labels[type] || type;
  }

  async generateManual() {
    if (!this.manualSalary) return;
    this.generating.set(true);
    try {
      const year = this.selectedYear();
      const entries: any[] = [];
      for (let m = 0; m < 12; m++) {
        entries.push({
          payment_type: 'Q1', payment_date: `${year}-${String(m + 1).padStart(2, '0')}-15`,
          amount: this.manualSalary, currency: 'CRC', is_confirmed: false, notes: null,
        });
        const lastDay = new Date(year, m + 1, 0).getDate();
        entries.push({
          payment_type: 'Q2', payment_date: `${year}-${String(m + 1).padStart(2, '0')}-${lastDay}`,
          amount: this.manualSalary, currency: 'CRC', is_confirmed: false, notes: null,
        });
      }
      await this.sb.bulkCreatePaymentEntries(entries);
      this.showManualModal.set(false);
      await this.load();
    } catch {} finally { this.generating.set(false); }
  }

  onImageSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedImageFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.selectedImage.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  async extractWithAI() {
    const file = this.selectedImageFile();
    if (!file) return;
    this.aiProcessing.set(true);
    this.aiError.set('');

    try {
      const base64 = await this.fileToBase64(file);
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.getGeminiKey()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType: file.type, data: base64 } },
                { text: `Analiza esta imagen de un calendario de pagos. Extrae todas las fechas de pago con sus montos.
Responde SOLO con un JSON valido (sin markdown) con esta estructura:
[{"payment_type":"Q1","payment_date":"YYYY-MM-DD","amount":numero},{"payment_type":"Q2","payment_date":"YYYY-MM-DD","amount":numero}]
Donde payment_type puede ser Q1, Q2, aguinaldo, salario_escolar o bonus.` },
              ],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4000 },
          }),
        }
      );

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const clean = text.replace(/```json\n?|```\n?/g, '').trim();
      const parsed = JSON.parse(clean);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const entries = parsed.map((e: any) => ({
          payment_type: e.payment_type || 'Q1',
          payment_date: e.payment_date,
          amount: e.amount || 0,
          currency: 'CRC' as const,
          is_confirmed: false,
          notes: null,
        }));
        await this.sb.bulkCreatePaymentEntries(entries);
        this.showAiModal.set(false);
        this.selectedImage.set(null);
        this.selectedImageFile.set(null);
        await this.load();
      } else {
        this.aiError.set('No se pudieron extraer fechas de la imagen');
      }
    } catch (e: any) {
      this.aiError.set(e?.message || 'Error al procesar con IA');
    } finally { this.aiProcessing.set(false); }
  }

  editEntry(entry: PaymentCalendarEntry) {
    this.editingEntry.set(entry);
    this.editAmount = Number(entry.amount);
    this.editDate = entry.payment_date;
    this.editCascade = false;
  }

  async confirmEntry(entry: PaymentCalendarEntry) {
    await this.sb.updatePaymentEntry(entry.id, { is_confirmed: true });
    await this.load();
  }

  async saveEntry() {
    const entry = this.editingEntry();
    if (!entry) return;

    await this.sb.updatePaymentEntry(entry.id, { amount: this.editAmount, payment_date: this.editDate });

    // Cascada: actualizar todos los del mismo tipo hacia adelante
    if (this.editCascade) {
      const futureEntries = this.yearEntries()
        .filter(e => e.payment_type === entry.payment_type && e.payment_date > entry.payment_date && !e.is_confirmed);
      for (const fe of futureEntries) {
        await this.sb.updatePaymentEntry(fe.id, { amount: this.editAmount });
      }
    }

    this.editingEntry.set(null);
    await this.load();
  }

  private getGeminiKey(): string {
    // En producción esto debería ir por Edge Function
    // Por ahora usa la key del environment
    return (window as any).__GEMINI_KEY__ || '';
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
