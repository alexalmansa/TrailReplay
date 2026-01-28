// Icon categories for different activity types
export const ICON_CATEGORIES = {
    'Running/Walking': ['🏃‍♂️', '🏃‍♀️', '🚶‍♂️', '🚶‍♀️', '🥾', '👟', '🏃', '🚶'],
    'Cycling': ['🚴‍♂️', '🚴‍♀️', '🚲', '🚴', '🏍️', '🛵', '🛴'],
    'Swimming': ['🏊‍♂️', '🏊‍♀️', '🤽‍♂️', '🤽‍♀️', '🏊', '🤽'],
    'Cars & Vehicles': ['🚗', '🚙', '🚐', '🚕', '🚖', '🚘', '🚔', '🚨', '🚒', '🚑', '🛻', '🚚', '🚛', '🚜', '🏎️', '🛺'],
    'Aircraft': ['✈️', '🛩️', '🚁', '🛸', '🎈', '🪂', '🛫', '🛬'],
    'Boats & Water': ['⛵', '🚤', '🛥️', '🚢', '⛴️', '🛳️', '🚣‍♂️', '🚣‍♀️', '🏄‍♂️', '🏄‍♀️'],
    'Trains & Public Transport': ['🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚝', '🚞', '🚋', '🚌', '🚍', '🚠', '🚡'],
    'Adventure & Outdoor': ['🧗‍♂️', '🧗‍♀️', '🏔️', '⛰️', '🗻', '🏕️', '⛺', '🎒', '🧭', '🔦', '⛸️', '🛹', '🛼', '🏂', '⛷️'],
    'Sports': ['🏆', '🥇', '🥈', '🥉', '🎯', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🏌️‍♂️', '🏌️‍♀️', '🤸‍♂️', '🤸‍♀️', '🤾‍♂️', '🤾‍♀️', '🏋️‍♂️', '🏋️‍♀️', '🤺', '🏸', '🏓', '🥊', '🥋']
};

// Flattened array of all available icons
export const AVAILABLE_ICONS = Object.values(ICON_CATEGORIES).flat();

// Default settings
export const DEFAULT_SETTINGS = {
    TOTAL_ANIMATION_TIME: 60, // seconds
    GPX_ONLY_STATS: false,
    SHOW_SEGMENT_SPEEDS: true, // Enable segment speeds by default
    SHOW_LIVE_ELEVATION_LABEL: true, // Enable live elevation by default
    SPEED_DISPLAY_MODE: 'speed',
    PERFORMANCE_MODE: false,
    DEFAULT_ICON: '🏃‍♂️',
    DEFAULT_ANNOTATION_ICON: '📍',
    DEFAULT_ICON_CHANGE: '🚴‍♂️',
    DEFAULT_MARKER_SIZE: 0.7 // Smaller default marker size
};

// Activity type mappings
export const ACTIVITY_ICONS = {
    'running': '🏃‍♂️',
    'walking': '🚶‍♂️',
    'cycling': '🚴‍♂️',
    'swimming': '🏊‍♂️',
    'hiking': '🥾',
    'driving': '🚗'
};

// Transportation mode mappings
export const TRANSPORT_ICONS = {
    'walking': '🚶‍♂️',
    'cycling': '🚴‍♂️',
    'driving': '🚗',
    'transit': '🚌',
    'flight': '✈️',
    'ferry': '⛴️'
}; 
