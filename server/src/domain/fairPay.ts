import type { PayUnit, Trade } from '../types.js';

export type PayCheck = 'fair' | 'low' | 'unknown';

export interface PayOffer {
  trade: Trade;
  /** Rupees. */
  amount: number;
  /** 'total' = one amount for the whole job, 'per_day' = daily wage. */
  unit: PayUnit;
  /** Number of working days, when the customer gave it. */
  days?: number;
}

/**
 * Fair-pay guard. Runs live while a customer types a pay amount
 * (GET /api/jobs/pay-check) and again when the job is saved.
 *
 * Design rule from the product brief: inform, never block. 'low' shows the
 * customer a gentle warning and shows the worker a note on the job card; the
 * job is still posted. 'unknown' means "no opinion" and shows nothing.
 */
export function checkPay(offer: PayOffer): PayCheck {
  // TODO(you): replace this flat floor with a rule that reflects real rates for each trade
  // and pay unit (see the request in chat). It currently matches the original prototype:
  // anything under 500 rupees is flagged, whatever the trade or unit.
  return offer.amount < 500 ? 'low' : 'fair';
}
