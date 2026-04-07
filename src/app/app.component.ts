// src/app/app.component.ts
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SupabaseService } from './core/services/supabase.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (sb.loading()) {
      <div class="min-h-screen bg-cream flex items-center justify-center">
        <div class="text-center">
          <div class="w-16 h-16 bg-black-kite rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span class="material-icons text-white text-3xl">account_balance_wallet</span>
          </div>
          <p class="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    } @else if (!sb.isAuthenticated()) {
      <router-outlet />
    } @else {
      <div class="min-h-screen bg-cream flex">
        <!-- Sidebar desktop -->
        <aside class="hidden md:flex flex-col w-64 bg-black-kite border-r border-kite-warm fixed h-full">
          <div class="flex items-center gap-3 px-5 mb-8 mt-6">
            <div class="w-10 h-10 bg-garnet rounded-xl flex items-center justify-center">
              <span class="material-icons text-white text-xl">account_balance_wallet</span>
            </div>
            <div>
              <h1 class="font-bold text-white text-sm">Finanzas</h1>
              <p class="text-[10px] text-white/40">Personales</p>
            </div>
          </div>

          <nav class="space-y-1 flex-1 px-3">
            @for (item of navItems; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-garnet text-white"
                [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-kite-warm hover:text-white/80 transition"
              >
                <span class="material-icons text-xl">{{ item.icon }}</span>
                {{ item.label }}
              </a>
            }
          </nav>

          <div class="border-t border-kite-warm pt-4 mt-4 px-3 pb-4">
            <a
              routerLink="/perfil"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-kite-warm transition"
            >
              <div class="w-9 h-9 bg-garnet/30 rounded-lg flex items-center justify-center">
                <span class="material-icons text-garnet-light text-lg">person</span>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-white truncate">{{ displayName() }}</p>
                <p class="text-[10px] text-white/40 truncate">{{ userEmail() }}</p>
              </div>
            </a>
            <button
              (click)="logout()"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-300/70 hover:bg-red-900/20 hover:text-red-300 transition w-full mt-1"
            >
              <span class="material-icons text-xl">logout</span>
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main class="flex-1 md:ml-64">
          <router-outlet />
        </main>

        <!-- Bottom nav mobile -->
        <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-black-kite border-t border-kite-warm px-2 pb-safe z-50">
          <div class="flex items-center justify-around">
            @for (item of mobileNav; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="text-garnet-light"
                [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                class="flex flex-col items-center gap-0.5 py-2 px-3 text-white/40 transition min-w-0"
              >
                <span class="material-icons text-[22px]">{{ item.icon }}</span>
                <span class="text-[10px] font-medium">{{ item.label }}</span>
              </a>
            }
          </div>
        </nav>
      </div>
    }
  `,
  styles: [`
    .pb-safe { padding-bottom: env(safe-area-inset-bottom, 8px); }
  `],
})
export class AppComponent {
  sb = inject(SupabaseService);
  private router = inject(Router);

  displayName = computed(() => this.sb.profile()?.display_name || 'Usuario');
  userEmail = computed(() => this.sb.currentUser()?.email || '');

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Sobres', icon: 'account_balance_wallet', route: '/sobres' },
    { label: 'Suscripciones', icon: 'autorenew', route: '/suscripciones' },
    { label: 'Gastos IA', icon: 'smart_toy', route: '/gastos-detectados' },
    { label: 'Proyecciones', icon: 'trending_up', route: '/proyecciones' },
    { label: 'Compras', icon: 'shopping_cart', route: '/compras' },
    { label: 'Calendario', icon: 'calendar_month', route: '/calendario' },
    { label: 'Correos', icon: 'mail', route: '/correos' },
  ];

  mobileNav: NavItem[] = [
    { label: 'Inicio', icon: 'dashboard', route: '/dashboard' },
    { label: 'Sobres', icon: 'account_balance_wallet', route: '/sobres' },
    { label: 'Suscripc.', icon: 'autorenew', route: '/suscripciones' },
    { label: 'Correos', icon: 'mail', route: '/correos' },
    { label: 'Más', icon: 'menu', route: '/perfil' },
  ];

  async logout() {
    await this.sb.signOut();
    this.router.navigate(['/login']);
  }
}
