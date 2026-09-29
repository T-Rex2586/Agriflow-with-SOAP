interface StatCardProps {
  value: string;
  label: string;
  icon: string;
}

export default function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div className="rounded-xl bg-green-50 p-6 text-center shadow-sm transition hover:shadow-md">
      <div className="mb-2 text-4xl">{icon}</div>
      <div className="text-3xl font-bold text-green-800">{value}</div>
      <div className="mt-1 text-gray-600">{label}</div>
    </div>
  );
}