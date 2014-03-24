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
	res.sendfile(__dirname + '/maid/index.html');
});
app.get('maid', function(req, res) {
	res.sendfile(__dirname + '/index.html');
});
app.get('kitchen', funciton(req, res) {
	res.sendfile(__dirname + '/index.html');
});
app.get('cashier', function(req, res) {
	res.sendfile(__dirname + '/index.html');
});

// Socket.io
io.sockets.on('connection', function(socket) {
	// Maid
	socket.on('get_menu', function() {
		client.query('SELECT * FROM get_menu()', function(err, res) {
			if(err || res.rowCount === 0){
				socket.emit('error', 'ERROR: getting menu');
				return console.error('error getting menu', err);
			}
			socket.emit('menu_data', res.rows);
		});
	});
	
	socket.on('add_client', function(data) {
		client.query('SELECT * FROM add_client($1, $2)', [data.t_id, data.c_name], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: adding client');
				return console.error('error adding client', err);
			}
			socket.emit('success', 'DONE: adding client');
			socket.broadcast.emit('unpaid_clients_heartbeat', {});
		});
	});
	
	socket.on('get_table', function(data) {
		client.query('SELECT * FROM get_table($1)', [data], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting table info');
				return console.error('error getting table', err);
			};
			socket.emit('get_table_data', res.rows);
		});
	});
	
	socket.on('add_order', function(data) {
		client.query('SELECT * FROM add_order($1, $2, $3)', [data.c_id, data.m_id, data.o_notes], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: adding order');
				return console.error('error adding order', err);
			}
			socket.emit('success', 'DONE: adding order');
			socket.broadcast.emit('unfilled_orders_heartbeat', {});
			socket.broadcast.emit('unpaid_clients_heartbeat', {});
		});
	});
	
	// Kitchen
	socket.on('get_unfilled_orders', function() {
		client.query('SELECT * FROM get_unfilled_orders()', function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting unfilled orders');
				return console.error('error getting unfilled orders', err);
			}
			socket.emit('get_unfilled_orders_data', res.rows);
		});
	});
	
	socket.on('get_filled_orders', function() {
		client.query('SELECT * FROM get_filled_orders()', function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting filled orders');
				return console.error('error getting filled orders', err);
			}
		});
	});
	
	socket.on('mark_fulfilled', function(data) {
		client.query('SELECT mark_fulfilled($1)', [data], function(err) {
			if(err){
				socket.emit('error', 'ERROR: mark fulfilled');
				return console.error('error marking fulfilled', err);
			}
			socket.broadcast.emit('unfilled_orders_heartbeat', {});
			socket.broadcast.emit('filled_orders_heartbeat', {});
			socket.broadcast.emit('order_ready_notification', 'An order is ready!');
		});
	});
	
	socket.on('delete_order', function(data) {
		client.query('SELECT delete_order($1)', [data], function(err) {
			if(err){
				socket.emit('error', 'ERROR: deleting order');
				return console.error('error deleting order', err);
			}
			socket.broadcast.emit('unfilled_orders_heartbeat', {});
			socket.broadcast.emit('order_deleted_notification', 'An order has been deleted!');
			socket.broadcast.emit('unpaid_clients_heartbeat', {});
		});
	});
	
	// Cashier
	socket.on('get_clients_from_table', function(data) {
		client.query('SELECT * FROM get_clients_from_table($1)', [data], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting clients for table');
				return console.error('error getting clients for table', err);
			}
			socket.emit('get_clients_from_table_data', res.rows);
		});
	});
	
	socket.on('get_client_orders', function(data) {
		client.query('SELECT * FROM get_client_orders($1)', [data], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting client orders');
				return console.error('error getting client orders', err);
			}
			socket.emit('get_client_orders_data', res.rows);
		});
	});
	
	socket.on('get_client_balance', function(data) {
		client.query('SELECT * FROM get_client_balance($1)', [data], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: getting client balance');
				return console.error('error getting client balance', err);
			}
			socket.emit('get_client_balance_data', res.rows);
		});
	});
	
	socket.on('mark_client_paid', function(data) {
		client.query('SELECT mark_client_paid($1)', [data], function(err, res) {
			if(err){
				socket.emit('error', 'ERROR: marking client paid');
				return console.error('error marking client paid', err);
			}
			socket.broadcast.emit('unpaid_clients_heartbeat', {});
			socket.broadcast.emit('get_table_heartbeat', {});
		});
	});

});
