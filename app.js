var express = require('express');
var app = express();
var httpapp = express();
var fs = require('fs');
var options = {
	key: fs.readFileSync('/etc/nginx/www_kagehoshi.com/ssl.key'),
	cert: fs.readFileSync('/etc/nginx/www_kagehoshi.com/ssl-unified.crt'),
	requestCert: true
}
var http = require('http').createServer(httpapp);
var server = require('https').createServer(options, app)
	, io = require('socket.io').listen(server);
server.listen(8000);
http.listen(8001);

// PostgreSQL client
var pg = require('pg');
var conString = process.argv[2];
var client = new pg.Client(conString);
client.connect();

httpapp.get('*', function(req,res) {
	res.redirect('https://kagehoshi.com:8000'+req.url);
});
app.get('/', function(req, res) {
	res.sendfile(__dirname + '/index.html');
});
app.get('cashier', function(req, res) {
	res.sendfile(__dirname + '/index.html');
});

// Socket.io
io.sockets.on('connection', function(socket) {
	// Kitchen
	socket.on('get_menu', function() {
		client.query('SELECT * FROM get_menu()', function(err, result) {
			if(err || result.rowCount === 0){
				socket.emit('error', 'ERROR: getting menu');
				return console.error('error getting menu', err);
			}
			socket.emit('menu_data', result.rows);
			socket.emit('orders_heartbeat', {});
		});
	});
	
	socket.on('add_order', function(data) {
		client.query('SELECT new_receipt($1)', data.table_no, function(err) {
			if(err){
				socket.emit('error', 'ERROR: creating receipt');
				return console.error('error creating receipt', err);
			}
			socket.emit('success', 'DONE: creating receipt');
		});
		client.query('SELECT add_order($1, $2, $3)', [data.table_no, data.seat_no, data.menu_item], function(err) {
			if(err){
				socket.emit('error', 'ERROR: adding order');
				return console.error('error adding order', err);
			}
			socket.emit('orders_heartbeat', {});
			socket.broadcast.emit('receipts_heartbeat', {});
			socket.emit('success', 'DONE: adding order');
		});
	});
	
	socket.on('get_unfilled_orders', function() {
		client.query('SELECT * FROM get_unfilled_orders()', function(err, result) {
			if(err){
				socket.emit('error', 'ERROR: getting unfilled orders');
				return console.error('error getting unfilled orders, err');
			}
			socket.emit('unfilled_orders_data', result.rows);
		});
	});
	
	socket.on('delete_order', function(data) {
		client.query('SELECT delete_order($1)', [data], function(err) {
			if(err){
				socket.emit('error', 'ERROR: deleting order');
				return console.error('error deleting order', err);
			}
			socket.emit('orders_heartbeat', {});
			socket.broadcast.emit('receipts_heartbeat', {});
		});
	});
	
	socket.on('mark_fulfilled', function(data) {
		client.query('SELECT mark_fulfilled($1)', [data], function(err) {
			if(err){
				socket.emit('error', 'ERROR: mark fulfilled');
				return console.error('error marking fulfilled', err);
			}
			socket.emit('orders_heartbeat', {});
			socket.broadcast.emit('receipts_heartbeat', {});
		});
	});
	
	// Cashier
	socket.on('get_unbilled_receipts', function() {
		client.query('SELECT * FROM get_unbilled_receipts()', function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting unbilled receipts');
				return console.error('error getting unbilled receipts', err);
			}
			socket.emit('unbilled_receipts_data', res.rows);
		});
	});
	
	socket.on('get_orders_by_receipt', function(data) {
		client.query('SELECT * FROM get_orders_by_receipt($1)', [data], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting orders');
				return console.error('error getting orders', err);
			}
			socket.emit('orders_data', res.rows);
		});
	});
	
	socket.on('get_receipt_by_id', function(data) {
		client.query('SELECT * FROM get_receipt_by_id($1)', [data], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting receipt');
				return console.error('error getting receipt', err);
			}
			socket.emit('receipt_data', res.rows);
		});
	});
	
	socket.on('mark_paid', function(data) {
		client.query('SELECT mark_paid($1::int[])', [data], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: marking orders paid');
				return console.error('error marking orders paid', err);
			}
			socket.emit('receipts_heartbeat', {});
			socket.emit('success', 'DONE: orders paid');
		});
	});
	
	socket.on('mark_billed', function(data) {
		client.query('SELECT mark_billed($1)', [data], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: marking receipt paid');
				return console.error('error marking receipt paid', err);
			}
			socket.emit('receipts_heartbeat', {});
			socket.emit('success', 'DONE: receipt billed');
		});
	});
	
	// subtotals
	socket.on('get_seats', function(data) {
		client.query('SELECT * FROM get_seats($1)', [data], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting seats');
				return console.error('error getting seats', err);
			}
			socket.emit('seats_data', res.rows);
		});
	});
	socket.on('get_subtotal', function(data) {
		client.query('SELECT item_price AS subtotal FROM get_subtotal($1, $2) WHERE order_no = 0'
		, [data.table_no, data.seat_no]
		, function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting subtotal');
				return console.error('error getting subtotal', err);
			}
			socket.emit('subtotal_data', res.rows);
		});
	});
	socket.on('mark_seat_paid', function(data) {
		client.query('SELECT mark_seat_paid($1, $2)', [data.receipt_no, data.seat_no], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: marking seat paid');
				return console.error('error marking seat paid', err);
			}
			socket.emit('receipts_heartbeat', {});
			socket.emit('success', 'DONE: seat paid');
		});
	});
});
