--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

--
-- Name: add_order(integer, integer, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION add_order(table_no integer, seat_no integer, menu_item character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE receipt integer := (SELECT receipt_id FROM Receipts WHERE table_number = table_no AND billed = false); 
BEGIN 
INSERT INTO Orders(receipt_id, seat_number, menu_id) VALUES (receipt, seat_no, menu_item); 
UPDATE Receipts SET total = total + (SELECT price FROM Menu_items WHERE menu_id = menu_item) WHERE receipt_id = receipt;  
END; $$;


ALTER FUNCTION public.add_order(table_no integer, seat_no integer, menu_item character varying) OWNER TO postgres;

--
-- Name: FUNCTION add_order(table_no integer, seat_no integer, menu_item character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION add_order(table_no integer, seat_no integer, menu_item character varying) IS 'Adds the orders to the receipt and update the total price';


--
-- Name: delete_order(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION delete_order(order_no integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE receipt integer := (SELECT receipt_id FROM Orders WHERE order_id = order_no);
BEGIN
UPDATE Receipts SET total = total - (SELECT price FROM Menu_items M, Orders O WHERE O.order_id = order_no AND O.menu_id = M.menu_id) WHERE receipt_id = receipt;
DELETE FROM Orders WHERE order_id = order_no;
END; $$;


ALTER FUNCTION public.delete_order(order_no integer) OWNER TO postgres;

--
-- Name: FUNCTION delete_order(order_no integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION delete_order(order_no integer) IS 'Allows to delete a bad or mistaken order';


--
-- Name: get_menu(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION get_menu() RETURNS TABLE(id character varying, menu_item character varying, item_price money)
    LANGUAGE plpgsql
    AS $$
BEGIN
RETURN QUERY SELECT menu_id, name, price FROM Menu_items;
END; $$;


ALTER FUNCTION public.get_menu() OWNER TO postgres;

--
-- Name: FUNCTION get_menu(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION get_menu() IS 'Grabs the entire menu';


--
-- Name: get_orders(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION get_orders(table_no integer) RETURNS TABLE(order_no integer, seat_no integer, menu_item character varying, item_price money, paid_flag boolean)
    LANGUAGE plpgsql
    AS $$ 
BEGIN 
	RETURN QUERY SELECT order_id, seat_number, name, price, paid FROM Orders O, Receipts R, Menu_items M WHERE O.receipt_id = R.receipt_id AND M.menu_id = O.menu_id AND R.table_number = table_no AND billed = false; 
END; $$;


ALTER FUNCTION public.get_orders(table_no integer) OWNER TO postgres;

--
-- Name: FUNCTION get_orders(table_no integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION get_orders(table_no integer) IS 'Gets the unbilled orders for a table';


--
-- Name: get_receipt(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION get_receipt(table_no integer) RETURNS TABLE(receipt integer, table_num integer, total_amt money, billed_flag boolean)
    LANGUAGE plpgsql
    AS $$ 
BEGIN 
	RETURN QUERY SELECT receipt_id, table_number, total, billed FROM Receipts WHERE table_number = table_no AND billed = false; 
END; $$;


ALTER FUNCTION public.get_receipt(table_no integer) OWNER TO postgres;

--
-- Name: FUNCTION get_receipt(table_no integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION get_receipt(table_no integer) IS 'Gets the total amount for the table';


--
-- Name: get_subtotal(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION get_subtotal(table_no integer, seat_no integer) RETURNS TABLE(order_no integer, menu_item character varying, item_price money)
    LANGUAGE plpgsql
    AS $$
DECLARE receipt int := (SELECT receipt_id FROM Receipts WHERE table_number = table_no AND billed = false);
DECLARE subtotal money := (SELECT SUM(price) FROM Orders WHERE receipt_id = receipt AND seat_number = seat_no AND paid = false);
BEGIN
	RETURN QUERY SELECT order_id, name, price FROM Orders O, Menu_items M WHERE O.menu_id = M.menu_id AND receipt_id = receipt AND seat_number = seat_no AND paid = false
	UNION SELECT 'XX' AS order_id, 'Subtotal: ' AS name, subtotal AS price;
END; $$;


ALTER FUNCTION public.get_subtotal(table_no integer, seat_no integer) OWNER TO postgres;

--
-- Name: FUNCTION get_subtotal(table_no integer, seat_no integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION get_subtotal(table_no integer, seat_no integer) IS 'Gets the subtotal for one customer';


--
-- Name: get_unfilled_orders(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION get_unfilled_orders() RETURNS TABLE(order_no integer, table_no integer, seat_no integer, menu_item character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
RETURN QUERY SELECT order_id, table_number, seat_number, name FROM Orders O, Receipts R, Menu_items M WHERE O.receipt_id = R.receipt_id AND M.menu_id = O.menu_id AND fulfilled = false ORDER BY order_id ASC;
END; $$;


ALTER FUNCTION public.get_unfilled_orders() OWNER TO postgres;

--
-- Name: FUNCTION get_unfilled_orders(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION get_unfilled_orders() IS 'Gets the unfulfilled orders with table and seats';


--
-- Name: mark_billed(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION mark_billed(table_no integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE receipt int := (SELECT receipt_id FROM Receipts WHERE table_number = table_no AND billed = false);
BEGIN
	UPDATE Receipts SET billed = true WHERE receipt_id = receipt;
	UPDATE Orders SET paid = true WHERE receipt_id = receipt AND paid = false;
END; $$;


ALTER FUNCTION public.mark_billed(table_no integer) OWNER TO postgres;

--
-- Name: FUNCTION mark_billed(table_no integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION mark_billed(table_no integer) IS 'Marks the entire bill and containing orders as paid';


--
-- Name: mark_fulfilled(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION mark_fulfilled(order_no integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
	UPDATE Orders SET fulfilled = true WHERE order_id = order_no;
END; $$;


ALTER FUNCTION public.mark_fulfilled(order_no integer) OWNER TO postgres;

--
-- Name: FUNCTION mark_fulfilled(order_no integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION mark_fulfilled(order_no integer) IS 'Mark the order as fulfilled';


--
-- Name: mark_paid(integer[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION mark_paid(orders integer[]) RETURNS void
    LANGUAGE plpgsql
    AS $$ 
DECLARE receipt int := (SELECT receipt_id FROM Orders WHERE order_id = orders[1]); 
BEGIN 
FOR i IN array_lower(orders, 1) .. array_upper(orders, 1) LOOP 
UPDATE Orders SET paid = true WHERE order_id = orders[i];
UPDATE Receipts SET total = total - (SELECT price FROM Menu_items M, Orders O WHERE O.order_id = orders[i] AND O.menu_id = M.menu_id) WHERE receipt_id = receipt;
END LOOP; 
IF (0 = (SELECT COUNT(*) FROM Orders WHERE receipt_id = receipt AND paid = false)) 
THEN 
UPDATE Receipts SET billed = true WHERE receipt_id = receipt; 
END IF; 
END; $$;


ALTER FUNCTION public.mark_paid(orders integer[]) OWNER TO postgres;

--
-- Name: FUNCTION mark_paid(orders integer[]); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION mark_paid(orders integer[]) IS 'Marks one or more orders as paid. If all orders are paid, mark receipt as billed';


--
-- Name: new_receipt(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION new_receipt(table_no integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
	IF (0 = (
		SELECT COUNT(*) FROM (
			SELECT table_number FROM Receipts WHERE table_number = table_no AND billed = false
			) AS tables)) 
		THEN
			INSERT INTO Receipts(table_number) VALUES (table_no); 
	END IF;
END;
$$;


ALTER FUNCTION public.new_receipt(table_no integer) OWNER TO postgres;

--
-- Name: FUNCTION new_receipt(table_no integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION new_receipt(table_no integer) IS 'When a new table is added for which there is no unbilled receipts, create a new receipt.';


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE menu_items (
    menu_id character varying(3) NOT NULL,
    name character varying(255) NOT NULL,
    price money NOT NULL
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: TABLE menu_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE menu_items IS 'Maid cafe menu. Has an item code, item name and price';


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE orders (
    order_id integer NOT NULL,
    receipt_id integer NOT NULL,
    seat_number integer NOT NULL,
    menu_id character varying(3),
    fulfilled boolean DEFAULT false,
    paid boolean DEFAULT false
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE orders IS 'An order references a receipt and consists of a menu item and a paid flag';


--
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE orders_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.orders_order_id_seq OWNER TO postgres;

--
-- Name: orders_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE orders_order_id_seq OWNED BY orders.order_id;


--
-- Name: orders_receipt_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE orders_receipt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.orders_receipt_id_seq OWNER TO postgres;

--
-- Name: orders_receipt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE orders_receipt_id_seq OWNED BY orders.receipt_id;


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE receipts (
    receipt_id integer NOT NULL,
    table_number integer NOT NULL,
    total money DEFAULT 0.00,
    billed boolean DEFAULT false
);


ALTER TABLE public.receipts OWNER TO postgres;

--
-- Name: TABLE receipts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE receipts IS 'An empty receipt is created for a new tabling (unbilled, total of 0)';


--
-- Name: receipts_receipt_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE receipts_receipt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.receipts_receipt_id_seq OWNER TO postgres;

--
-- Name: receipts_receipt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE receipts_receipt_id_seq OWNED BY receipts.receipt_id;


--
-- Name: order_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY orders ALTER COLUMN order_id SET DEFAULT nextval('orders_order_id_seq'::regclass);


--
-- Name: receipt_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY orders ALTER COLUMN receipt_id SET DEFAULT nextval('orders_receipt_id_seq'::regclass);


--
-- Name: receipt_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY receipts ALTER COLUMN receipt_id SET DEFAULT nextval('receipts_receipt_id_seq'::regclass);


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY menu_items (menu_id, name, price) FROM stdin;
E1	Miso Soup and House Salad	$1.50
E2	Original onigiri	$1.00
E3	Nyankos bite size onigiri	$1.50
M1	BunBun Croquette Sandwich	$5.00
M2	Soba ni iru	$5.00
M3F	Chicken Curry (full)	$8.50
M3H	Chicken Curry (half)	$5.50
M4F	Vegetarian Curry (full)	$8.00
M4H	Vegetarian Curry (half)	$5.00
D1	Sweet-Treat Parfait	$5.00
D2	Ichigo Creme Crepe	$4.00
D3	Banana Choconut Crepe	$4.00
D4	Fruity Combo Crepe	$5.00
B1	Goku Sparkin	$3.00
B2	Bittersweet first lime	$2.00
T1	Green tea	$3.00
T2	Jasmine tea	$3.00
T3	Lychee red tea	$3.00
T4	Earl grey	$3.00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY orders (order_id, receipt_id, seat_number, menu_id, fulfilled, paid) FROM stdin;
16	4	3	M3H	f	f
17	4	3	M4F	f	f
18	4	3	M4H	f	f
19	4	3	D1	f	f
20	4	3	M4F	f	f
45	5	2	B1	f	f
46	5	2	B1	f	f
47	5	2	B1	f	f
48	5	2	B1	f	f
51	2	1	M1	f	f
53	2	1	E3	f	f
7	2	1	E2	t	f
55	2	1	B1	f	f
56	2	1	D3	f	f
57	2	1	M4F	f	f
71	2	1	E1	f	f
72	2	1	M1	f	f
12	4	2	M1	t	f
74	2	1	E1	f	f
75	2	1	M1	f	f
13	4	3	E3	t	f
14	4	3	E2	t	f
\.


--
-- Name: orders_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('orders_order_id_seq', 76, true);


--
-- Name: orders_receipt_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('orders_receipt_id_seq', 1, false);


--
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY receipts (receipt_id, table_number, total, billed) FROM stdin;
3	3	$0.00	f
5	8	$12.00	f
6	2	$0.00	f
4	5	$39.00	f
2	1	$35.50	f
\.


--
-- Name: receipts_receipt_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('receipts_receipt_id_seq', 6, true);


--
-- Name: menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (menu_id);


--
-- Name: orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- Name: receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (receipt_id);


--
-- Name: orders_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY orders
    ADD CONSTRAINT orders_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES menu_items(menu_id);


--
-- Name: orders_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY orders
    ADD CONSTRAINT orders_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id);


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- Name: menu_items; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE menu_items FROM PUBLIC;
REVOKE ALL ON TABLE menu_items FROM postgres;
GRANT ALL ON TABLE menu_items TO postgres;
GRANT ALL ON TABLE menu_items TO fuu;


--
-- Name: orders; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE orders FROM PUBLIC;
REVOKE ALL ON TABLE orders FROM postgres;
GRANT ALL ON TABLE orders TO postgres;
GRANT ALL ON TABLE orders TO fuu;


--
-- Name: orders_order_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE orders_order_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE orders_order_id_seq FROM postgres;
GRANT ALL ON SEQUENCE orders_order_id_seq TO postgres;
GRANT ALL ON SEQUENCE orders_order_id_seq TO fuu;


--
-- Name: receipts; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE receipts FROM PUBLIC;
REVOKE ALL ON TABLE receipts FROM postgres;
GRANT ALL ON TABLE receipts TO postgres;
GRANT ALL ON TABLE receipts TO fuu;


--
-- Name: receipts_receipt_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE receipts_receipt_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE receipts_receipt_id_seq FROM postgres;
GRANT ALL ON SEQUENCE receipts_receipt_id_seq TO postgres;
GRANT ALL ON SEQUENCE receipts_receipt_id_seq TO fuu;


--
-- PostgreSQL database dump complete
--

