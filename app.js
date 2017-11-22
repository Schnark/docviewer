/*global MozActivity, URL, asyncStorage*/
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
/**/})();

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

function saveFile (file) {
	var a = document.createElement('a'),
		href = URL.createObjectURL(file);
	a.href = href;
	if ('download' in a) {
		a.download = file.name || '';
	} else {
		a.target = '_blank';
	}
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

function storeFile (file) {
	asyncStorage.setItem(file.name, file, rebuildFileList);
}

function removeFromStore (name) {
	asyncStorage.removeItem(name, rebuildFileList);
}

function openFromStore (name) {
	asyncStorage.getItem(name, openFile);
}

function saveFromStore (name) {
	asyncStorage.getItem(name, saveFile);
}

function buildItem (file) {
	var name = file.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	document.getElementsByTagName('ul')[0].innerHTML += '<li>' + [
		'<a href="#" data-name="' + name + '">' + name.replace(/.*\//, '') + '</a>',
		'<a href="#" class="remove" title="Remove from shelf" data-name="' + name + '">x</a>',
		'<a href="#" class="save" title="Save from shelf" data-name="' + name + '">↓</a>'
	].join(' ') + '</li>';
}

function rebuildFileList () {
	document.getElementsByTagName('ul')[0].innerHTML = '';
	asyncStorage.length(function (l) {
		var i;
		function callback (key) {
			asyncStorage.getItem(key, buildItem);
		}

		for (i = 0; i < l; i++) {
			asyncStorage.key(i, callback);
		}
	});
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
	getFile(formats, function (file) {
		if (document.getElementsByTagName('input')[0].checked) {
			storeFile(file);
		}
		openFile(file);
	});
};

document.getElementsByTagName('ul')[0].onclick = function (e) {
	var el = e.target, name;
	if (e.button) {
		return;
	}
	while (el && (!el.tagName || (el.tagName !== 'UL' && el.tagName !== 'A'))) {
		el = el.parentNode;
	}
	name = el && el.dataset && el.dataset.name;
	if (name) {
		e.preventDefault();
		if (el.className === 'remove') {
			if (window.confirm('Remove "' + name + '" from local shelf?')) {
				removeFromStore(name);
			}
		} else if (el.className === 'save') {
			saveFromStore(name);
		} else {
			openFromStore(name);
		}
	}
};

if (navigator.mozSetMessageHandler) {
	navigator.mozSetMessageHandler('activity', function (request) {
		openFile(request.source.data.blob);
	});
}

rebuildFileList();

})();