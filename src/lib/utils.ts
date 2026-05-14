import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind-aware class merger. Use everywhere we accept a `class` prop on
 * a component so callers can override default classes cleanly:
 *
 *   <Button class={cn('w-full', isDanger && 'bg-danger')} />
 *
 * tailwind-merge deduplicates conflicting Tailwind utilities (e.g. `p-2 p-4`
 * → `p-4`); clsx handles arrays/objects/conditional strings.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
