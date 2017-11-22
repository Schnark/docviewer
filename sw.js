/*global caches, fetch, Promise, Response, importScripts, zip */
(function (worker) {
"use strict";

importScripts('sw/zip.js');
importScripts('sw/ArrayBufferReader.js');
importScripts('sw/deflate.js');
importScripts('sw/inflate.js');

zip.useWebWorkers = false;

var VERSION = 'v1.4',
	FILES = [
		'sw/zip.js',
		'sw/ArrayBufferReader.js',
		'sw/deflate.js',
		'sw/inflate.js'
	],
	ZIP = 'docviewer.zip';

worker.addEventListener('install', function (e) {
	e.waitUntil(
		caches.open(VERSION).then(function (cache) {
			return cache.addAll(FILES).then(cacheFromZip);
		})
	);
});

worker.addEventListener('activate', function (e) {
	e.waitUntil(
		caches.keys().then(function (keys) {
			return Promise.all(keys.map(function (key) {
				if (key !== VERSION) {
					return caches.delete(key);
				}
			}));
		})
	);
});

worker.addEventListener('fetch', function (e) {
	e.respondWith(caches.match(e.request, {ignoreSearch: true})
		.then(function (response) {
			return response || fetch(e.request);
		})
	);
});

function getContentType (ext) {
	return {
		css: 'text/css',
		js: 'text/javascript',
		png: 'image/png',
		gif: 'image/gif',
		jpg: 'image/jpeg',
		html: 'text/html',
		svg: 'image/svg+xml',
		woff: 'application/font-woff'
	}[ext] || 'text/plain';
}

function getZipReader (data) {
	return new Promise(function (fulfill, reject) {
		zip.createReader(new zip.ArrayBufferReader(data), fulfill, reject);
	});
}

function cacheEntry (entry) {
	if (entry.directory) {
		return Promise.resolve();
	}

	return new Promise(function (fulfill, reject) {
		entry.getData(new zip.BlobWriter(), function (data) {
			return caches.open(VERSION).then(function (cache) {
				return cache.put(
					location.href.replace(/sw\.js$/, entry.filename),
					new Response(data, {
						headers: {
							'Content-Type': getContentType(entry.filename.replace(/.*\./, ''))
						}
					})
				);
			}).then(fulfill, reject);
		});
	});
}

function cacheContents (reader) {
	return new Promise(function (fulfill, reject) {
		reader.getEntries(function (entries) {
			Promise.all(entries.map(cacheEntry)).then(fulfill, reject);
		});
	});
}

function cacheFromZip () {
	return fetch(ZIP).then(function (response) {
		return response.arrayBuffer();
	}).then(getZipReader).then(cacheContents);
}

})(this);