// "Stap X van Y" and the bar (Figma 89:7438: 767×91 card, 9 px track, #674bd9 fill). The numbers
// come from the engine's progress() (brief §7.6); the bar is decorative next to the text.
export function ProgressCard({
  label,
  step,
  total,
}: {
  label: string;
  step: number;
  total: number;
}) {
  const percent = total > 0 ? Math.min(100, Math.round((step / total) * 1000) / 10) : 0;
  return (
    <div className="rounded-2xl border border-lavender-300 bg-white px-5 pt-4 pb-5 shadow-form md:px-[37px] md:pt-[21px] md:pb-[31px]">
      <p className="text-label-sm text-purple-500">{label}</p>
      <div
        aria-hidden="true"
        className="mt-2.5 h-[9px] overflow-hidden rounded-full bg-purple-700/13"
      >
        <div className="h-full rounded-full bg-purple-700" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
