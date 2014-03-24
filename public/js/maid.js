var socket = io.connect('https://kagehoshi.com:8000');

//suggestion for manually typing table.
// TODO: switch to pnotify
socket.on('error', function(err) {
	console.log(err);
	$.notify(err, {
		className: 'error',
		globalPosition: 'left top',
		style: 'bootstrap',
		autoHideDelay: '2000'
	});
});
socket.on('success', function(msg) {
	$.notify(msg, {
		className: 'success',
		globalPosition: 'left top',
		style: 'bootstrap',
		autoHideDelay: '2000'
	});
});

// Menu
function get_menu(){
	socket.emit('get_menu', {});
}
socket.on('menu_data', function(data) {
	//
});