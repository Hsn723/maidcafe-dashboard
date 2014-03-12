var socket = io.connect('https://kagehoshi.com:8000');

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

// Unbilled receipts
var UnbilledReceiptsViewModel = function(){
	var self = this;
	socket.on('receipts_heartbeat', function() {
		socket.emit('get_unbilled_receipts', {});
	});
	socket.on('unbilled_receipts_data', function(data) {
		self.unbilled_receipts(data);
	});
	self.unbilled_receipts = ko.observableArray([]);
	socket.emit('get_unbilled_receipts', {});
};
function get_unbilled_receipts(){
	ko.applyBindings(new UnbilledReceiptsViewModel(), document.getElementById('unbilled_receipts_container'));
}

var OrdersViewModel = function(receipt_no){
	var self = this;
	socket.on('orders_data', function(data) {
		self.orders(data);
	});
	self.orders = ko.observableArray([]);
	socket.emit('get_orders_by_receipt', receipt_no);
	self.subtotal = 0;
};

function get_orders_by_receipt(data){
	//socket.emit('get_orders_by_receipt', data.receipt_no);
	try{
		ko.applyBindings(new OrdersViewModel(data.receipt_no), document.getElementById('orders_container'));
	} catch(err) {}
}

/*
socket.on('orders_data', function(data) {
	ko.applyBindings({
		orders: data
		}, document.getElementById("orders_container"));
});*/