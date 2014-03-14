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
	self.unbilled_receipts = ko.observableArray([]);
	
	// Clears orders if receipt no longer exists, otherwise refresh
	self.RefreshOrders = function(receipt_no) {
		var refreshNeeded = true;
		ko.utils.arrayForEach(self.unbilled_receipts(), function(unbilled_receipt) {
			if(unbilled_receipt.receipt_no === receipt_no) {
				refreshNeeded = false;
			}
		});
		if(refreshNeeded) {
			_OrdersViewModel.Clear();
		} else {
			socket.emit('get_orders_by_receipt', _OrdersViewModel.receipt_no());
		}
	};
	
	socket.on('receipts_heartbeat', function() {
		socket.emit('get_unbilled_receipts', {});
	});
	
	socket.on('unbilled_receipts_data', function(data) {
		self.unbilled_receipts(data);
		self.RefreshOrders(_OrdersViewModel.receipt_no());
	});
	
	socket.emit('get_unbilled_receipts', {});
};

// Orders
var OrdersViewModel = function(){
	var self = this;
	self.receipt_no = ko.observable();
	self.table_no = ko.observable();
	self.orders = ko.observableArray([]);
	self.selected_orders = ko.observableArray();
	
	self.subtotal_value = ko.observable(parseFloat(0.00).toFixed(2));
	self.subtotal = ko.computed(function() {
		return '$' + self.subtotal_value();
	}), self;
	
	self.total = ko.observable();
	
	self.order_selection = function(data, event) {
		if(event.target.checked) {
			self.selected_orders.push(data.order_no);
			self.subtotal_value(parseFloat(self.subtotal_value()) + parseFloat(data.item_price.substr(1, data.item_price.length - 1)));
		} else {
			self.selected_orders.remove(data.order_id);
			self.subtotal_value(parseFloat(self.subtotal_value()) - parseFloat(data.item_price.substr(1, data.item_price.length - 1)));
		}
		return true;
	};
	
	self.Clear = function(){
		self.orders.removeAll();
		self.selected_orders.removeAll();
		self.subtotal_value(parseFloat(0.00).toFixed(2));
		self.total('$' + parseFloat(0.00).toFixed(2));
	};
	
	self.mark_paid = function() {
		console.log(self.selected_orders());
		socket.emit('mark_paid', self.selected_orders());
	};
	
	self.mark_billed = function() {
		socket.emit('mark_billed', self.table_no());
	};
	
	socket.on('orders_data', function(data) {
		self.Clear();
		self.orders(data);
		socket.emit('get_receipt_by_id', self.receipt_no());
		socket.emit('get_seats', self.receipt_no());
	});
	
	socket.on('receipt_data', function(data) {
		self.total(data[0].balance_amt);
	});
	
};
var _OrdersViewModel = new OrdersViewModel();

// Subtotals
var SubtotalsViewModel = function(){
	var self = this;
	self.seats = ko.observableArray([]);
	self.selected_seat = ko.observable();
	self.subtotal = ko.observable(parseFloat(0.00).toFixed(2));
	
	self.selected_seat.subscribe(function(val) {
		if(val > 0) {
			socket.emit('get_subtotal', {table_no: _OrdersViewModel.table_no(), seat_no: val});
		}
	});
	self.mark_seat_paid = function() {
		socket.emit('mark_seat_paid', {receipt_no: _OrdersViewModel.receipt_no(), seat_no: self.selected_seat()});
	};
	
	socket.on('subtotal_data', function(data){
		self.subtotal(data[0].subtotal);
	});
	socket.on('seats_data', function(data){
		self.subtotal(parseFloat(0.00).toFixed(2));
		self.seats(data);
	});
	socket.emit('get_seats', _OrdersViewModel.receipt_no());
};
var _SubtotalsViewModel = new SubtotalsViewModel();

function get_unbilled_receipts(){
	ko.applyBindings(new UnbilledReceiptsViewModel(), document.getElementById('unbilled_receipts_container'));
	ko.applyBindings(_OrdersViewModel, document.getElementById('orders_container'));
	ko.applyBindings(_SubtotalsViewModel, document.getElementById('subtotals_container'));
}

function get_orders_by_receipt(data){
	_OrdersViewModel.receipt_no(data.receipt_no);
	_OrdersViewModel.table_no(data.table_no);
	socket.emit('get_orders_by_receipt', data.receipt_no);
}
