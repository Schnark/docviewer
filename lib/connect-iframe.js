document.getElementById('button-close-document').addEventListener('click', function (e) {
	e.preventDefault();
	window.parent.postMessage('close', '*');
}, false);
window.addEventListener('message', function (e) {
	var xhr;
	if (e.data.buffer) {
		xhr = new XMLHttpRequest();
		xhr.onload = function () {
			openUrl(xhr.response, e.data.name);
		};
		xhr.open('GET', e.data.url);
		xhr.responseType = 'arraybuffer';
		xhr.send();
	} else {
		openUrl(e.data.url, e.data.name);
	}
}, false);
window.parent.postMessage('ready', '*');