type Props = {
  title: string;
  description: string;
  workspaceLabel?: string;
};

export function FinanceCoordinatorPlaceholderPage({
  title,
  description,
  workspaceLabel = "Finance Coordinator workspace",
}: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:pl-6">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-bold text-[#062763] sm:text-lg">
            {title}
          </h1>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            {workspaceLabel}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#062763]/70">
            Coming soon
          </p>
          <h2 className="mt-2 text-lg font-bold text-[#062763]">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-700">
            {description}
          </p>
        </section>
      </main>
    </div>
  );
}
