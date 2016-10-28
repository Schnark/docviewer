(function () {
"use strict";

function getFile (types, callback) {
	var pick;
	if (window.MozActivity) {
		pick = new MozActivity({
			name: 'pick',
			data: {
				type: types
			}
		});

		pick.onsuccess = function () {
			try {
				callback(this.result.blob);
			} catch (e) {
				callback();
			}
		};

		pick.onerror = function () {
			callback();
		};
	} else {
		pick = document.createElement('input');
		pick.type = 'file';
		pick.style.display = 'none';
		document.getElementsByTagName('body')[0].appendChild(pick);
		pick.addEventListener('change', function () {
			var file = pick.files[0];
			if (file) {
				callback(file);
			} else {
				callback();
			}
			document.getElementsByTagName('body')[0].removeChild(pick);
		}, false);
		pick.click();
	}
}

var openBlob = (function () {
	var iframe, container;
	
	iframe = document.getElementById('iframe');
	container = document.getElementById('container');
	
	iframe.style.display = 'none';
	
	return function openBlob (blob, viewer, buffer) {
		var url;
		function messageHandler (e) {
			if (e.data === 'ready') {
				iframe.contentWindow.postMessage({url: url, name: blob.name || '', buffer: !!buffer}, '*');
			} else {
				URL.revokeObjectURL(url);
				window.removeEventListener('message', messageHandler, false);
				iframe.src = '';
				iframe.style.display = 'none';
				container.style.display = 'block';
			}
		}
	
		url = URL.createObjectURL(blob);
		window.addEventListener('message', messageHandler, false);
		iframe.src = viewer;
		container.style.display = 'none';
		iframe.style.display = 'block';
	};
})();

function openFile (file) {
	var type = file.name.replace(/.*\./, ''), viewer, buffer;
	switch (type) {
	case 'epub': viewer = 'lib/epub/index.html'; break;
	case 'pdf': viewer = 'lib/pdf/viewer.html'; break;
	case 'odt': case 'ods': case 'odp': viewer = 'lib/odf/index.html'; break;
	default: viewer = 'lib/txt/index.html';
	}
	openBlob(file, viewer, buffer);
}

document.getElementsByTagName('button')[0].onclick = function () {
	var formats = [
		'application/epub+zip',
		'application/pdf',
		'application/vnd.oasis.opendocument.text',
		'application/vnd.oasis.opendocument.spreadsheet',
		'application/vnd.oasis.opendocument.presentation',
		'text/*',
		'*/*' //format is ignored more or less anyway, so just allow everything
	];
	getFile(formats, openFile);
};

if (navigator.mozSetMessageHandler) {
	navigator.mozSetMessageHandler('activity', function (request) {
		openFile(request.source.data.blob);
	});
}

})();