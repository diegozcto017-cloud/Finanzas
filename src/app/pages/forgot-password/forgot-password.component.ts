// src/app/pages/forgot-password/forgot-password.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-mist-gray flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-deep-teal rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span class="material-icons text-white text-3xl">lock_reset</span>
          </div>
          <h1 class="text-2xl font-bold text-deep-teal">Recuperar contraseña</h1>
          <p class="text-gray-500 mt-1">Te enviaremos un enlace para restablecerla</p>
        </div>

        <div class="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          @if (sent()) {
            <div class="text-center py-4">
              <span class="material-icons text-green-500 text-5xl mb-3">mark_email_read</span>
              <h2 class="text-lg font-semibold text-gray-800 mb-2">Correo enviado</h2>
              <p class="text-gray-500 text-sm mb-4">
                Revisa tu bandeja de entrada en <strong>{{ email }}</strong> y haz clic en el enlace para restablecer tu contraseña.
              </p>
              <a routerLink="/login" class="text-deep-teal font-medium hover:underline">Volver al inicio de sesión</a>
            </div>
          } @else {
            @if (errorMsg()) {
              <div class="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <span class="material-icons text-red-500 text-sm mt-0.5">error</span>
                <p class="text-red-600 text-sm">{{ errorMsg() }}</p>
              </div>
            }

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">email</span>
                <input
                  type="email"
                  [(ngModel)]="email"
                  placeholder="tu@correo.com"
                  class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deep-teal focus:border-transparent outline-none transition"
                  (keydown.enter)="sendReset()"
                />
              </div>
            </div>

            <button
              (click)="sendReset()"
              [disabled]="loading()"
              class="w-full py-3 bg-deep-teal text-white rounded-xl font-semibold hover:bg-deep-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              @if (loading()) {
                <span class="material-icons animate-spin text-xl">autorenew</span>
                Enviando...
              } @else {
                <span class="material-icons text-xl">send</span>
                Enviar enlace
              }
            </button>

            <div class="text-center">
              <a routerLink="/login" class="text-sm text-deep-teal font-medium hover:underline">Volver al inicio de sesión</a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private sb = inject(SupabaseService);

  email = '';
  loading = signal(false);
  errorMsg = signal('');
  sent = signal(false);

  async sendReset() {
    if (!this.email) {
      this.errorMsg.set('Ingresa tu correo electrónico');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    try {
      await this.sb.resetPassword(this.email);
      this.sent.set(true);
    } catch (err: any) {
      this.errorMsg.set(err?.message || 'Error al enviar el correo');
    } finally {
      this.loading.set(false);
    }
  }
}
