// src/app/core/services/migration.service.ts
// Servicio temporal para migrar datos de localStorage a Supabase
// Eliminar después de migrar todos los datos

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class MigrationService {
  private sb = inject(SupabaseService);

  /**
   * Detecta si hay datos en localStorage que no se han migrado
   */
  hasPendingMigration(): boolean {
    const keys = ['envelopes', 'transactions', 'subscriptions', 'paymentCalendar', 'projections', 'purchases', 'loans'];
    return keys.some(k => localStorage.getItem(k) !== null);
  }

  /**
   * Migra todos los datos de localStorage a Supabase
   * Retorna un resumen de lo migrado
   */
  async migrateAll(): Promise<Record<string, number>> {
    const summary: Record<string, number> = {};
    const uid = this.sb.currentUser()?.id;
    if (!uid) throw new Error('Debe iniciar sesión antes de migrar');

    // Migrar sobres
    const envelopes = this.parseLocal('envelopes');
    if (envelopes.length) {
      for (const e of envelopes) {
        await this.sb.createEnvelope({
          name: e.name,
          color: e.color || '#004E64',
          icon: e.icon || 'account_balance_wallet',
          budget_limit: e.budgetLimit || e.budget_limit || 0,
          period: e.period || 'monthly',
          is_active: e.isActive ?? e.is_active ?? true,
        });
      }
      summary['envelopes'] = envelopes.length;
    }

    // Migrar suscripciones
    const subs = this.parseLocal('subscriptions');
    if (subs.length) {
      for (const s of subs) {
        await this.sb.createSubscription({
          name: s.name,
          category: s.category || 'Otros',
          cost: s.cost || 0,
          currency: s.currency || 'USD',
          cycle: s.cycle || 'monthly',
          next_payment_date: s.nextPaymentDate || s.next_payment_date || null,
          status: s.status || 'active',
          notes: s.notes || null,
        });
      }
      summary['subscriptions'] = subs.length;
    }

    // Migrar compras
    const purchases = this.parseLocal('purchases');
    if (purchases.length) {
      for (const p of purchases) {
        await this.sb.createPurchase({
          name: p.name,
          cost: p.cost || null,
          currency: p.currency || 'USD',
          url: p.url || null,
          priority: p.priority || 'media',
          status: p.status || 'pendiente',
        });
      }
      summary['purchases'] = purchases.length;
    }

    // Migrar préstamos
    const loans = this.parseLocal('loans');
    if (loans.length) {
      for (const l of loans) {
        await this.sb.createLoan({
          person_name: l.personName || l.person_name,
          total_amount: l.totalAmount || l.total_amount || 0,
          currency: l.currency || 'CRC',
          loan_type: l.loanType || l.loan_type || 'lent',
          date: l.date || new Date().toISOString().split('T')[0],
          notes: l.notes || null,
        });
      }
      summary['loans'] = loans.length;
    }

    return summary;
  }

  /**
   * Elimina datos de localStorage después de confirmar migración
   */
  clearLocalStorage() {
    const keys = ['envelopes', 'transactions', 'subscriptions', 'paymentCalendar', 'projections', 'purchases', 'loans', 'savingsGoals'];
    keys.forEach(k => localStorage.removeItem(k));
  }

  private parseLocal(key: string): any[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
