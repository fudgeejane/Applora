import { Search } from "lucide-react";

function SearchBar({
  value,
  onChange,
  isCollapsed,
  isMobileOpen,
  onExpand,
  secondaryText,
  hoverBg,
}) {
  return (
    <div className="shrink-0 px-3.5 py-4">
      {isCollapsed && !isMobileOpen ? (
        <button
          type="button"
          onClick={onExpand}
          aria-label="Expand sidebar to search"
          title="Search"
          className={`hidden h-10 w-full items-center justify-center rounded-xl md:flex ${secondaryText} ${hoverBg}`}
        >
          <Search size={19} />
        </button>
      ) : (
        <label className="flex h-10 items-center gap-2.5 rounded-lg border border-gray-200 px-3 text-gray-500 focus-within:border-blue-500 dark:border-gray-800 dark:focus-within:border-blue-500">
          <Search size={17} className="shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search dashboard..."
            aria-label="Search dashboard sections"
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </label>
      )}
    </div>
  );
}

export default SearchBar;
