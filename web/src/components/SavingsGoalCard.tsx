import { useState } from 'react';
import { Target, Pencil, Trophy } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { GlassCard } from './ui/GlassCard';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface SavingsGoalCardProps {
  savingsBalance: number;
}

function goalKey(userId: string | undefined): string {
  return `savings_goal_${userId ?? 'anon'}`;
}

function money(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ProgressRing({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;
  return (
    <svg width={116} height={116} viewBox="0 0 116 116" className="shrink-0 -rotate-90">
      <circle cx={58} cy={58} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={9} />
      <circle
        cx={58}
        cy={58}
        r={r}
        fill="none"
        stroke="#60a5fa"
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x={58}
        y={58}
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90"
        style={{ transformOrigin: 'center' }}
        fontSize={20}
        fontWeight={700}
        fill="#f1f5f9"
      >
        {clamped.toFixed(0)}%
      </text>
    </svg>
  );
}

export function SavingsGoalCard({ savingsBalance }: SavingsGoalCardProps) {
  const user = useAuthStore((s) => s.user);
  const key = goalKey(user?.id);

  const [goal, setGoal] = useState<number>(() => {
    const stored = localStorage.getItem(key);
    return stored ? Number(stored) : 0;
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const save = () => {
    const val = Number(draft);
    if (!val || val <= 0) return;
    localStorage.setItem(key, String(val));
    setGoal(val);
    setEditing(false);
    setDraft('');
  };

  const clear = () => {
    localStorage.removeItem(key);
    setGoal(0);
    setEditing(false);
  };

  // No goal set yet, or actively editing
  if (goal <= 0 || editing) {
    return (
      <GlassCard className="p-5 border border-blue-400/20">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            {goal > 0 ? 'Update savings goal' : 'Set a savings goal'}
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Pick a target for your Savings pool and watch it fill as cashback rolls in.
        </p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Target amount (₹)"
              type="number"
              min="1"
              placeholder="e.g. 5000"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </div>
          <Button onClick={save} disabled={!draft || Number(draft) <= 0}>
            Save
          </Button>
          {goal > 0 && (
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
        {goal > 0 && (
          <button
            onClick={clear}
            className="text-[11px] text-slate-500 hover:text-red-400 transition-colors mt-3"
          >
            Remove goal
          </button>
        )}
      </GlassCard>
    );
  }

  const pct = (savingsBalance / goal) * 100;
  const remaining = Math.max(0, goal - savingsBalance);
  const reached = savingsBalance >= goal;

  return (
    <GlassCard className="p-5 border border-blue-400/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-200">Savings Goal</h3>
        </div>
        <button
          onClick={() => {
            setDraft(String(goal));
            setEditing(true);
          }}
          className="text-slate-500 hover:text-slate-200 transition-colors"
          aria-label="Edit goal"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-5">
        <ProgressRing pct={pct} />
        <div className="min-w-0">
          {reached ? (
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold mb-1">
              <Trophy className="w-4 h-4" /> Goal reached!
            </div>
          ) : (
            <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 mb-1">
              Saved so far
            </p>
          )}
          <p className="text-2xl font-bold text-slate-100 leading-none">{money(savingsBalance)}</p>
          <p className="text-xs text-slate-400 mt-1.5">
            of <span className="text-slate-200 font-medium">{money(goal)}</span> target
          </p>
          {!reached && (
            <p className="text-xs text-blue-400 mt-1">{money(remaining)} to go</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
