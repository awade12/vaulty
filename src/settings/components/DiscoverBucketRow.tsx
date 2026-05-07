interface DiscoverBucketRowProps {
  name: string;
  isSaved: boolean;
  isChecked: boolean;
  onToggle: (name: string) => void;
}

export default function DiscoverBucketRow({
  name,
  isSaved,
  isChecked,
  onToggle,
}: DiscoverBucketRowProps) {
  const id = `discover-bucket-${name}`;

  function handleChange(): void {
    onToggle(name);
  }

  return (
    <label
      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-100"
      htmlFor={id}
    >
      <input
        checked={isChecked}
        className="h-3.5 w-3.5 shrink-0 rounded border-[0.5px] border-zinc-200 text-accent-700 focus:ring-accent-200"
        id={id}
        onChange={handleChange}
        type="checkbox"
      />
      <span className="min-w-0 flex-1 truncate text-xs text-zinc-900">
        {name}
        {isSaved && (
          <span className="ml-1.5 text-[10px] text-zinc-400">(saved)</span>
        )}
      </span>
    </label>
  );
}
