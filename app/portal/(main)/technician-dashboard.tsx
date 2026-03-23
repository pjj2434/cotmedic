export function TechnicianDashboard({ name }: { name: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Welcome, {name}</h1>
      <p className="mt-2 text-zinc-500">
        View your assigned work orders and schedule.
      </p>
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-medium text-zinc-900">Your workload</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Work orders and assignments will appear here.
        </p>
      </div>
    </div>
  );
}
