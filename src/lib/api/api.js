// Api.js
import axios from 'axios';
import { csrf_token } from '$lib/stores/api.js';
import storage from '$lib/stores/storage';
// import { BASE_URL } from '$lib/Env';

// Create a instance of axios to use the same base url.
const axiosAPI = axios.create({
	// baseURL: BASE_URL
	// baseURL: 'https://knowyourhizb-production.up.railway.app' // it's not recommended to have this info here.
	baseURL: 'http://localhost:3000/'
});

// let csrfToken;
// onMount(async function () {
// 	csrfToken = document.querySelector('meta[name=csrf-token]').content;
// 	console.log('token', csrfToken);
// });

// implement a method to execute all the request from here.
const apiRequest = (method, url, request, headers = {}) => {
	let user;
	storage('user').subscribe((value) => (user = value));

	if (user) {
		headers = {
			// 'Content-Type': 'application/json',
			// 'Access-Control-Allow-Origin': '*'
			'X-User-Email': user.email,
			'X-User-Token': user.generated_token
		};
		console.log('headers', headers);
	}

	// request['authenticity_token'] = 'hohuhnj';

	console.log(request);
	//using the axios instance to perform the request that received from each http method
	return axiosAPI({
		method,
		url,
		data: request,
		headers
	})
		.then((res) => {
			return Promise.resolve(res.data);
		})
		.catch((err) => {
			return Promise.reject(err);
		});
};

// function to execute the http get request
const get = (url, request) => apiRequest('get', url, request);

// function to execute the http delete request
const deleteRequest = (url, request) => apiRequest('delete', url, request);

// function to execute the http post request
const post = (url, request) => apiRequest('post', url, request);

// function to execute the http put request
const put = (url, request) => apiRequest('put', url, request);

// function to execute the http path request
const patch = (url, request) => apiRequest('patch', url, request);

// expose your method to other services or actions
const API = {
	get,
	delete: deleteRequest,
	post,
	put,
	patch
};
export default API;
