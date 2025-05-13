from flask import (
    Flask, render_template, request, jsonify, session, redirect, url_for, flash
)
from werkzeug.security import check_password_hash, generate_password_hash
import psycopg2
import psycopg2.extras # For dictionary cursors
import json # Not explicitly used in this snippet, but often useful
import os
from datetime import datetime, date
import logging
from collections import defaultdict # Not explicitly used, but can be handy
from functools import wraps

app = Flask(__name__)

# !!! IMPORTANT: Set a strong, random secret key for session security !!!
app.secret_key = os.environ.get('FLASK_SECRET_KEY', b'_5#y2L"F4Q8z\n\xec]/' ) 

# --- Database Configuration ---
DB_NAME = os.environ.get('DB_NAME', "coffee_tracker_db")
DB_USER = os.environ.get('DB_USER', "postgres") 
DB_PASSWORD = os.environ.get('DB_PASSWORD', "postgres") 
DB_HOST = os.environ.get('DB_HOST', "localhost")
DB_PORT = os.environ.get('DB_PORT', "5432")

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        return conn
    except psycopg2.Error as e:
        logging.error(f"Error connecting to PostgreSQL database: {e}")
        raise

# Setup basic logging
logging.basicConfig(level=logging.INFO)

# --- Coffee Definitions (Global Defaults) ---
# These are now considered global defaults if a user hasn't set a custom price.
COFFEE_COSTS = {
    "Chiaro": 0.55, "Cosi": 0.49, "Buenos Aires": 0.54, "Vienna": 0.54,
    "Roma": 0.50, "Arpeggio": 0.50, "Livanto": 0.50, "Volluto Decaf": 0.52
}
COFFEE_VOLUMES = { # in ml
    "Chiaro": 40, "Cosi": 40, "Buenos Aires": 90, "Vienna": 90,
    "Roma": 40, "Arpeggio": 40, "Livanto": 40, "Volluto Decaf": 90
}

# --- Authentication Decorator ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

# --- Authentication Routes ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cur.execute("SELECT id, username, password_hash, currency_code, currency_symbol FROM users WHERE username = %s", (username,))
            user_record = cur.fetchone()
            cur.close()

            if user_record and check_password_hash(user_record['password_hash'], password):
                session['user_id'] = user_record['id']
                session['logged_in_user'] = user_record['username']
                # Store currency settings in session for easier access if needed, though fetching per request is safer for updates
                session['currency_code'] = user_record['currency_code']
                session['currency_symbol'] = user_record['currency_symbol']
                flash(f'Welcome back, {user_record["username"]}!', 'success')
                next_url = request.args.get('next')
                logging.info(f"User '{user_record['username']}' logged in successfully.")
                return redirect(next_url or url_for('coffee_tracker_page'))
            else:
                flash('Invalid username or password.', 'danger')
        except psycopg2.Error as e:
            logging.error(f"Database error during login: {e}")
            flash('A database error occurred. Please try again later.', 'danger')
        except Exception as e:
            logging.error(f"Unexpected error during login: {e}")
            flash('An unexpected error occurred. Please try again.', 'danger')
        finally:
            if conn: conn.close()
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if not username or not password or not confirm_password:
            flash('All fields are required.', 'danger'); return render_template('register.html')
        if password != confirm_password:
            flash('Passwords do not match.', 'danger'); return render_template('register.html')
        if len(password) < 6: 
            flash('Password must be at least 6 characters long.', 'danger'); return render_template('register.html')

        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cur.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cur.fetchone():
                flash('Username already exists.', 'warning'); cur.close(); return render_template('register.html')
            
            password_hash = generate_password_hash(password)
            # New users get default currency settings from DB schema or explicitly here
            cur.execute(
                "INSERT INTO users (username, password_hash, currency_code, currency_symbol) VALUES (%s, %s, %s, %s)",
                (username, password_hash, 'EUR', '€') # Explicit defaults
            )
            conn.commit()
            cur.close()
            flash('Registration successful! Please log in.', 'success')
            logging.info(f"New user registered: {username}")
            return redirect(url_for('login'))
        except psycopg2.Error as e:
            if conn: conn.rollback()
            logging.error(f"Database error during registration: {e}")
            flash('A database error occurred.', 'danger')
        except Exception as e:
            logging.error(f"Unexpected error during registration: {e}")
            flash('An unexpected error occurred.', 'danger')
        finally:
            if conn: conn.close()
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear() # Clear all session data
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

# --- Main Application Routes ---
@app.route("/")
@login_required
def index():
    return redirect(url_for('coffee_tracker_page'))

@app.route("/coffee")
@login_required
def coffee_tracker_page():
    return render_template("coffee_tracker.html", username=session.get('logged_in_user'))

# --- API Routes for User Settings ---
@app.route("/api/user/settings", methods=['GET', 'PUT'])
@login_required
def user_settings():
    user_id = session['user_id']
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    if request.method == 'GET':
        cur.execute("SELECT currency_code, currency_symbol FROM users WHERE id = %s", (user_id,))
        settings = cur.fetchone()
        cur.close()
        conn.close()
        if settings:
            return jsonify(dict(settings))
        return jsonify({"error": "Settings not found"}), 404

    if request.method == 'PUT':
        data = request.get_json()
        new_code = data.get('currency_code', '').upper()
        new_symbol = data.get('currency_symbol', '')

        if not new_code or not new_symbol:
            cur.close(); conn.close(); return jsonify({"error": "Currency code and symbol are required"}), 400
        if len(new_code) > 3 or len(new_symbol) > 5: # Basic validation
            cur.close(); conn.close(); return jsonify({"error": "Invalid currency format"}), 400

        cur.execute(
            "UPDATE users SET currency_code = %s, currency_symbol = %s WHERE id = %s RETURNING currency_code, currency_symbol",
            (new_code, new_symbol, user_id)
        )
        updated_settings = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        session['currency_code'] = updated_settings['currency_code'] # Update session
        session['currency_symbol'] = updated_settings['currency_symbol']
        logging.info(f"User {user_id} updated currency to {new_code} ({new_symbol}).")
        return jsonify({"message": "Settings updated successfully", 
                        "currency_code": updated_settings['currency_code'], 
                        "currency_symbol": updated_settings['currency_symbol']})

@app.route("/api/user/coffee_prices", methods=['GET', 'POST'])
@login_required
def user_coffee_prices_route(): # Renamed to avoid conflict with variable name
    user_id = session['user_id']
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    if request.method == 'GET':
        cur.execute("SELECT coffee_type, price FROM user_coffee_prices WHERE user_id = %s", (user_id,))
        prices = {row['coffee_type']: float(row['price']) for row in cur.fetchall()}
        cur.close()
        conn.close()
        return jsonify(prices)

    if request.method == 'POST':
        custom_prices_data = request.get_json() 
        
        # Using UPSERT for PostgreSQL to insert or update
        # This is more efficient than DELETE then INSERT for many rows
        sql_upsert_start = "INSERT INTO user_coffee_prices (user_id, coffee_type, price) VALUES "
        sql_values_list = []
        sql_params = []
        
        for coffee_type, price_str in custom_prices_data.items():
            if coffee_type in COFFEE_COSTS: 
                try:
                    price = float(price_str)
                    if price >= 0: # Allow 0 price, but not negative
                        sql_values_list.append("(%s, %s, %s)")
                        sql_params.extend([user_id, coffee_type, price])
                    # If price is empty or invalid, it implies user wants to revert to default (handled by not inserting)
                except (ValueError, TypeError):
                    logging.warning(f"Invalid price format for {coffee_type} by user {user_id}: {price_str}")
        
        if sql_values_list:
            # Clear only those types that are being updated or newly set. 
            # Or, if a price is sent as empty/null, it means "delete my custom price for this".
            # For simplicity in this example: we'll clear all user's prices and re-insert the valid ones.
            # A more granular approach would be to handle deletions for empty strings.
            cur.execute("DELETE FROM user_coffee_prices WHERE user_id = %s", (user_id,)) # Simple clear and re-add
            
            sql_upsert = sql_upsert_start + ", ".join(sql_values_list)
            # The ON CONFLICT clause is for true UPSERT, but with DELETE first, it's just INSERT.
            # sql_upsert += " ON CONFLICT (user_id, coffee_type) DO UPDATE SET price = EXCLUDED.price;"
            # If not deleting first, the above ON CONFLICT is needed.
            
            cur.execute(sql_upsert, tuple(sql_params))
        else: # If custom_prices_data was empty or all invalid, effectively clear all custom prices
            cur.execute("DELETE FROM user_coffee_prices WHERE user_id = %s", (user_id,))


        conn.commit()
        cur.close()
        conn.close()
        logging.info(f"User {user_id} updated custom coffee prices.")
        return jsonify({"message": "Custom coffee prices updated successfully"})

# --- API Routes for Coffee Tracking ---
@app.route("/api/coffee-types", methods=['GET'])
@login_required 
def get_coffee_types_api(): # Renamed to avoid conflict
    user_id = session['user_id']
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    cur.execute("SELECT currency_code, currency_symbol FROM users WHERE id = %s", (user_id,))
    user_settings = cur.fetchone()
    user_currency_symbol = user_settings['currency_symbol'] if user_settings else session.get('currency_symbol', '€')

    cur.execute("SELECT coffee_type, price FROM user_coffee_prices WHERE user_id = %s", (user_id,))
    user_custom_prices = {row['coffee_type']: float(row['price']) for row in cur.fetchall()}
    
    cur.close()
    conn.close()

    types_list = []
    for name, default_cost in COFFEE_COSTS.items():
        cost = user_custom_prices.get(name, default_cost) 
        types_list.append({
            "name": name, 
            "cost": cost, 
            "volume": COFFEE_VOLUMES.get(name, 0),
            "currency_symbol": user_currency_symbol 
        })
    return jsonify(types_list)

@app.route("/api/coffees/<date_string>", methods=['GET', 'POST', 'DELETE'])
@login_required
def coffees_for_date_api(date_string): # Combined GET, POST, DELETE for day's log
    try:
        entry_date = datetime.strptime(date_string, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    
    user_id = session['user_id']
    conn = get_db_connection() # Keep connection open for the duration of the request if possible

    if request.method == 'GET':
        # ... (existing GET logic from previous version, ensure it uses DictCursor) ...
        coffees_for_date = []
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cur.execute(
                "SELECT id, coffee_type, entry_time, cost FROM coffee_entries "
                "WHERE user_id = %s AND entry_date = %s ORDER BY entry_time",
                (user_id, entry_date)
            )
            rows = cur.fetchall()
            cur.close()
            # Get user's current currency symbol to display with historical costs
            # Note: The 'cost' in DB is already in the user's currency at time of logging.
            # For display consistency, we can fetch the current symbol.
            cur_symbol = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cur_symbol.execute("SELECT currency_symbol FROM users WHERE id = %s", (user_id,))
            user_currency_symbol = cur_symbol.fetchone()['currency_symbol']
            cur_symbol.close()

            for row in rows:
                coffees_for_date.append({
                    "id": row["id"], 
                    "type": row["coffee_type"],
                    "time": row["entry_time"].strftime('%I:%M %p').lstrip('0'), 
                    "cost": float(row["cost"]),
                    "currency_symbol": user_currency_symbol # Add current symbol for display
                })
        except psycopg2.Error as e:
            logging.error(f"DB error fetching coffees for date {date_string} for user {user_id}: {e}")
            return jsonify({"error": "Database error while fetching coffee entries"}), 500
        finally:
            if conn: conn.close()
        return jsonify(coffees_for_date)

    if request.method == 'POST':
        data = request.get_json()
        if not data or 'type' not in data or 'time' not in data:
            conn.close(); return jsonify({"error": "Missing 'type' or 'time' in request."}), 400

        coffee_type = data['type']
        entry_time_str = data['time']
        
        if coffee_type not in COFFEE_COSTS:
            conn.close(); return jsonify({"error": f"Unknown coffee type: {coffee_type}"}), 400

        # Determine the cost for this user and coffee type
        cur_cost = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur_cost.execute("SELECT price FROM user_coffee_prices WHERE user_id = %s AND coffee_type = %s", (user_id, coffee_type))
        user_price_row = cur_cost.fetchone()
        cur_cost.execute("SELECT currency_symbol FROM users WHERE id = %s", (user_id,)) # Get current symbol
        user_currency_symbol = cur_cost.fetchone()['currency_symbol']
        cur_cost.close() 
        # Note: conn is still open from the main function body

        cost_to_log = float(user_price_row['price']) if user_price_row else COFFEE_COSTS[coffee_type]
        
        try:
            entry_time_obj = datetime.strptime(entry_time_str, '%I:%M %p').time()
        except ValueError:
            conn.close(); return jsonify({"error": "Invalid time format. Use HH:MM AM/PM."}), 400

        new_entry_id = None
        try:
            cur_insert = conn.cursor()
            cur_insert.execute(
                "INSERT INTO coffee_entries (user_id, coffee_type, entry_date, entry_time, cost) "
                "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (user_id, coffee_type, entry_date, entry_time_obj, cost_to_log)
            )
            new_entry_id = cur_insert.fetchone()[0]
            conn.commit()
            cur_insert.close()
            logging.info(f"User {user_id} added coffee: {coffee_type} on {date_string} at {entry_time_str}, cost {cost_to_log}{user_currency_symbol}, ID: {new_entry_id}")
            return jsonify({"id": new_entry_id, "type": coffee_type, "time": entry_time_str, "cost": cost_to_log, "currency_symbol": user_currency_symbol}), 201
        except psycopg2.Error as e:
            if conn: conn.rollback()
            logging.error(f"DB error adding coffee for user {user_id}: {e}")
            return jsonify({"error": "Database error while adding coffee"}), 500
        finally:
            if conn: conn.close()
            
    if request.method == 'DELETE': # This is for clearing the whole day
        # ... (existing DELETE logic from previous version) ...
        try:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM coffee_entries WHERE user_id = %s AND entry_date = %s",
                (user_id, entry_date)
            )
            conn.commit()
            rows_deleted = cur.rowcount
            cur.close()
            logging.info(f"User {user_id} cleared {rows_deleted} coffees for date {date_string}.")
            return jsonify({"message": f"Coffees for {date_string} cleared successfully.", "deleted_count": rows_deleted}), 200
        except psycopg2.Error as e:
            if conn: conn.rollback()
            logging.error(f"DB error clearing coffees for user {user_id}: {e}")
            return jsonify({"error": "Database error while clearing coffees"}), 500
        finally:
            if conn: conn.close()


@app.route("/api/coffee_entry/<int:entry_id>", methods=['DELETE'])
@login_required
def delete_coffee_entry_api(entry_id): # Renamed
    user_id = session['user_id']
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM coffee_entries WHERE id = %s AND user_id = %s",
            (entry_id, user_id)
        )
        conn.commit()
        rows_deleted = cur.rowcount
        cur.close()
        if rows_deleted == 0:
            return jsonify({"error": "Entry not found or not authorized to delete."}), 404
        logging.info(f"User {user_id} deleted coffee entry ID {entry_id}.")
        return jsonify({"message": f"Coffee entry {entry_id} deleted successfully.", "deleted_id": entry_id}), 200
    except psycopg2.Error as e:
        if conn: conn.rollback()
        logging.error(f"DB error deleting coffee entry ID {entry_id} for user {user_id}: {e}")
        return jsonify({"error": "Database error while deleting coffee entry"}), 500
    finally:
        if conn: conn.close()

# --- Report Routes ---
def get_user_currency_symbol(user_id, db_conn):
    """Helper to get user's currency symbol."""
    cur = db_conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT currency_symbol FROM users WHERE id = %s", (user_id,))
    settings = cur.fetchone()
    cur.close()
    return settings['currency_symbol'] if settings else session.get('currency_symbol', '€')


@app.route("/api/reports/monthly", methods=['GET'])
@login_required 
def get_monthly_report():
    user_id = session.get('user_id')
    try:
        year = int(request.args.get('year'))
        month = int(request.args.get('month'))
    except (TypeError, ValueError): return jsonify({"error": "Year/month required as integers."}), 400
    if not (1 <= month <= 12 and 2000 <= year <= date.today().year + 10): # Allow more future years
        return jsonify({"error": "Invalid year or month."}), 400
    
    type_filter = request.args.get('type', 'All')
    if type_filter != 'All' and type_filter not in COFFEE_COSTS:
        return jsonify({"error": f"Invalid coffee type: {type_filter}"}), 400

    conn = None
    try:
        conn = get_db_connection()
        user_currency_symbol = get_user_currency_symbol(user_id, conn)
        
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        sql_query = """
            SELECT coffee_type, COUNT(*) as count, SUM(cost) as total_cost
            FROM coffee_entries
            WHERE user_id = %s AND EXTRACT(YEAR FROM entry_date) = %s AND EXTRACT(MONTH FROM entry_date) = %s
        """
        params = [user_id, year, month]
        if type_filter != 'All':
            sql_query += " AND coffee_type = %s"
            params.append(type_filter)
        sql_query += " GROUP BY coffee_type ORDER BY coffee_type;"
        cur.execute(sql_query, tuple(params))
        rows = cur.fetchall()
        cur.close()
        
        overall_total_coffees = 0; overall_total_cost = 0.0; breakdown = {}
        if type_filter == 'All':
            for row in rows:
                breakdown[row['coffee_type']] = {"count": row['count'], "cost": float(row['total_cost'])}
                overall_total_coffees += row['count']
                overall_total_cost += float(row['total_cost'])
        elif rows: 
            row = rows[0]
            overall_total_coffees = row['count']
            overall_total_cost = float(row['total_cost'])
        
        report = {"year": year, "month": month, "coffee_type_filter": type_filter,
                  "total_coffees": overall_total_coffees, "total_cost": round(overall_total_cost, 2),
                  "breakdown_by_type": breakdown if type_filter == 'All' else {},
                  "currency_symbol": user_currency_symbol}
        return jsonify(report)
    except psycopg2.Error as e:
        logging.error(f"DB error generating monthly report for user {user_id}: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn: conn.close()

@app.route("/api/reports/yearly", methods=['GET'])
@login_required 
def get_yearly_report():
    user_id = session.get('user_id')
    try: year = int(request.args.get('year'))
    except (TypeError, ValueError): return jsonify({"error": "Year required as integer."}), 400
    if not (2000 <= year <= date.today().year + 10): return jsonify({"error": "Invalid year."}), 400
    
    type_filter = request.args.get('type', 'All')
    if type_filter != 'All' and type_filter not in COFFEE_COSTS:
        return jsonify({"error": f"Invalid coffee type: {type_filter}"}), 400

    conn = None
    try:
        conn = get_db_connection()
        user_currency_symbol = get_user_currency_symbol(user_id, conn)

        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        sql_query = """
            SELECT coffee_type, COUNT(*) as count, SUM(cost) as total_cost
            FROM coffee_entries
            WHERE user_id = %s AND EXTRACT(YEAR FROM entry_date) = %s
        """
        params = [user_id, year]
        if type_filter != 'All':
            sql_query += " AND coffee_type = %s"
            params.append(type_filter)
        sql_query += " GROUP BY coffee_type ORDER BY coffee_type;"
        cur.execute(sql_query, tuple(params))
        rows = cur.fetchall()
        cur.close()

        overall_total_coffees = 0; overall_total_cost = 0.0; breakdown = {}
        if type_filter == 'All':
            for row in rows:
                breakdown[row['coffee_type']] = {"count": row['count'], "cost": float(row['total_cost'])}
                overall_total_coffees += row['count']
                overall_total_cost += float(row['total_cost'])
        elif rows: 
            row = rows[0]
            overall_total_coffees = row['count']
            overall_total_cost = float(row['total_cost'])
        
        report = {"year": year, "coffee_type_filter": type_filter,
                  "total_coffees": overall_total_coffees, "total_cost": round(overall_total_cost, 2),
                  "breakdown_by_type": breakdown if type_filter == 'All' else {},
                  "currency_symbol": user_currency_symbol}
        return jsonify(report)
    except psycopg2.Error as e:
        logging.error(f"DB error generating yearly report for user {user_id}: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn: conn.close()

@app.route("/api/fun-facts/yearly-volume", methods=['GET'])
@login_required 
def get_yearly_volume():
    user_id = session.get('user_id')
    try: year = int(request.args.get('year'))
    except (TypeError, ValueError): return jsonify({"error": "Year required as integer."}), 400
    if not (2000 <= year <= date.today().year + 10): return jsonify({"error": "Invalid year."}), 400
    
    total_volume_ml = 0
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            "SELECT coffee_type, COUNT(*) as count FROM coffee_entries "
            "WHERE user_id = %s AND EXTRACT(YEAR FROM entry_date) = %s "
            "GROUP BY coffee_type",
            (user_id, year)
        )
        rows = cur.fetchall()
        cur.close()
        for row in rows:
            if row['coffee_type'] in COFFEE_VOLUMES: 
                total_volume_ml += COFFEE_VOLUMES[row['coffee_type']] * row['count']
        return jsonify({"year": year, "total_volume_ml": total_volume_ml})
    except psycopg2.Error as e:
        logging.error(f"DB error getting yearly volume for user {user_id}: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
