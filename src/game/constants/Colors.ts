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

// Kid-friendly light theme used by Preload, Menu, Game, End and panels.
export const THEME = {
    // Backgrounds & surfaces
    BG_TOP:      0xe8f6ff,
    BG_BOTTOM:   0xd6eeff,
    CARD:        0xffffff,
    CARD_SHADOW: 0xbfe3f7,
    SURFACE:     0xf0f9ff,
    TRACK:       0xd3ecfa,
    PIP_OFF:     0xc5e3f5,
    SCRIM:       0x12305a,

    // Text
    INK:   0x12305a,
    MUTED: 0x4a6585,
    WHITE: 0xffffff,

    // Meaning
    ADD:      0x1fa34f,
    SUB:      0xe5392d,
    SUB_TINT: 0xfff0f3,
    WARN:     0xff8a2b,
    GOLD:     0xb36b00,
    STAR:     0xffc531,

    // Buttons
    GO:       0x1e9e4e,
    GO_DARK:  0x13703a,
    RED:      0xe5392d,
    RED_DARK: 0xa8251c,

    // Candy palette (title letters, particles)
    CANDY: [0xe5392d, 0xff8a2b, 0xe0a000, 0x1fa34f, 0x1e90e8, 0x8b5cf6],
};

// Place-value buttons: each value keeps one colour so kids learn "yellow = ones".
export const INCREMENT_SCHEME = {
    1:    { face: 0xffc531, side: 0xe0a000, text: THEME.INK,   border: 0 },
    10:   { face: 0x1e90e8, side: 0x146db5, text: THEME.WHITE, border: 0 },
    100:  { face: 0xff8a2b, side: 0xd9640f, text: THEME.INK,   border: 0 },
    1000: { face: 0x8b5cf6, side: 0x6236c9, text: THEME.WHITE, border: 0xffc531 },
} as const;
