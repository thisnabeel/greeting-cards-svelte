/** Google fonts available in TikTok Thumbnail Studio. Default: Archivo Black. */
export const TIKTOK_FONTS = [
	{ id: 'archivo-black', family: 'Archivo Black', cssFamily: '"Archivo Black", sans-serif' },
	{ id: 'bebas-neue', family: 'Bebas Neue', cssFamily: '"Bebas Neue", sans-serif' },
	{ id: 'anton', family: 'Anton', cssFamily: '"Anton", sans-serif' },
	{ id: 'oswald', family: 'Oswald', cssFamily: '"Oswald", sans-serif' },
	{ id: 'montserrat', family: 'Montserrat', cssFamily: '"Montserrat", sans-serif' },
	{ id: 'poppins', family: 'Poppins', cssFamily: '"Poppins", sans-serif' },
	{ id: 'playfair-display', family: 'Playfair Display', cssFamily: '"Playfair Display", serif' },
	{ id: 'roboto', family: 'Roboto', cssFamily: '"Roboto", sans-serif' },
	{ id: 'lato', family: 'Lato', cssFamily: '"Lato", sans-serif' },
	{ id: 'raleway', family: 'Raleway', cssFamily: '"Raleway", sans-serif' }
];

export const DEFAULT_TIKTOK_FONT = TIKTOK_FONTS[0];

/** Google Fonts CSS URL for all TikTok studio faces. */
export const TIKTOK_FONTS_STYLESHEET =
	'https://fonts.googleapis.com/css2?' +
	[
		'family=Archivo+Black',
		'family=Bebas+Neue',
		'family=Anton',
		'family=Oswald:wght@400;700',
		'family=Montserrat:wght@400;700',
		'family=Poppins:wght@400;700',
		'family=Playfair+Display:wght@400;700',
		'family=Roboto:wght@400;700',
		'family=Lato:wght@400;700',
		'family=Raleway:wght@400;700'
	].join('&') +
	'&display=swap';

export const ensureTikTokFontsLoaded = async () => {
	if (typeof document === 'undefined') return;
	await Promise.all(
		TIKTOK_FONTS.map((f) => document.fonts.load(`700 48px ${f.cssFamily}`).catch(() => null))
	);
	await document.fonts.ready;
};
