import type { Component } from 'svelte';
import type { SVGAttributes } from 'svelte/elements';

/**
 * Type for a Lucide icon component as it ships in `lucide-svelte` v1.
 *
 * Lucide's own component type isn't quite compatible with Svelte 5's strict
 * `Component<>` generic when consumed as a prop, so we accept the loose-ish
 * shape (the props we actually use) and require callers to pass an `as`
 * cast when handing in a Lucide icon:
 *
 *   import Plus from 'lucide-svelte/icons/plus';
 *   const icon = Plus as unknown as IconComponent;
 *
 * If lucide-svelte ever ships a `Component`-compatible export, swap this
 * type for that and remove the casts.
 */
export type IconProps = SVGAttributes<SVGSVGElement> & {
	size?: number | string;
	color?: string;
	strokeWidth?: number | string;
};

export type IconComponent = Component<IconProps>;
