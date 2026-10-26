// Boot splash (company logo) keeps the original dark look.
export const COLORS = {
    // Backgrounds
    BG_TOP:    0x1a0533,
    BG_BOTTOM: 0x20124d,

    // Neon accents
    NEON_BLUE:   0x00d4ff,
    NEON_PURPLE: 0xb44bff,
    NEON_GREEN:  0x39ff14,
    ACCENT:      0xff6b35,

    // Buttons
    BUTTON_PRIMARY:        0xff6b35,
    BUTTON_PRIMARY_DARK:   0xaa3311,
    BUTTON_SECONDARY:      0x3366ff,
    BUTTON_SECONDARY_DARK: 0x1133aa,
    BUTTON_DANGER:         0xff1744,
    BUTTON_DANGER_DARK:    0xaa0022,
    BUTTON_SUCCESS:        0x00c853,
    BUTTON_SUCCESS_DARK:   0x007733,
    BUTTON_PURPLE:         0xb44bff,
    BUTTON_PURPLE_DARK:    0x6600aa,

    // Status
    SUCCESS: 0x39ff14,
    FAIL:    0xff1744,

    // Text (hex strings for Phaser text style)
    TEXT_WHITE:  '#ffffff',
    TEXT_GOLD:   '#ffd700',
    TEXT_ACCENT: '#ff6b35',
    TEXT_NEON:   '#00d4ff',
    TEXT_GREEN:  '#39ff14',
};

// Daytime theme used by Boot, Menu, Game, End and panels:
// light gray background, cream cards, dark ink for anything on the sky.
export const THEME = {
    // Backgrounds & surfaces
    BG_TOP:      0xeeeeee,
    BG_BOTTOM:   0xeeeeee,
    HILL_BACK:   0xa8e6b8,
    HILL_FRONT:  0x7fd396,
    CARD:        0xfffdf6,
    CARD_SHADOW: 0xa9c3d3,
    SURFACE:     0xe2ecf2,
    TRACK:       0xd3e2ea,
    PIP_OFF:     0xa7bccb,
    SCRIM:       0x0b2236,

    // Text
    INK:   0x14304a,
    MUTED: 0x3f6584,
    WHITE: 0xffffff,

    // Meaning
    ADD:      0x1f9e4c,
    SUB:      0xd64a3d,
    SUB_TINT: 0xffe7e4,
    WARN:     0xff8a2b,
    GOLD:     0xe67e00,
    STAR:     0xffb703,

    // Buttons
    GO:       0x47d16f,
    GO_DARK:  0x26994a,
    RED:      0xd64a3d,
    RED_DARK: 0x8e342c,

    // Mascot
    MASCOT:       0xff7f5c,
    MASCOT_DARK:  0xd95a3a,
    MASCOT_BELLY: 0xffd9c2,

    // Candy palette (title letters, particles)
    CANDY: [0xe5392d, 0xff8a2b, 0xe0a000, 0x1fa34f, 0x1e90e8, 0x8b5cf6],
};

// Place-value buttons: each value keeps one colour so kids learn "yellow = ones".
export const INCREMENT_SCHEME = {
    1:    { face: 0xffc531, side: 0xe0a000, text: THEME.INK,   border: 0 },
    10:   { face: 0x1e90e8, side: 0x146db5, text: THEME.WHITE, border: 0 },
    100:  { face: 0xff8a2b, side: 0xd9640f, text: THEME.INK,   border: 0 },
    1000: { face: 0x8b5cf6, side: 0x6236c9, text: THEME.WHITE, border: 0xffc531 },
    // Take-away keeps the game's red = minus meaning
    [-1]: { face: 0xff6b6b, side: 0xd64a3d, text: THEME.WHITE, border: 0 },
} as const;
