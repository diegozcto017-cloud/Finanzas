// src/app/pages/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-cream flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-black-kite rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span class="material-icons text-white text-3xl">account_balance_wallet</span>
          </div>
          <h1 class="text-2xl font-bold text-black-kite">Finanzas Personales</h1>
          <p class="text-gray-500 mt-1">Inicia sesión para continuar</p>
        </div>

        <div class="bg-white rounded-2xl shadow-lg p-6 space-y-5">
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
                class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none transition"
                (keydown.enter)="login()"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div class="relative">
              <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">lock</span>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                placeholder="••••••••"
                class="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-garnet focus:border-transparent outline-none transition"
                (keydown.enter)="login()"
              />
              <button type="button" (click)="showPassword.set(!showPassword())" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <span class="material-icons text-xl">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>

          <div class="text-right">
            <a routerLink="/forgot-password" class="text-sm text-garnet hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            (click)="login()"
            [disabled]="loading()"
            class="w-full py-3 bg-garnet text-white rounded-xl font-semibold hover:bg-garnet-dark disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            @if (loading()) {
              <span class="material-icons animate-spin text-xl">autorenew</span>
              Iniciando sesión...
            } @else {
              <span class="material-icons text-xl">login</span>
              Iniciar sesión
            }
          </button>

          <div class="flex items-center gap-3">
            <div class="flex-1 h-px bg-gray-200"></div>
            <span class="text-xs text-gray-400 uppercase">¿No tienes cuenta?</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>

          <a
            routerLink="/register"
            class="w-full py-3 border-2 border-black-kite text-black-kite rounded-xl font-semibold hover:bg-black-kite/5 transition flex items-center justify-center gap-2"
          >
            <span class="material-icons text-xl">person_add</span>
            Crear cuenta
          </a>
        </div>

        <p class="text-center text-xs text-gray-400 mt-6">
          Tus datos están protegidos con cifrado de extremo a extremo
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private sb = inject(SupabaseService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  errorMsg = signal('');
  showPassword = signal(false);

  async login() {
    if (!this.email || !this.password) {
      this.errorMsg.set('Ingresa tu correo y contraseña');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    try {
      await this.sb.signIn(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Invalid login credentials')) {
        this.errorMsg.set('Correo o contraseña incorrectos');
      } else if (msg.includes('Email not confirmed')) {
        this.errorMsg.set('Confirma tu correo electrónico antes de iniciar sesión');
      } else {
        this.errorMsg.set(msg);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
