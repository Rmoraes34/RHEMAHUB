import { Input } from "@/components/ui/input";
import { activitySuggestions } from "@/lib/categories";
import { useId } from "react";

/**
 * Campo "Atividade específica" com sugestões por categoria (datalist).
 * Permite digitar uma atividade que não esteja na lista.
 */
export function ActivityInput({
  categoria,
  value,
  onChange,
  placeholder = "Atividade específica",
  className,
}: {
  categoria: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const listId = useId();
  const suggestions = activitySuggestions(categoria);
  return (
    <>
      <Input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}
