/** Store links used by the Share button. Leave the iOS id empty until the App Store listing exists. */
export const SHARE_CONFIG = {
    androidUrl: 'https://play.google.com/store/apps/details?id=com.rehovot.game.tapsum',
    /** App Store numeric id, e.g. '1234567890'. Empty = iOS shares the text without a link. */
    iosAppId: '6827177192',
    /** Link shared from the web edition. Empty = the page the game is running on. */
    webUrl: '',
    /** Optional Facebook App ID for Instagram Stories attribution. */
    facebookAppId: '',
};
