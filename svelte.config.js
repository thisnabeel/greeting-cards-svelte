import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Deploy to Vercel as serverless functions.
		// runtime must be set to avoid build-time Node version inference.
		adapter: adapter({
			// Prevent @sveltejs/adapter-vercel from trying to infer the runtime from Node during build.
			// Vercel no longer supports nodejs18.x for new deployments.
			runtime: 'nodejs24.x'
		})
	}
};

export default config;
