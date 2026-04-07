// src/app/pages/register/register.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-mist-gray flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-deep-teal rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span class="material-icons text-white text-3xl">person_add</span>
          </div>
          <h1 class="text-2xl font-bold text-deep-teal">Crear cuenta</h1>
          <p class="text-gray-500 mt-1">Registrate para empezar a controlar tus finanzas</p>
        </div>

        <div class="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          @if (successMsg()) {
            <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <span class="material-icons text-green-500 text-3xl mb-2">mark_email_read</span>
              <p class="text-green-700 font-medium">{{ successMsg() }}</p>
              <a routerLink="/login" class="text-deep-teal underline text-sm mt-2 inline-block">Ir a iniciar sesión</a>
            </div>
          } @else {
            @if (errorMsg()) {
              <div class="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <span class="material-icons text-red-500 text-sm mt-0.5">error</span>
                <p class="text-red-600 text-sm">{{ errorMsg() }}</p>
              </div>
            }

            <!-- Nombre -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">badge</span>
                <input
                  type="text"
                  [(ngModel)]="displayName"
                  placeholder="Tu nombre"
                  class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deep-teal focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">email</span>
                <input
                  type="email"
                  [(ngModel)]="email"
                  placeholder="tu@correo.com"
                  class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deep-teal focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <!-- Contraseña -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">lock</span>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  placeholder="Mínimo 6 caracteres"
                  class="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deep-teal focus:border-transparent outline-none transition"
                />
                <button type="button" (click)="showPassword.set(!showPassword())" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <span class="material-icons text-xl">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <!-- Confirmar contraseña -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">lock_outline</span>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="confirmPassword"
                  placeholder="Repite tu contraseña"
                  class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deep-teal focus:border-transparent outline-none transition"
                  (keydown.enter)="register()"
                />
              </div>
            </div>

            <!-- Moneda por defecto -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Moneda principal</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  (click)="currency = 'CRC'"
                  [class]="currency === 'CRC'
                    ? 'border-2 border-deep-teal bg-deep-teal/5 text-deep-teal'
                    : 'border-2 border-gray-200 text-gray-500 hover:border-gray-300'"
                  class="py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
                >
                  🇨🇷 Colones (CRC)
                </button>
                <button
                  (click)="currency = 'USD'"
                  [class]="currency === 'USD'
                    ? 'border-2 border-deep-teal bg-deep-teal/5 text-deep-teal'
                    : 'border-2 border-gray-200 text-gray-500 hover:border-gray-300'"
                  class="py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
                >
                  🇺🇸 Dólares (USD)
                </button>
              </div>
            </div>

            <button
              (click)="register()"
              [disabled]="loading()"
              class="w-full py-3 bg-deep-teal text-white rounded-xl font-semibold hover:bg-deep-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              @if (loading()) {
                <span class="material-icons animate-spin text-xl">autorenew</span>
                Creando cuenta...
              } @else {
                <span class="material-icons text-xl">how_to_reg</span>
                Crear cuenta
              }
            </button>

            <div class="text-center">
              <span class="text-sm text-gray-500">¿Ya tienes cuenta? </span>
              <a routerLink="/login" class="text-sm text-deep-teal font-medium hover:underline">Iniciar sesión</a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private sb = inject(SupabaseService);
  private router = inject(Router);

  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  currency: 'CRC' | 'USD' = 'CRC';
  loading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');
  showPassword = signal(false);

  async register() {
    this.errorMsg.set('');

    if (!this.email || !this.password || !this.displayName) {
      this.errorMsg.set('Completa todos los campos');
      return;
    }
    if (this.password.length < 6) {
      this.errorMsg.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMsg.set('Las contraseñas no coinciden');
      return;
    }

    this.loading.set(true);

    try {
      await this.sb.signUp(this.email, this.password, this.displayName);
      this.successMsg.set('¡Cuenta creada! Revisa tu correo electrónico para confirmar tu cuenta.');
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('already registered')) {
        this.errorMsg.set('Este correo ya está registrado');
      } else {
        this.errorMsg.set(msg);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
