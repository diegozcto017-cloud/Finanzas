// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Rutas públicas
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [publicGuard],
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [publicGuard],
    loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },

  // Rutas protegidas
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'sobres',
        loadComponent: () => import('./pages/envelopes/envelopes.component').then(m => m.EnvelopesComponent),
      },
      {
        path: 'suscripciones',
        loadComponent: () => import('./pages/subscriptions/subscriptions.component').then(m => m.SubscriptionsComponent),
      },
      {
        path: 'proyecciones',
        loadComponent: () => import('./pages/projections/projections.component').then(m => m.ProjectionsComponent),
      },
      {
        path: 'compras',
        loadComponent: () => import('./pages/purchases/purchases.component').then(m => m.PurchasesComponent),
      },
      {
        path: 'gastos-detectados',
        loadComponent: () => import('./pages/expense-averages/expense-averages.component').then(m => m.ExpenseAveragesComponent),
      },
      {
        path: 'calendario',
        loadComponent: () => import('./pages/calendar/calendar.component').then(m => m.CalendarComponent),
      },
      {
        path: 'correos',
        loadComponent: () => import('./pages/emails/emails.component').then(m => m.EmailsComponent),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
