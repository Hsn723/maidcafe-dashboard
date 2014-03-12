var socket = io.connect('https://kagehoshi.com:8000');

var availableTables = ko.observableArray(['1','2','3','4','5','6','7','8','9']);
var availableSeats = ko.observableArray(['1','2','3','4']);
// Diagnostics
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
	ko.applyBindings({
		menu: data
	}, document.getElementById("orders_container"));
});

// Add an order
function add_order(menu_item){
	var table_id = $("#table_selector option:selected").text();
	var seat_id = $("#seat_selector option:selected").text();
	socket.emit('add_order', {table_no : table_id, seat_no: seat_id, menu_item : menu_item.id});
}

var UnfilledOrdersViewModel = function(){
	var self = this;
	socket.on('orders_heartbeat', function() {
		socket.emit('get_unfilled_orders', {});
	});
	socket.on('unfilled_orders_data', function(data){
		self.unfilledOrders(data);
	});
	self.unfilledOrders = ko.observableArray([]);
	socket.emit('get_unfilled_orders', {});
};
ko.applyBindings(new UnfilledOrdersViewModel(), document.getElementById('backlog_container'));

// Delete an order
function delete_order(data){
	if (confirm('Are you sure you want to delete this order?')){
		if(confirm('Are you REALLY sure you want to delete this order?')){
			socket.emit('delete_order', data.order_no);
		}
	}
}
// Mark an order fulfilled
function mark_fulfilled(data){
	if(confirm('Confirm marking this order as fulfilled?')) {
		socket.emit('mark_fulfilled', data.order_no);
	}
}
