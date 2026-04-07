// src/app/pages/profile/profile.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { MigrationService } from '../../core/services/migration.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <h1 class="text-2xl font-bold text-black-kite mb-6">Perfil</h1>

      <!-- User card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div class="flex items-center gap-4 mb-5">
          <div class="w-16 h-16 bg-garnet/10 rounded-2xl flex items-center justify-center">
            <span class="material-icons text-garnet text-3xl">person</span>
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-800">{{ name }}</h2>
            <p class="text-sm text-gray-400">{{ email() }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input type="text" [(ngModel)]="name" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Salario quincenal</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₡</span>
              <input type="number" [(ngModel)]="salary" placeholder="250000" class="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none" />
            </div>
            <p class="text-[10px] text-gray-400 mt-1">Base: ₡500,000/mes. Se usa para calcular la lista de pagos por quincena.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Moneda principal</label>
            <div class="grid grid-cols-2 gap-3">
              <button (click)="currency = 'CRC'" class="py-3 rounded-xl font-medium transition text-sm"
                [class]="currency === 'CRC' ? 'border-2 border-garnet bg-garnet/5 text-garnet' : 'border-2 border-gray-200 text-gray-500'">
                🇨🇷 Colones (CRC)
              </button>
              <button (click)="currency = 'USD'" class="py-3 rounded-xl font-medium transition text-sm"
                [class]="currency === 'USD' ? 'border-2 border-garnet bg-garnet/5 text-garnet' : 'border-2 border-gray-200 text-gray-500'">
                🇺🇸 Dólares (USD)
              </button>
            </div>
          </div>
          <button (click)="saveProfile()" [disabled]="saving()" class="w-full py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark disabled:opacity-50 transition">
            {{ saving() ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>

      <!-- Navegación rápida (extra en mobile) -->
      <div class="md:hidden space-y-2 mb-6">
        @for (link of mobileLinks; track link.route) {
          <a [routerLink]="link.route" class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="material-icons text-gray-500">{{ link.icon }}</span>
              <span class="text-sm font-medium text-gray-700">{{ link.label }}</span>
            </div>
            <span class="material-icons text-gray-300">chevron_right</span>
          </a>
        }
      </div>

      <!-- Migración de localStorage -->
      @if (hasMigration()) {
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div class="flex items-start gap-3">
            <span class="material-icons text-amber-500 mt-0.5">info</span>
            <div class="flex-1">
              <h3 class="font-semibold text-amber-800 text-sm">Datos locales detectados</h3>
              <p class="text-xs text-amber-700 mt-1">Encontramos datos en tu navegador de la versión anterior. ¿Querés migrarlos a tu cuenta?</p>
              <div class="flex gap-2 mt-3">
                <button (click)="migrate()" [disabled]="migrating()" class="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition">
                  {{ migrating() ? 'Migrando...' : 'Migrar datos' }}
                </button>
                <button (click)="dismissMigration()" class="px-4 py-2 text-amber-600 text-sm hover:underline">Descartar</button>
              </div>
              @if (migrationResult()) {
                <div class="mt-3 bg-white rounded-lg p-3">
                  <p class="text-xs text-green-600 font-medium">✓ Migración completada:</p>
                  @for (entry of migrationEntries(); track entry[0]) {
                    <p class="text-xs text-gray-500">{{ entry[0] }}: {{ entry[1] }} registros</p>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Cambiar contraseña -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <h3 class="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
          <span class="material-icons text-lg text-gray-400">lock</span> Cambiar contraseña
        </h3>
        <input type="password" [(ngModel)]="newPassword" placeholder="Nueva contraseña" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none mb-3" />
        <button (click)="changePassword()" [disabled]="changingPw()" class="w-full py-3 border-2 border-garnet text-garnet rounded-xl font-semibold hover:bg-garnet/5 disabled:opacity-50 transition">
          {{ changingPw() ? 'Actualizando...' : 'Actualizar contraseña' }}
        </button>
      </div>

      <!-- Cerrar sesión -->
      <button (click)="logout()" class="w-full py-3 bg-red-50 text-red-500 rounded-2xl font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2">
        <span class="material-icons">logout</span> Cerrar sesión
      </button>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private sb = inject(SupabaseService);
  private migration = inject(MigrationService);
  private router = inject(Router);

  name = '';
  currency: 'CRC' | 'USD' = 'CRC';
  salary = 250000;
  newPassword = '';
  saving = signal(false);
  changingPw = signal(false);
  migrating = signal(false);
  hasMigration = signal(false);
  migrationResult = signal<Record<string, number> | null>(null);
  migrationEntries = computed(() => Object.entries(this.migrationResult() || {}));

  email = computed(() => this.sb.currentUser()?.email || '');

  mobileLinks = [
    { label: 'Proyecciones', icon: 'trending_up', route: '/proyecciones' },
    { label: 'Compras', icon: 'shopping_cart', route: '/compras' },
    { label: 'Préstamos', icon: 'handshake', route: '/prestamos' },
    { label: 'Calendario', icon: 'calendar_month', route: '/calendario' },
    { label: 'Correos', icon: 'mail', route: '/correos' },
  ];

  ngOnInit() {
    const profile = this.sb.profile();
    this.name = profile?.display_name || '';
    this.currency = profile?.currency_default || 'CRC';
    this.salary = (profile as any)?.biweekly_salary || 250000;
    this.hasMigration.set(this.migration.hasPendingMigration());
  }

  async saveProfile() {
    this.saving.set(true);
    try {
      await this.sb.updateProfile({ display_name: this.name, currency_default: this.currency } as any);
      // Salario va en profiles directamente
      await this.sb.client.from('profiles').update({ biweekly_salary: this.salary }).eq('id', this.sb.currentUser()!.id);
    }
    catch {} finally { this.saving.set(false); }
  }

  async changePassword() {
    if (!this.newPassword || this.newPassword.length < 6) return;
    this.changingPw.set(true);
    try { await this.sb.updatePassword(this.newPassword); this.newPassword = ''; alert('Contraseña actualizada'); }
    catch (e: any) { alert(e?.message || 'Error'); }
    finally { this.changingPw.set(false); }
  }

  async migrate() {
    this.migrating.set(true);
    try {
      const result = await this.migration.migrateAll();
      this.migrationResult.set(result);
      this.migration.clearLocalStorage();
      this.hasMigration.set(false);
    } catch (e: any) { alert(e?.message || 'Error en migración'); }
    finally { this.migrating.set(false); }
  }

  dismissMigration() { this.migration.clearLocalStorage(); this.hasMigration.set(false); }

  async logout() { await this.sb.signOut(); this.router.navigate(['/login']); }
}
