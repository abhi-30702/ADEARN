import { disbursementRepository } from '../repositories/disbursement.repository';

export const charityService = {
  /**
   * Public transparency summary for the charity impact page. Combines the
   * currently-accumulating charity pool, total ever disbursed, partnered NGOs,
   * and the full disbursement ledger. No authentication required.
   */
  async getImpact() {
    const [totals, disbursedTotal, ngos, ledger] = await Promise.all([
      disbursementRepository.getCharityTotals(),
      disbursementRepository.getTotalDisbursed(),
      disbursementRepository.getNgos(),
      disbursementRepository.getCharityLedger(),
    ]);

    const pending = Number(totals.total_amount);
    const disbursed = Number(disbursedTotal);

    return {
      total_raised: Math.round((pending + disbursed) * 100) / 100,
      total_pending: pending,
      total_disbursed: disbursed,
      contributors: Number(totals.user_count),
      ngos: ngos.map((n) => ({
        id: n.id,
        name: n.name,
        cause: n.cause,
        accumulated_balance: Number(n.accumulated_balance),
      })),
      disbursements: ledger.map((d) => ({
        id: d.id,
        ngo_name: d.ngo_name,
        total_amount: Number(d.total_amount),
        user_count: d.user_count,
        disbursed_at: d.disbursed_at,
        notes: d.notes,
      })),
    };
  },
};
