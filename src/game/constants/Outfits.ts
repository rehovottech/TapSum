export type OutfitId = 'none' | 'party' | 'shades' | 'headphones' | 'crown' | 'wizard';

export interface Outfit {
    id: OutfitId;
    name: string;
    /** Lifetime stars needed to unlock (1 star per round cleared). */
    stars: number;
}

export const OUTFITS: Outfit[] = [
    { id: 'none',       name: 'Plain',      stars: 0 },
    { id: 'party',      name: 'Party hat',  stars: 15 },
    { id: 'shades',     name: 'Cool shades', stars: 40 },
    { id: 'headphones', name: 'Headphones', stars: 80 },
    { id: 'crown',      name: 'Crown',      stars: 150 },
    { id: 'wizard',     name: 'Wizard hat', stars: 250 },
];

export type SceneryId = 'meadow' | 'sunrise' | 'ocean' | 'candy' | 'starry';

export interface Scenery {
    id: SceneryId;
    name: string;
    stars: number;
    top: number;
    bottom: number;
    hillBack: number;
    hillFront: number;
    /** Light decoration drawn behind the hills. */
    deco: 'none' | 'clouds' | 'bubbles' | 'hearts' | 'stars';
}

// All backdrops stay light so the dark ink text drawn straight on the sky remains readable.
export const SCENERIES: Scenery[] = [
    { id: 'meadow',  name: 'Meadow',  stars: 0,   top: 0xeeeeee, bottom: 0xeeeeee, hillBack: 0xa8e6b8, hillFront: 0x7fd396, deco: 'none' },
    { id: 'sunrise', name: 'Sunrise', stars: 25,  top: 0xffe6d5, bottom: 0xfff3c9, hillBack: 0xffc7a1, hillFront: 0xf6a77a, deco: 'clouds' },
    { id: 'ocean',   name: 'Ocean',   stars: 60,  top: 0xdff4ff, bottom: 0xc4e6fb, hillBack: 0x8fd3f0, hillFront: 0x5fb8e6, deco: 'bubbles' },
    { id: 'candy',   name: 'Candy',   stars: 120, top: 0xffe3f1, bottom: 0xf0e2ff, hillBack: 0xffb8d9, hillFront: 0xe79bd0, deco: 'hearts' },
    { id: 'starry',  name: 'Starry',  stars: 200, top: 0xe3e4ff, bottom: 0xf3eaff, hillBack: 0xb9bdf5, hillFront: 0x9aa0ea, deco: 'stars' },
];
