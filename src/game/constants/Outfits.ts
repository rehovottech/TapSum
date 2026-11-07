export type OutfitId = 'none' | 'party' | 'shades' | 'headphones' | 'crown' | 'wizard'
    | 'chef' | 'graduate' | 'flower' | 'astronaut' | 'halo';

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
    { id: 'chef',       name: 'Chef hat',   stars: 330 },
    { id: 'graduate',   name: 'Grad cap',   stars: 420 },
    { id: 'flower',     name: 'Flower crown', stars: 520 },
    { id: 'astronaut',  name: 'Space helmet', stars: 650 },
    { id: 'halo',       name: 'Golden halo', stars: 800 },
];

export type SceneryId = 'meadow' | 'sunrise' | 'ocean' | 'candy' | 'starry' | 'forest' | 'snowy' | 'rainbow' | 'garden';

export interface Scenery {
    id: SceneryId;
    name: string;
    stars: number;
    top: number;
    bottom: number;
    hillBack: number;
    hillFront: number;
    /** Light decoration drawn behind the hills. */
    deco: 'none' | 'clouds' | 'bubbles' | 'hearts' | 'stars' | 'leaves' | 'snow' | 'sparkles' | 'petals';
}

// All backdrops stay light so the dark ink text drawn straight on the sky remains readable.
export const SCENERIES: Scenery[] = [
    { id: 'meadow',  name: 'Meadow',  stars: 0,   top: 0xeeeeee, bottom: 0xeeeeee, hillBack: 0xa8e6b8, hillFront: 0x7fd396, deco: 'none' },
    { id: 'sunrise', name: 'Sunrise', stars: 25,  top: 0xffe6d5, bottom: 0xfff3c9, hillBack: 0xffc7a1, hillFront: 0xf6a77a, deco: 'clouds' },
    { id: 'ocean',   name: 'Ocean',   stars: 60,  top: 0xdff4ff, bottom: 0xc4e6fb, hillBack: 0x8fd3f0, hillFront: 0x5fb8e6, deco: 'bubbles' },
    { id: 'candy',   name: 'Candy',   stars: 120, top: 0xffe3f1, bottom: 0xf0e2ff, hillBack: 0xffb8d9, hillFront: 0xe79bd0, deco: 'hearts' },
    { id: 'starry',  name: 'Starry',  stars: 200, top: 0xe3e4ff, bottom: 0xf3eaff, hillBack: 0xb9bdf5, hillFront: 0x9aa0ea, deco: 'stars' },
    { id: 'forest',  name: 'Forest',  stars: 300, top: 0xe4f3dc, bottom: 0xf3f8d9, hillBack: 0x9fd89a, hillFront: 0x6cbf74, deco: 'leaves' },
    { id: 'snowy',   name: 'Snowy',   stars: 450, top: 0xe8f2fb, bottom: 0xf7fbff, hillBack: 0xd5e6f5, hillFront: 0xbcd6ee, deco: 'snow' },
    { id: 'rainbow', name: 'Rainbow', stars: 650, top: 0xfff0d9, bottom: 0xe6f1ff, hillBack: 0xffd08a, hillFront: 0xf5a3c7, deco: 'sparkles' },
    { id: 'garden',  name: 'Garden',  stars: 900, top: 0xfdeef4, bottom: 0xeaf7e4, hillBack: 0xb5e3a8, hillFront: 0x86cf8a, deco: 'petals' },
];
