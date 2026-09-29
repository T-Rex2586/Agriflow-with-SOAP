interface TargetCardProps {
  number: string;
  title: string;
  description: string;
}

export default function TargetCard({ number, title, description }: TargetCardProps) {
  return (
    <div className="flex gap-4 rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-green-800">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}