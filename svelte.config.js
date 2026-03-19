import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Deploy to Vercel as serverless functions.
		// runtime must be set to avoid build-time Node version inference.
		adapter: adapter({
			// Prevent @sveltejs/adapter-vercel from trying to infer the runtime from Node during build.
			runtime: 'nodejs18.x'
		})
	}
};

export default config;
