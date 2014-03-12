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
		socket.emit('get_receipt_by_id', receipt_no);
	});
	self.orders = ko.observableArray([]);
	socket.emit('get_orders_by_receipt', receipt_no);
	self.subtotal = 0;
};

var TotalsViewModel = function(){
	var self = this;
	socket.on('receipt_data', function(data) {
		self.total(data[0].balance_amt);
	});
	self.subtotal = ko.observable();
	self.total = ko.observable();
};

function get_orders_by_receipt(data){
	//socket.emit('get_orders_by_receipt', data.receipt_no);
	try{
		ko.applyBindings(new OrdersViewModel(data.receipt_no), document.getElementById('orders_container'));
		ko.applyBindings(new TotalsViewModel(data.receipt_no), document.getElementById('totals_container'));
	} catch(err) {}
}


/*
var ReceiptsViewModel = function(){
	var self = this;
	socket.on('receipt_data', function(data) {
		self.receipt(data[0]);
		console.log(data[0]);
	});
	self.receipt = ko.observable();
};
ko.applyBindings(new ReceiptsViewModel(), document.getElementById('total_row'));*/