// src/app/pages/reset-password/reset-password.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-mist-gray flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-deep-teal rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span class="material-icons text-white text-3xl">password</span>
          </div>
          <h1 class="text-2xl font-bold text-deep-teal">Nueva contraseña</h1>
          <p class="text-gray-500 mt-1">Ingresa tu nueva contraseña</p>
        </div>

        <div class="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          @if (success()) {
            <div class="text-center py-4">
              <span class="material-icons text-green-500 text-5xl mb-3">check_circle</span>
              <h2 class="text-lg font-semibold text-gray-800 mb-2">Contraseña actualizada</h2>
              <p class="text-gray-500 text-sm mb-4">Tu contraseña se cambió correctamente.</p>
              <button
                (click)="goToDashboard()"
                class="px-6 py-3 bg-deep-teal text-white rounded-xl font-semibold hover:bg-deep-teal/90 transition"
              >
                Ir al Dashboard
              </button>
            </div>
          } @else {
            @if (errorMsg()) {
              <div class="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <span class="material-icons text-red-500 text-sm mt-0.5">error</span>
                <p class="text-red-600 text-sm">{{ errorMsg() }}</p>
              </div>
            }

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">lock</span>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="newPassword"
                  placeholder="Mínimo 6 caracteres"
                  class="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deep-teal focus:border-transparent outline-none transition"
                />
                <button type="button" (click)="showPassword.set(!showPassword())" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <span class="material-icons text-xl">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">lock_outline</span>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="confirmPassword"
                  placeholder="Repite tu nueva contraseña"
                  class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deep-teal focus:border-transparent outline-none transition"
                  (keydown.enter)="updatePassword()"
                />
              </div>
            </div>

            <button
              (click)="updatePassword()"
              [disabled]="loading()"
              class="w-full py-3 bg-deep-teal text-white rounded-xl font-semibold hover:bg-deep-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              @if (loading()) {
                <span class="material-icons animate-spin text-xl">autorenew</span>
                Actualizando...
              } @else {
                <span class="material-icons text-xl">save</span>
                Actualizar contraseña
              }
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  private sb = inject(SupabaseService);
  private router = inject(Router);

  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  errorMsg = signal('');
  success = signal(false);
  showPassword = signal(false);

  async updatePassword() {
    this.errorMsg.set('');

    if (!this.newPassword) {
      this.errorMsg.set('Ingresa tu nueva contraseña');
      return;
    }
    if (this.newPassword.length < 6) {
      this.errorMsg.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg.set('Las contraseñas no coinciden');
      return;
    }

    this.loading.set(true);

    try {
      await this.sb.updatePassword(this.newPassword);
      this.success.set(true);
    } catch (err: any) {
      this.errorMsg.set(err?.message || 'Error al actualizar la contraseña');
    } finally {
      this.loading.set(false);
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
